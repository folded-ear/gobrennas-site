/** What an item with a blank name is called. */
export const UNNAMED = "Unnamed";

/** I tell whether a name has nothing but whitespace in it. */
export function isBlankName(name: string): boolean {
  return name.trim() === "";
}

/** I give a name to show or say, calling a blank one Unnamed. */
export function displayName(name: string): string {
  return isBlankName(name) ? UNNAMED : name;
}
