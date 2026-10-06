import { Chip } from "@heroui/react";

/** I mark an ingredient line that calls for none of something. */
export function NoChip() {
  return (
    <Chip size="sm" variant="primary" color="danger">
      NO
    </Chip>
  );
}
