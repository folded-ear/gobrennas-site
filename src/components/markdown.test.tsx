import { render, screen } from "@/test";
import { describe, expect, it } from "vitest";
import { Markdown } from "./markdown";

const IMPORTED = "do a thing.\n\ndo another thing, but\nthis one is complex.";

const DIFF_LINES =
  "@@ -1,2 +1,2 @@\n-1 cup sugar\n+2 cups sugar\n pinch of salt\n";
const DIFF = "Less sweet:\n\n```diff\n" + DIFF_LINES + "```";

describe("Markdown", () => {
  it("separates paragraphs at blank lines, and only there", () => {
    render(<Markdown text={IMPORTED} />);

    const paragraphs = screen.getAllByRole("paragraph");
    expect(paragraphs.map((p) => p.textContent)).toEqual([
      "do a thing.",
      "do another thing, but\nthis one is complex.",
    ]);
    expect(paragraphs[1].querySelector("br")).toBeNull();
  });

  it("shows raw HTML as the text it is", () => {
    const { container } = render(<Markdown text="Stir in <b>butter</b>." />);

    expect(screen.getByRole("paragraph")).toHaveTextContent(
      "Stir in <b>butter</b>.",
    );
    expect(container.querySelector("b")).toBeNull();
  });

  it("leaves tildes as written", () => {
    render(<Markdown text="Add ~1 tsp, then simmer ~5 min." />);

    expect(screen.getByRole("paragraph")).toHaveTextContent(
      "Add ~1 tsp, then simmer ~5 min.",
    );
    expect(screen.queryByRole("deletion")).toBeNull();
  });

  it("shows a fenced diff preformatted, its lines intact", () => {
    render(<Markdown text={DIFF} />);

    const code = screen.getByRole("code");
    expect(code.textContent).toBe(DIFF_LINES);
    expect(code.closest("pre")).not.toBeNull();
  });

  it("renders nothing for blank text", () => {
    render(
      <section aria-label="Notes">
        <Markdown text={" \n\n "} />
        <Markdown text={null} />
      </section>,
    );

    expect(screen.getByRole("region", { name: "Notes" })).toBeEmptyDOMElement();
  });
});
