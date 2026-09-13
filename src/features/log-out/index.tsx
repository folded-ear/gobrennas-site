"use client";

import { LogoutIcon } from "@/components/icons";
import { doLogout } from "@/constants";
import { Button } from "@heroui/react";

const ACCESS_TOKEN_KEY = "accessToken";

/** I log the user out, forgetting any access token this browser kept. */
export function LogOutButton() {
  return (
    <Button
      variant="secondary"
      onPress={() => {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        doLogout();
      }}
    >
      <LogoutIcon size="small" aria-hidden />
      Log Out
    </Button>
  );
}
