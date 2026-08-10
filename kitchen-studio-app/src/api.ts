export const API_BASE =
  import.meta.env.VITE_KITCHEN_STUDIO_API ||
  "https://ridgewood-kitchen-studio-api.the-boto-bot.workers.dev/api";

export const CATEGORIES = [
  "cabinetry",
  "island",
  "countertops",
  "backsplash",
  "flooring",
  "walls",
] as const;

export type CategoryId = (typeof CATEGORIES)[number];

export type Material = {
  id: string;
  category: CategoryId;
  name: string;
  note: string;
  swatch: string;
  layer_url: string;
  edge_layer_url: string | null;
  enabled: number;
  sort_order: number;
};

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Request failed (${response.status}).`);
  }
  return body as T;
}
