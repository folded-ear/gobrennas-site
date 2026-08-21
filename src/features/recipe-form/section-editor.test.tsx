import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import {
  buildOwnedSection,
  emptyRecipeFormValues,
  SectionValues,
} from "./schema";
import { SectionEditor } from "./section-editor";
import { useRecipeDraft } from "./use-recipe-draft";

function Harness({ section }: { section: SectionValues }) {
  const draft = useRecipeDraft({
    onSave: vi.fn(),
    initialValues: () => ({ ...emptyRecipeFormValues(), sections: [section] }),
  });
  return <SectionEditor draft={draft} index={0} />;
}

test("a reference section renders read-only", () => {
  // There is no UI to add one of these yet, but the model and rendering are
  // in place — only the library-search entry point is deferred.
  render(
    <Harness
      section={{
        kind: "reference",
        clientId: "ref-1",
        id: "42",
        name: "Pesto",
        ofRecipeName: "Nonna's Pasta",
      }}
    />,
  );

  expect(screen.getByText("Pesto")).toBeInTheDocument();
  expect(screen.getByText("of Nonna's Pasta")).toBeInTheDocument();
  expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  expect(
    screen.getByRole("button", { name: "Remove section 1" }),
  ).toBeInTheDocument();
});

test("an owned section renders editable fields", () => {
  render(<Harness section={{ ...buildOwnedSection(), name: "Dressing" }} />);

  expect(screen.getByLabelText("Section 1 title")).toHaveValue("Dressing");
  expect(screen.getByLabelText("Section 1 ingredient 1")).toBeInTheDocument();
  expect(screen.getByLabelText("Section 1 directions")).toBeInTheDocument();
});
