import { buildInMemoryCache, render, screen, seedFragment } from "@/test";
import { describe, expect, it } from "vitest";
import { CurrentUserAvatarFragmentDoc } from "./__generated__/currentUserAvatar.generated";
import { CurrentUserAvatar } from "./index";

describe("CurrentUserAvatar", () => {
  it("shows the signed-in user", () => {
    const cache = buildInMemoryCache();
    seedFragment(
      cache,
      CurrentUserAvatarFragmentDoc,
      "currentUserAvatar",
      {
        profile: {
          __typename: "ProfileQuery",
          me: {
            __typename: "User",
            id: "8777749727401",
            name: "Brenna Boisvert",
            email: "brenna@example.com",
            imageUrl: null,
          },
        },
      },
      { id: "ROOT_QUERY" },
    );

    render(<CurrentUserAvatar />, { cache });

    expect(screen.getByTitle("Brenna Boisvert")).toHaveTextContent("BB");
  });
});
