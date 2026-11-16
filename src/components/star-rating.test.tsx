import { render, screen, userEvent } from "@/test";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { MAX_RATING, StarRating } from "./star-rating";

const LABEL = "Rating";

function Rater({
  initial,
  onChange,
}: {
  initial: number | null;
  onChange: (value: number) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <StarRating
      aria-label={LABEL}
      value={value}
      onChange={(rating) => {
        setValue(rating);
        onChange(rating);
      }}
    />
  );
}

function star(n: number) {
  return screen.getByRole("radio", { name: n === 1 ? "1 star" : `${n} stars` });
}

function litStars() {
  return screen
    .getAllByRole("radio")
    .map((radio) => radio.closest("[data-lit]")?.getAttribute("data-lit"));
}

const lit = (count: number) =>
  Array.from({ length: MAX_RATING }, (_, i) => String(i < count));

describe("StarRating", () => {
  it("offers one choice per star, under its name", () => {
    render(<StarRating aria-label={LABEL} value={null} />);
    expect(screen.getByRole("radiogroup", { name: LABEL })).toBeVisible();
    expect(screen.getAllByRole("radio")).toHaveLength(MAX_RATING);
    for (let n = 1; n <= MAX_RATING; n++) expect(star(n)).not.toBeChecked();
  });

  it("checks the chosen star and lights it and every star before it", () => {
    render(<StarRating aria-label={LABEL} value={4} />);
    expect(star(4)).toBeChecked();
    expect(litStars()).toEqual(lit(4));
  });

  it("lights nothing when unrated", () => {
    render(<StarRating aria-label={LABEL} value={null} />);
    expect(litStars()).toEqual(lit(0));
  });

  it("chooses a rating by pointer", async () => {
    const onChange = vi.fn();
    render(<Rater initial={null} onChange={onChange} />);
    await userEvent.click(star(3));
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(star(3)).toBeChecked();
    expect(litStars()).toEqual(lit(3));
  });

  it("changes a rating by keyboard", async () => {
    const onChange = vi.fn();
    render(<Rater initial={2} onChange={onChange} />);
    await userEvent.tab();
    expect(star(2)).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(star(3)).toBeChecked();
  });

  it("can't be cleared by choosing the current rating again", async () => {
    const onChange = vi.fn();
    render(<Rater initial={4} onChange={onChange} />);
    await userEvent.click(star(4));
    expect(onChange).not.toHaveBeenCalled();
    expect(star(4)).toBeChecked();
  });

  it("previews the stars up to the hovered one", async () => {
    render(<Rater initial={1} onChange={vi.fn()} />);
    await userEvent.hover(star(3));
    expect(litStars()).toEqual(lit(3));
    await userEvent.unhover(star(3));
    expect(litStars()).toEqual(lit(1));
  });

  it("neither previews nor changes when read-only", async () => {
    const onChange = vi.fn();
    render(
      <StarRating
        aria-label={LABEL}
        value={2}
        onChange={onChange}
        isReadOnly
      />,
    );
    await userEvent.hover(star(5));
    expect(litStars()).toEqual(lit(2));
    await userEvent.click(star(5));
    expect(onChange).not.toHaveBeenCalled();
    expect(star(2)).toBeChecked();
  });

  it("disables every star when disabled", async () => {
    const onChange = vi.fn();
    render(
      <StarRating
        aria-label={LABEL}
        value={2}
        onChange={onChange}
        isDisabled
      />,
    );
    for (const radio of screen.getAllByRole("radio"))
      expect(radio).toBeDisabled();
    await userEvent.click(star(5));
    expect(onChange).not.toHaveBeenCalled();
  });
});
