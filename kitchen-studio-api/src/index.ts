type Env = {
  DB: D1Database;
  ASSETS: R2Bucket;
  MANAGER_PASSWORD_HASH: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  ALLOWED_ORIGINS: string;
};

type Material = {
  id: string;
  category: string;
  name: string;
  note: string;
  swatch: string;
  layer_url: string;
  edge_layer_url: string | null;
  enabled: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
};

const categories = new Set([
  "cabinetry",
  "island",
  "countertops",
  "backsplash",
  "flooring",
  "walls",
]);
const layerTypes = new Set(["image/png", "image/webp"]);
const sessionLifetime = 12 * 60 * 60 * 1000;
const loginWindow = 15 * 60 * 1000;
const maxLoginFailures = 5;
const photoRetention = 90 * 24 * 60 * 60 * 1000;

function cors(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin");
  const allowed = new Set(env.ALLOWED_ORIGINS.split(",").map((value) => value.trim()));
  return origin && allowed.has(origin)
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        Vary: "Origin",
      }
    : {};
}

function json(request: Request, env: Env, body: unknown, status = 200) {
  return Response.json(body, { status, headers: cors(request, env) });
}

function bytesToBase64Url(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64ToBytes(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function passwordMatches(password: string, encoded: string) {
  const [iterationsValue, saltValue, expectedValue] = encoded.split(":");
  const iterations = Number(iterationsValue);
  if (!iterations || !saltValue || !expectedValue) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: base64ToBytes(saltValue), iterations, hash: "SHA-256" },
    key,
    256,
  ));
  const expected = base64ToBytes(expectedValue);
  if (derived.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < derived.length; index += 1) difference |= derived[index] ^ expected[index];
  return difference === 0;
}

async function requireManager(request: Request, env: Env) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const tokenHash = await sha256(token);
  const session = await env.DB.prepare(
    "SELECT expires_at FROM manager_sessions WHERE token_hash = ? AND expires_at > ?",
  ).bind(tokenHash, Date.now()).first<{ expires_at: number }>();
  return Boolean(session);
}

async function publicSubmissionAllowed(
  request: Request,
  env: Env,
  action: "email" | "kitchen",
  limit: number,
  windowMs: number,
) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  const row = await env.DB.prepare(
    "SELECT window_started_at, attempts FROM public_submission_limits WHERE ip = ? AND action = ?",
  ).bind(ip, action).first<{ window_started_at: number; attempts: number }>();
  if (!row || now - row.window_started_at >= windowMs) {
    await env.DB.prepare(
      "INSERT OR REPLACE INTO public_submission_limits (ip, action, window_started_at, attempts) VALUES (?, ?, ?, 1)",
    ).bind(ip, action, now).run();
    return true;
  }
  if (row.attempts >= limit) return false;
  await env.DB.prepare(
    "UPDATE public_submission_limits SET attempts = attempts + 1 WHERE ip = ? AND action = ?",
  ).bind(ip, action).run();
  return true;
}

async function readJson(request: Request) {
  try {
    return await request.json<Record<string, unknown>>();
  } catch {
    return null;
  }
}

function validMaterial(body: Record<string, unknown>, requireCategory = true) {
  const category = typeof body.category === "string" ? body.category : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const swatch = typeof body.swatch === "string" ? body.swatch : "";
  const layerUrl = typeof body.layer_url === "string" ? body.layer_url.trim() : "";
  const edgeLayerUrl = typeof body.edge_layer_url === "string" ? body.edge_layer_url.trim() : null;
  if (
    (requireCategory && !categories.has(category)) ||
    !name || name.length > 60 || note.length > 100 ||
    !/^#[0-9a-f]{6}$/i.test(swatch) || !layerUrl || layerUrl.length > 500 ||
    (edgeLayerUrl && edgeLayerUrl.length > 500)
  ) return null;
  return { category, name, note, swatch, layer_url: layerUrl, edge_layer_url: edgeLayerUrl };
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || "material";
}

