"use client";

import { LogoutIcon } from "@/components/icons";
import { doLogout } from "@/constants";
import { usePlanSync } from "@/features/plan-sync";
import { AlertDialog, Button } from "@heroui/react";
import { useState } from "react";

const ACCESS_TOKEN_KEY = "accessToken";

function logOut() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  doLogout();
}

/**
 * I log the user out, forgetting any access token this browser kept. If
 * changes haven't reached the server yet, I warn first: they stay on this
 * device, and are sent once the same user signs in again.
 */
export function LogOutButton() {
  const sync = usePlanSync();
  const [unsent, setUnsent] = useState(0);

  async function press() {
    sync.flush();
    const count = await sync.unsent();
    if (count > 0) setUnsent(count);
    else logOut();
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
