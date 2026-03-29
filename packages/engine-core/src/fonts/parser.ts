const GENERIC_FAMILIES = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
  'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded',
]);

export function parseFontFamilies(value: string): string[] {
  if (!value.trim()) return [];

  return value
    .split(',')
    .map((part) => part.trim().replace(/^['"]|['"]$/g, '').trim())
    .filter((name) => name.length > 0 && !GENERIC_FAMILIES.has(name.toLowerCase()));
}

export function slugifyFamily(family: string): string {
  return family.toLowerCase().replace(/\s+/g, '-');
}
