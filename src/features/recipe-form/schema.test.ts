import { expect, test } from "vitest";
import {
  buildOwnedSection,
  emptyRecipeFormValues,
  recipeFormSchema,
  ReferenceSectionValues,
  SectionValues,
} from "./schema";

const referenceSection: ReferenceSectionValues = {
  kind: "reference",
  clientId: "ref-1",
  id: "42",
  name: "Pesto",
  ofRecipeName: "Nonna's Pasta",
};

function parse(sections: SectionValues[]) {
  return recipeFormSchema.safeParse({
    ...emptyRecipeFormValues(),
    name: "Tomato Soup",
    sections,
  });
}

test("an owned section requires a title", () => {
  const result = parse([buildOwnedSection()]);

  expect(result.success).toBe(false);
  expect(result.error!.issues[0].message).toBe("A section title is required.");
});

test("a reference section does not require a title", () => {
  // Nothing about a reference section is editable, so the rule that guards
  // the owned variant must not reach it. The discriminated union is what
  // makes that fall out of the model rather than an imperative check.
  expect(parse([referenceSection]).success).toBe(true);
});

test("error paths are dotted and positional, so they address the right section", () => {
  const named = { ...buildOwnedSection(), name: "Dressing" };

  const result = parse([referenceSection, named, buildOwnedSection()]);

  expect(result.success).toBe(false);
  expect(result.error!.issues.map((i) => i.path.join("."))).toEqual([
    "sections.2.name",
  ]);
});
