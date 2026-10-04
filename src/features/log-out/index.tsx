"use client";

import { LogoutIcon } from "@/components/icons";
import { doLogout } from "@/constants";
import { usePageEngine } from "@/features/page-engine";
import { AlertDialog, Button } from "@heroui/react";
import { useState } from "react";

const ACCESS_TOKEN_KEY = "accessToken";

/**
 * I log the user out, forgetting any access token this browser kept, and
 * what the device keeps of the user's shopping. If changes haven't reached
 * the server yet, I warn first: they stay on this device, and are sent
 * once the same user signs in again.
 */
export function LogOutButton() {
  const engine = usePageEngine();
  const [unsent, setUnsent] = useState(0);

  async function logOut() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    await engine.forgetDevice();
    doLogout();
  }

  async function press() {
    engine.flush();
    const count = await engine.unsent();
    if (count > 0) setUnsent(count);
    else await logOut();
  }

  const one = unsent === 1;
  return (
    <>
      <Button variant="secondary" onPress={press}>
        <LogoutIcon size="small" aria-hidden />
        Log Out
      </Button>
      <AlertDialog.Backdrop
        isOpen={unsent > 0}
        onOpenChange={(open) => {
          if (!open) setUnsent(0);
        }}
      >
        <AlertDialog.Container size="sm">
          <AlertDialog.Dialog>
            {({ close }) => (
              <>
                <AlertDialog.Header>
                  <AlertDialog.Heading>
                    Log out with unsaved changes?
                  </AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>
                    {one
                      ? "1 change hasn’t been saved yet. It stays"
                      : `${unsent} changes haven’t been saved yet. They stay`}{" "}
                    on this device and {one ? "is" : "are"} sent when you sign
                    back in. Another account won’t send {one ? "it" : "them"}.
                  </p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button variant="tertiary" onPress={close}>
                    Cancel
                  </Button>
                  <Button variant="danger" onPress={logOut}>
                    Log out anyway
                  </Button>
                </AlertDialog.Footer>
              </>
            )}
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
