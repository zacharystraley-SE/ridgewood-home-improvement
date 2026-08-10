import { FormEvent, StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { api, CATEGORIES, type CategoryId, type Material } from "./api";
import "./styles.css";

const labels: Record<CategoryId, string> = {
  cabinetry: "Cabinetry",
  island: "Island",
  countertops: "Countertops",
  backsplash: "Backsplash",
  flooring: "Flooring",
  walls: "Walls",
};

const tokenKey = "kitchen-studio-manager-session";

function auth(token: string, init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  };
}

async function validateLayer(file: File) {
  if (!/^image\/(png|webp)$/.test(file.type)) {
    throw new Error("Render layers must be transparent PNG or WebP files.");
  }
  const image = await createImageBitmap(file);
  const valid = image.width === 1536 && image.height === 1024;
  image.close();
  if (!valid) throw new Error("Render layers must be exactly 1536 × 1024 pixels.");
}

function ManagerApp() {
  const [token, setToken] = useState(() => sessionStorage.getItem(tokenKey) || "");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [category, setCategory] = useState<CategoryId>("cabinetry");
  const [editing, setEditing] = useState<Material | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = useMemo(
    () => materials.filter((material) => material.category === category),
    [category, materials],
  );

  async function load(activeToken = token) {
    const result = await api<{ materials: Material[] }>(
      "/manager/materials",
      auth(activeToken),
    );
    setMaterials(result.materials);
  }

  useEffect(() => {
    if (!token) return;
    load().catch(() => {
      sessionStorage.removeItem(tokenKey);
      setToken("");
    });
  }, [token]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") || "");
    setBusy(true);
    setError("");
    try {
      const result = await api<{ token: string }>("/manager/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      sessionStorage.setItem(tokenKey, result.token);
      setToken(result.token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadLayer(file: File) {
    await validateLayer(file);
    const form = new FormData();
    form.set("file", file);
    const result = await api<{ url: string }>("/manager/assets", auth(token, {
      method: "POST",
      body: form,
    }));
    return result.url;
  }

  async function saveMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const layer = form.get("layer");
    const edge = form.get("edge");
    setBusy(true);
    setError("");
    try {
      const layerUrl = layer instanceof File && layer.size
        ? await uploadLayer(layer)
        : editing?.layer_url;
      if (!layerUrl) throw new Error("Choose the aligned render layer for this material.");
      const edgeLayerUrl = edge instanceof File && edge.size
        ? await uploadLayer(edge)
        : editing?.edge_layer_url || null;
      const payload = {
        category,
        name: String(form.get("name") || "").trim(),
        note: String(form.get("note") || "").trim(),
        swatch: String(form.get("swatch") || "#778da9"),
        layer_url: layerUrl,
        edge_layer_url: category === "flooring" ? edgeLayerUrl : null,
      };
      await api(
        editing ? `/manager/materials/${editing.id}` : "/manager/materials",
        auth(token, {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );
      setEditing(null);
      event.currentTarget.reset();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The material could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function patchMaterial(material: Material, changes: Partial<Material>) {
    setBusy(true);
    setError("");
    try {
      await api(`/manager/materials/${material.id}`, auth(token, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      }));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The change could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function move(material: Material, direction: -1 | 1) {
    const index = current.findIndex((item) => item.id === material.id);
    const neighbor = current[index + direction];
    if (!neighbor) return;
    setBusy(true);
    setError("");
    try {
      await api("/manager/materials/reorder", auth(token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: material.id, neighbor_id: neighbor.id }),
      }));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The material could not be moved.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(material: Material) {
    if (!confirm(`Remove ${material.name} from Kitchen Studio?`)) return;
    setBusy(true);
    setError("");
    try {
      await api(`/manager/materials/${material.id}`, auth(token, { method: "DELETE" }));
      if (editing?.id === material.id) setEditing(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The material could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <main className="manager-login-shell">
        <a className="manager-back" href="./">Return to Kitchen Studio</a>
        <section className="manager-login" aria-labelledby="login-title">
          <span className="brand-mark">K</span>
          <h1 id="login-title">Studio management</h1>
          <p>Sign in to maintain Ridgewood’s customer-facing kitchen finishes.</p>
          <form onSubmit={login}>
            <label>
              Management password
              <input name="password" type="password" autoComplete="current-password" required autoFocus />
            </label>
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          {error && <p className="form-error" role="alert">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="manager-shell">
      <header className="manager-header">
        <a className="brand" href="./"><span className="brand-mark">K</span><span>Kitchen Studio</span></a>
        <div>
          <a className="quiet-button manager-view-link" href="./">View customer studio</a>
          <button className="quiet-button" onClick={() => {
            sessionStorage.removeItem(tokenKey);
            setToken("");
          }}>Sign out</button>
        </div>
      </header>

      <section className="manager-intro">
        <div>
          <h1>Material inventory</h1>
          <p>Each category can hold up to 10 finishes. Disabled finishes remain in inventory but disappear from the customer studio.</p>
        </div>
        <strong>{materials.length} total finishes</strong>
      </section>

      <nav className="manager-categories" aria-label="Material categories">
        {CATEGORIES.map((id) => (
          <button key={id} className={category === id ? "active" : ""} onClick={() => { setCategory(id); setEditing(null); }}>
            <span>{labels[id]}</span>
            <small>{materials.filter((material) => material.category === id).length}/10</small>
          </button>
        ))}
      </nav>

      {error && <p className="manager-error" role="alert">{error}</p>}

      <div className="manager-workspace">
        <section className="inventory-list" aria-labelledby="inventory-title">
          <div className="manager-section-heading">
            <h2 id="inventory-title">{labels[category]}</h2>
            <span>{current.length} of 10 materials</span>
          </div>
          {current.length ? current.map((material, index) => (
            <article className={`inventory-row ${material.enabled ? "" : "disabled"}`} key={material.id}>
              <span className="inventory-swatch" style={{ background: material.swatch }} />
              <div className="inventory-copy">
                <strong>{material.name}</strong>
                <small>{material.note || "No description"}</small>
              </div>
              <div className="inventory-actions">
                <button disabled={busy || index === 0} onClick={() => move(material, -1)}>Move up</button>
                <button disabled={busy || index === current.length - 1} onClick={() => move(material, 1)}>Move down</button>
                <button onClick={() => setEditing(material)}>Edit</button>
                <button onClick={() => patchMaterial(material, { enabled: material.enabled ? 0 : 1 })}>
                  {material.enabled ? "Disable" : "Enable"}
                </button>
                <button className="danger" onClick={() => remove(material)}>Remove</button>
              </div>
            </article>
          )) : <p className="manager-empty">No materials in this category yet.</p>}
        </section>

        <section className="material-editor" aria-labelledby="editor-title">
          <div className="manager-section-heading">
            <h2 id="editor-title">{editing ? `Edit ${editing.name}` : "Add a material"}</h2>
            {editing && <button className="text-button" onClick={() => setEditing(null)}>Cancel edit</button>}
          </div>
          <form key={editing?.id || category} onSubmit={saveMaterial}>
            <label>
              Material name
              <input name="name" defaultValue={editing?.name || ""} maxLength={60} required />
            </label>
            <label>
              Short description
              <input name="note" defaultValue={editing?.note || ""} maxLength={100} placeholder="Finish, pattern, or product detail" />
            </label>
            <label>
              Swatch color
              <input name="swatch" type="color" defaultValue={editing?.swatch || "#778da9"} required />
            </label>
            <label>
              Aligned render layer {editing && <small>Leave empty to keep the current layer.</small>}
              <input name="layer" type="file" accept="image/png,image/webp" required={!editing} />
            </label>
            {category === "flooring" && (
              <label>
                Floor-edge layer <small>Optional; fills the threshold and cabinet-edge strips.</small>
                <input name="edge" type="file" accept="image/png,image/webp" />
              </label>
            )}
            <p className="asset-guidance">Render layers must be transparent PNG or WebP files at exactly 1536 × 1024 pixels and aligned to the studio photograph.</p>
            <button className="primary-button" type="submit" disabled={busy || (!editing && current.length >= 10)}>
              {busy ? "Saving…" : editing ? "Save changes" : current.length >= 10 ? "Category is full" : "Add material"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><ManagerApp /></StrictMode>);
