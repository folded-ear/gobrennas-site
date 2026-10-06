import { screen, userEvent, waitFor } from "@/test";

/** More than any test's drop targets, so a missing one fails, not hangs. */
const MAX_TABS = 50;

/**
 * I pick an item up by its handle from the keyboard, returning once the
 * drag has taken focus to its first target and is ready for Tab and Enter.
 */
export async function keyboardDrag(handleName: string): Promise<void> {
  const handle = screen.getByRole("button", { name: handleName });
  handle.focus();
  await userEvent.keyboard("{Enter}");
  await waitFor(() => {
    if (document.activeElement === handle) {
      throw new Error(`The drag from "${handleName}" never took focus`);
    }
  });
}

/** I Tab to the drop zone with this label and drop there. */
export async function keyboardDrop(zoneLabel: string): Promise<void> {
  const zone = screen.getByRole("button", { name: zoneLabel });
  for (let i = 0; i < MAX_TABS && document.activeElement !== zone; i++) {
    await userEvent.keyboard("{Tab}");
  }
  if (document.activeElement !== zone) {
    throw new Error(`Tab never reached the "${zoneLabel}" zone`);
  }
  await userEvent.keyboard("{Enter}");
}

/**
 * I call off the drag under way. A drag outlives its test unless it's
 * dropped or called off, since react-aria keeps it at module level.
 */
export async function keyboardCancel(): Promise<void> {
  await userEvent.keyboard("{Escape}");
}
