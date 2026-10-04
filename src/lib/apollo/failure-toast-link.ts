import { ErrorLink } from "@apollo/client/link/error";
import { isMutationOperation } from "@apollo/client/utilities";
import { toast } from "@heroui/react";

const ABORT_ERROR = "AbortError";

export const FAILURE_TOAST_TITLE = "Couldn’t save your change";

/**
 * I toast a generic failure for every mutation that fails, unless its
 * context says `failureToast: false`. An aborted request isn't a failure.
 */
export const failureToastLink = new ErrorLink(({ error, operation }) => {
  if (!isMutationOperation(operation.query)) return;
  if (operation.getContext().failureToast === false) return;
  if (error.name === ABORT_ERROR) return;
  toast.danger(FAILURE_TOAST_TITLE, {
    description: "Please try again.",
  });
});
