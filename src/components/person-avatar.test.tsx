import { render, screen } from "@/test";
import { describe, expect, it } from "vitest";
import { PersonAvatar } from "./person-avatar";

const BRENNA = {
  name: "Brenna Switzer",
  email: "brenna@example.com",
  imageUrl: null,
};

describe("PersonAvatar", () => {
  it("shows its person's initials, titled with their name", () => {
    render(<PersonAvatar {...BRENNA} />);

    expect(screen.getByTitle(BRENNA.name)).toHaveTextContent("BS");
  });

  it("is titled with its person's email when they have no name", () => {
    render(<PersonAvatar {...BRENNA} name={null} />);

    expect(screen.getByTitle(BRENNA.email)).toHaveTextContent("b");
  });
});