async function listMaterials(request: Request, env: Env, includeDisabled = false) {
  const query = includeDisabled
    ? "SELECT * FROM materials ORDER BY category, sort_order, created_at"
    : "SELECT * FROM materials WHERE enabled = 1 ORDER BY category, sort_order, created_at";
  const { results } = await env.DB.prepare(query).all<Material>();
  return json(request, env, { materials: results });
}

async function login(request: Request, env: Env) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  const attempt = await env.DB.prepare(
    "SELECT window_started_at, failures FROM manager_login_attempts WHERE ip = ?",
  ).bind(ip).first<{ window_started_at: number; failures: number }>();
  if (attempt && now - attempt.window_started_at < loginWindow && attempt.failures >= maxLoginFailures) {
    return json(request, env, { error: "Too many sign-in attempts. Try again in 15 minutes." }, 429);
  }

  const body = await readJson(request);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password || !(await passwordMatches(password, env.MANAGER_PASSWORD_HASH))) {
    if (!attempt || now - attempt.window_started_at >= loginWindow) {
      await env.DB.prepare(
        "INSERT OR REPLACE INTO manager_login_attempts (ip, window_started_at, failures) VALUES (?, ?, 1)",
      ).bind(ip, now).run();
    } else {
      await env.DB.prepare("UPDATE manager_login_attempts SET failures = failures + 1 WHERE ip = ?")
        .bind(ip).run();
    }
    return json(request, env, { error: "The management password is incorrect." }, 401);
  }

  await env.DB.prepare("DELETE FROM manager_login_attempts WHERE ip = ?").bind(ip).run();
  await env.DB.prepare("DELETE FROM manager_sessions WHERE expires_at <= ?").bind(now).run();
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.prepare(
    "INSERT INTO manager_sessions (token_hash, expires_at, created_at) VALUES (?, ?, ?)",
  ).bind(await sha256(token), now + sessionLifetime, now).run();
  return json(request, env, { token, expires_at: now + sessionLifetime });
}

async function uploadAsset(request: Request, env: Env) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !layerTypes.has(file.type) || !file.size || file.size > 12_000_000) {
    return json(request, env, { error: "Choose a PNG or WebP render layer under 12 MB." }, 400);
  }
  const extension = file.type === "image/png" ? "png" : "webp";
  const key = `materials/${crypto.randomUUID()}.${extension}`;
  await env.ASSETS.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  return json(request, env, { url: `${new URL(request.url).origin}/api/material-assets/${key}` }, 201);
}

async function createMaterial(request: Request, env: Env) {
  const body = await readJson(request);
  const material = body && validMaterial(body);
  if (!material) return json(request, env, { error: "Enter a valid name, color, and render layer." }, 400);
  const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM materials WHERE category = ?")
    .bind(material.category).first<{ total: number }>();
  if ((count?.total || 0) >= 10) {
    return json(request, env, { error: "This category already has the maximum of 10 materials." }, 409);
  }
  const order = await env.DB.prepare("SELECT COALESCE(MAX(sort_order), 0) + 10 AS next FROM materials WHERE category = ?")
    .bind(material.category).first<{ next: number }>();
  const id = `${slug(material.name)}-${crypto.randomUUID().slice(0, 6)}`;
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO materials (id, category, name, note, swatch, layer_url, edge_layer_url, enabled, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
  ).bind(
    id, material.category, material.name, material.note, material.swatch,
    material.layer_url, material.edge_layer_url, order?.next || 10, now, now,
  ).run();
  return json(request, env, { id }, 201);
}

