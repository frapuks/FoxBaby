import { api } from "../api";
import type { Gender } from "../constants/names";

export type NameDoc = { id: string; name: string; gender: Gender };
export type GenderFilter = "both" | Gender;
export type NamePage = { names: NameDoc[]; done: boolean };

// Recherche de prénoms par préfixe (via le backend).
export const searchNames = async (term: string, max = 8): Promise<NameDoc[]> => {
  const q = term.trim();
  if (!q) return [];
  const { names } = await api.get<{ names: NameDoc[] }>(
    `/names/search?q=${encodeURIComponent(q)}&max=${max}`,
  );
  return names;
};

// Pager aléatoire et paginé sur la collection "names". Conserve l'interface
// `next(): Promise<{ names, done }>` de l'ancienne version ; l'état de pagination
// (curseur opaque seed+branche+position) est désormais géré côté serveur.
export const createNamePager = (genderFilter: GenderFilter, pageSize = 30) => {
  let cursor: string | null = null;
  let done = false;

  const next = async (): Promise<NamePage> => {
    if (done) return { names: [], done: true };
    const params = new URLSearchParams({ gender: genderFilter, limit: String(pageSize) });
    if (cursor) params.set("cursor", cursor);
    const page = await api.get<{ names: NameDoc[]; nextCursor: string | null }>(
      `/names?${params.toString()}`,
    );
    cursor = page.nextCursor;
    done = page.nextCursor === null;
    return { names: page.names, done };
  };

  return { next };
};
