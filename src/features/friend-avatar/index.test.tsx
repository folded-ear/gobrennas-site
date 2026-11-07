import { buildInMemoryCache, render, screen, seedFragment } from "@/test";
import { describe, expect, it } from "vitest";
import {
  FriendAvatarFragmentDoc,
  type FriendAvatarFragment,
} from "./__generated__/friendAvatar.generated";
import { FriendAvatar } from "./index";

const NAME = "Pat Example";

const PAT: FriendAvatarFragment = {
  __typename: "Friend",
  name: NAME,
  email: "pat@example.com",
  imageUrl: null,
};

describe("FriendAvatar", () => {
  it("shows its friend's initials, titled with their name", () => {
    const cache = buildInMemoryCache();
    const pat = seedFragment(
      cache,
      FriendAvatarFragmentDoc,
      "friendAvatar",
      PAT,
      { id: "Friend:7" },
    );

    render(<FriendAvatar friend={pat} />, { cache });

    expect(screen.getByTitle(NAME)).toHaveTextContent("PE");
  });
});
