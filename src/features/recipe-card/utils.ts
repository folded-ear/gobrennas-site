export function formatLastCooked(dateStr: string): string {
  const diffDays = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 14) return `${diffDays} days ago`;
  return new Date(dateStr).toLocaleDateString();
}
