import { ROLE_DEVELOPER, ROLE_USER } from "@/lib/roles";
import { buildInMemoryCache, render, screen } from "@/test";
import type { Unmasked } from "@apollo/client/masking";
import { describe, expect, it, vi } from "vitest";
import {
  ProfileDocument,
  type ProfileQuery,
} from "./__generated__/profile.generated";
import { Profile, ProfileLoading } from "./profile";

vi.mock("next-client-cookies", () => ({
  useCookies: () => ({ get: () => undefined }),
}));

const API_ROOT = "https://api.example.com";

function profileCache(roles: string[]) {
  const cache = buildInMemoryCache();
  const data: Unmasked<ProfileQuery> = {
    deviceKey: "barneys-phone",
    profile: {
      __typename: "ProfileQuery",
      me: {
        __typename: "User",
        id: "8777749727401",
        roles,
        devices: [
          {
            __typename: "UserDevice",
            id: "12",
            name: "Barney’s Phone",
            key: "barneys-phone",
            lastEnsuredAt: "2026-11-08T20:55:00.000Z",
          },
        ],
      },
    },
  };
  cache.writeQuery({ query: ProfileDocument, data });
  return cache;
}

describe("Profile", () => {
  it("lists the user's devices", () => {
    render(<Profile apiRoot={API_ROOT} />, {
      cache: profileCache([ROLE_USER]),
    });

    expect(
      screen.getByRole("rowheader", { name: "Barney’s Phone" }),
    ).toBeVisible();
  });

  it("offers dev mode to developers", () => {
    render(<Profile apiRoot={API_ROOT} />, {
      cache: profileCache([ROLE_USER, ROLE_DEVELOPER]),
    });

    expect(screen.getByRole("switch", { name: "Dev Mode" })).toBeVisible();
  });

  it("doesn't offer dev mode to anyone else", () => {
    render(<Profile apiRoot={API_ROOT} />, {
      cache: profileCache([ROLE_USER]),
    });

    expect(screen.queryByRole("switch", { name: "Dev Mode" })).toBeNull();
  });
});

describe("ProfileLoading", () => {
  it("offers log out while the profile loads", () => {
    render(<ProfileLoading />);

    expect(
      screen.getByRole("status", { name: "Loading profile" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Log Out" })).toBeVisible();
  });
});
