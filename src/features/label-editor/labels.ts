/** Match the API's slash replacement before comparing or saving labels. */
export function normalizeLabel(value: string): string {
  return value.trim().replace(/\/+/g, "-");
}

export function labelKey(value: string): string {
  return normalizeLabel(value).toLowerCase();
}

export function normalizeLabels(values: readonly string[]): string[] {
  const labels = new Map<string, string>();
  for (const value of values) {
    const name = normalizeLabel(value);
    const key = labelKey(name);
    if (name && !labels.has(key)) labels.set(key, name);
  }
  return [...labels.values()];
}
