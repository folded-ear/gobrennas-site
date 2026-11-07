/** A person as far as naming them needs to know. */
export type NamedPerson = {
  readonly name: string | null;
  readonly email: string;
};

/** I name a person: their name, or their email when they have none. */
export function displayName(person: NamedPerson): string {
  return person.name ?? person.email;
}