async function updateMaterial(request: Request, env: Env, id: string) {
  const existing = await env.DB.prepare("SELECT * FROM materials WHERE id = ?")
    .bind(id).first<Material>();
  if (!existing) return json(request, env, { error: "Material not found." }, 404);
  const body = await readJson(request);
  if (!body) return json(request, env, { error: "Invalid request." }, 400);
  const merged = validMaterial({ ...existing, ...body }, false);
  if (!merged) return json(request, env, { error: "Enter a valid name, color, and render layer." }, 400);
  const enabled = body.enabled === undefined ? existing.enabled : Number(body.enabled === 1 || body.enabled === true);
  const sortOrder = body.sort_order === undefined ? existing.sort_order : Number(body.sort_order);
  if (!Number.isFinite(sortOrder)) return json(request, env, { error: "Invalid material order." }, 400);
  if (existing.enabled && !enabled) {
    const enabledCount = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM materials WHERE category = ? AND enabled = 1",
    ).bind(existing.category).first<{ total: number }>();
    if ((enabledCount?.total || 0) <= 1) {
      return json(request, env, { error: "Keep at least one enabled material in every category." }, 409);
    }
  }
  await env.DB.prepare(
    `UPDATE materials SET name = ?, note = ?, swatch = ?, layer_url = ?, edge_layer_url = ?, enabled = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
  ).bind(
    merged.name, merged.note, merged.swatch, merged.layer_url, merged.edge_layer_url,
    enabled, sortOrder, Date.now(), id,
  ).run();
  return json(request, env, { updated: true });
}

async function removeMaterial(request: Request, env: Env, id: string) {
  const material = await env.DB.prepare("SELECT * FROM materials WHERE id = ?")
    .bind(id).first<Material>();
  if (!material) return json(request, env, { error: "Material not found." }, 404);
  const enabledCount = await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM materials WHERE category = ? AND enabled = 1",
  ).bind(material.category).first<{ total: number }>();
  if (material.enabled && (enabledCount?.total || 0) <= 1) {
    return json(request, env, { error: "Keep at least one enabled material in every category." }, 409);
  }
  await env.DB.prepare("DELETE FROM materials WHERE id = ?").bind(id).run();
  return json(request, env, { deleted: true });
}

async function reorderMaterials(request: Request, env: Env) {
  const body = await readJson(request);
  const id = typeof body?.id === "string" ? body.id : "";
  const neighborId = typeof body?.neighbor_id === "string" ? body.neighbor_id : "";
  if (!id || !neighborId || id === neighborId) {
    return json(request, env, { error: "Choose two materials to reorder." }, 400);
  }
  const [material, neighbor] = await Promise.all([
    env.DB.prepare("SELECT category, sort_order FROM materials WHERE id = ?").bind(id).first<Material>(),
    env.DB.prepare("SELECT category, sort_order FROM materials WHERE id = ?").bind(neighborId).first<Material>(),
  ]);
  if (!material || !neighbor || material.category !== neighbor.category) {
    return json(request, env, { error: "Materials must be in the same category." }, 400);
  }
  const temporaryOrder = -Date.now();
  await env.DB.batch([
    env.DB.prepare("UPDATE materials SET sort_order = ?, updated_at = ? WHERE id = ?")
      .bind(temporaryOrder, Date.now(), id),
    env.DB.prepare("UPDATE materials SET sort_order = ?, updated_at = ? WHERE id = ?")
      .bind(material.sort_order, Date.now(), neighborId),
    env.DB.prepare("UPDATE materials SET sort_order = ?, updated_at = ? WHERE id = ?")
      .bind(neighbor.sort_order, Date.now(), id),
  ]);
  return json(request, env, { reordered: true });
}

async function saveDesign(request: Request, env: Env) {
  const body = await readJson(request);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const finishes = Array.isArray(body?.finishes) ? body.finishes : [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || name.length > 80 || finishes.length !== 6) {
    return json(request, env, { error: "Enter a valid email, design name, and six finishes." }, 400);
  }
  if (!(await publicSubmissionAllowed(request, env, "email", 5, 60 * 60 * 1000))) {
    return json(request, env, { error: "Too many email requests. Try again later." }, 429);
  }
  if (!env.RESEND_API_KEY) return json(request, env, { error: "Email delivery is not configured." }, 503);
  const lines = finishes.map((finish) => {
    const item = finish as Record<string, unknown>;
    return `${String(item.label || "Finish").slice(0, 40)}: ${String(item.name || "").slice(0, 60)}`;
  });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL || "Kitchen Studio <onboarding@resend.dev>",
      to: [email],
      subject: `${name} — your saved Kitchen Studio palette`,
      text: [`Your kitchen design “${name}” is saved.`, "", ...lines, "", "Return to Ridgewood Kitchen Studio on this device to continue designing."].join("\n"),
    }),
  });
  if (!response.ok) return json(request, env, { error: "The email could not be sent." }, 502);
  return json(request, env, { sent: true });
}

async function submitKitchen(request: Request, env: Env) {
  const form = await request.formData();
  const photo = form.get("photo");
  if (!(photo instanceof File) || !/^image\/(jpeg|png|heic|heif)$/.test(photo.type) || !photo.size || photo.size > 15_000_000) {
    return json(request, env, { error: "Choose a JPG, PNG, HEIC, or HEIF photo under 15 MB." }, 400);
  }
  if (!(await publicSubmissionAllowed(request, env, "kitchen", 3, 24 * 60 * 60 * 1000))) {
    return json(request, env, { error: "The daily kitchen-photo limit has been reached. Try again tomorrow." }, 429);
  }
  const id = crypto.randomUUID();
  const key = `kitchens/${id}`;
  await env.ASSETS.put(key, photo.stream(), { httpMetadata: { contentType: photo.type } });
  await env.DB.prepare(
    "INSERT INTO kitchen_submissions (id, object_key, status, created_at) VALUES (?, ?, 'received', ?)",
  ).bind(id, key, Date.now()).run();
  return json(request, env, { jobId: id, status: "received" }, 202);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request, env) });
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "GET" && path === "/api/materials") return listMaterials(request, env);
    if (request.method === "POST" && path === "/api/manager/login") return login(request, env);
    if (request.method === "GET" && path.startsWith("/api/material-assets/")) {
      const key = path.slice("/api/material-assets/".length);
      if (!key.startsWith("materials/")) return json(request, env, { error: "Asset not found." }, 404);
      const object = await env.ASSETS.get(key);
      if (!object) return json(request, env, { error: "Asset not found." }, 404);
      return new Response(object.body, {
        headers: {
          ...cors(request, env),
          "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
    if (request.method === "POST" && path === "/api/save-design") return saveDesign(request, env);
    if (request.method === "POST" && path === "/api/kitchens") return submitKitchen(request, env);

    if (path.startsWith("/api/manager/") && !(await requireManager(request, env))) {
      return json(request, env, { error: "Your management session has expired. Sign in again." }, 401);
    }
    if (request.method === "GET" && path === "/api/manager/materials") return listMaterials(request, env, true);
    if (request.method === "POST" && path === "/api/manager/assets") return uploadAsset(request, env);
    if (request.method === "POST" && path === "/api/manager/materials") return createMaterial(request, env);
    if (request.method === "POST" && path === "/api/manager/materials/reorder") return reorderMaterials(request, env);
    const match = path.match(/^\/api\/manager\/materials\/([^/]+)$/);
    if (match && request.method === "PATCH") return updateMaterial(request, env, decodeURIComponent(match[1]));
    if (match && request.method === "DELETE") return removeMaterial(request, env, decodeURIComponent(match[1]));

    return json(request, env, { error: "Not found." }, 404);
  },
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    const cutoff = Date.now() - photoRetention;
    const { results } = await env.DB.prepare(
      "SELECT object_key FROM kitchen_submissions WHERE created_at < ?",
    ).bind(cutoff).all<{ object_key: string }>();
    if (results.length) await env.ASSETS.delete(results.map(({ object_key }) => object_key));
    await env.DB.prepare("DELETE FROM kitchen_submissions WHERE created_at < ?").bind(cutoff).run();
    await env.DB.prepare("DELETE FROM manager_sessions WHERE expires_at <= ?").bind(Date.now()).run();
  },
};
