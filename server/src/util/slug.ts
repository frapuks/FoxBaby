// Normalisation identique au front et au seed : minuscules, sans accents,
// caractères non alphanumériques -> tirets. Sert à retrouver le préfixe de slug.
export const slugify = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
