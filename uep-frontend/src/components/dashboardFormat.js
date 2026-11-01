// Formats partagés par les blocs du tableau de bord.
const compactFormat = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });
const percentFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** 1 250 000 -> "1,3 M" ; null -> "—". */
export function compact(value) {
  if (value === null || value === undefined) return '—';
  return compactFormat.format(Number(value));
}

/** 42.4 -> "42 %" ; null -> "—". */
export function percent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${percentFormat.format(Number(value))} %`;
}

export function plural(n, word, pluralWord = `${word}s`) {
  return n > 1 ? pluralWord : word;
}

/** Nombre de jours écoulés depuis une date ISO. */
export function joursDepuis(isoDate) {
  if (!isoDate) return null;
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}
