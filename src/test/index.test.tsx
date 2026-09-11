import { UserAvatar } from "@/features/user-avatar";
import { UserAvatarFragmentDoc } from "@/features/user-avatar/__generated__/userAvatar.generated";
import { buildInMemoryCache, render, screen, seedFragment } from "@/test";
import { describe, expect, it } from "vitest";

const ADA = {
  __typename: "User" as const,
  name: "Ada Lovelace",
  email: "ada@example.com",
  imageUrl: null,
};

describe("seedFragment", () => {
  it("says what to do when a fragment can't be identified", () => {
    const cache = buildInMemoryCache();

    expect(() =>
      seedFragment(cache, UserAvatarFragmentDoc, "userAvatar", ADA),
    ).toThrowError(/doesn't select "id"/);
  });

  it("renders real content, where an unseeded fragment renders empty", () => {
    const cache = buildInMemoryCache();
    const ada = seedFragment(cache, UserAvatarFragmentDoc, "userAvatar", ADA, {
      id: "User:1",
    });

    render(<UserAvatar user={ada} />, { cache });

    expect(screen.getByTitle("Ada Lovelace")).toBeVisible();
  });
});
