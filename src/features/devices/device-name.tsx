"use client";

import { CancelIcon, RenameIcon, SaveIcon } from "@/components/icons";
import { useMutation } from "@apollo/client/react";
import { Button, Input, TextField } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import { RenameDeviceDocument } from "./__generated__/renameDevice.generated";

type DeviceNameProps = {
  id: string;
  name: string;
};

const ESCAPE = "Escape";

const fallbackName = (id: string) => `Device ${id}`;

/**
 * I show a device's name with a button to rename it in place. A blank
 * name saves as one made from the device's id.
 */
export function DeviceName({ id, name }: DeviceNameProps) {
  const [rename, { loading: pending }] = useMutation(RenameDeviceDocument);
  const [draft, setDraft] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const renameButton = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);
  const editing = draft !== null;

  useEffect(() => {
    if (editing || !refocus.current) return;
    refocus.current = false;
    renameButton.current?.focus();
  }, [editing]);

  function stop() {
    refocus.current = true;
    setFailed(false);
    setDraft(null);
  }

  async function save(text: string) {
    const next = text.trim() || fallbackName(id);
    if (next === name) {
      stop();
      return;
    }
    setFailed(false);
    try {
      await rename({ variables: { id, name: next } });
      stop();
    } catch {
      setFailed(true);
    }
  }

  if (!editing) {
    return (
      <span className="flex items-center gap-xs">
        {name}
        <Button
          ref={renameButton}
          aria-label={`Rename ${name}`}
          isIconOnly
          size="sm"
          variant="ghost"
          onPress={() => setDraft(name)}
        >
          <RenameIcon size="small" aria-hidden />
        </Button>
      </span>
    );
  }

  return (
    <form
      aria-busy={pending}
      className="flex flex-col gap-xs"
      onSubmit={(event) => {
        event.preventDefault();
        if (!pending) void save(draft);
      }}
    >
      <div className="flex items-center gap-xs">
        <TextField
          aria-label="Device name"
          value={draft}
          onChange={(text) => {
            setDraft(text);
            setFailed(false);
          }}
          // Disabling would drop focus, stranding it if the save fails.
          isReadOnly={pending}
          onKeyDown={(event) => {
            if (event.key === ESCAPE && !pending) stop();
          }}
        >
          <Input className="px-sm py-xs" autoFocus />
        </TextField>
        <Button
          type="submit"
          aria-label="Save"
          isIconOnly
          size="sm"
          variant="ghost"
          isPending={pending}
        >
          <SaveIcon size="small" aria-hidden />
        </Button>
        <Button
          aria-label="Cancel"
          isIconOnly
          size="sm"
          variant="ghost"
          isDisabled={pending}
          onPress={stop}
        >
          <CancelIcon size="small" aria-hidden />
        </Button>
      </div>
      {failed ? (
        <p role="alert" className="text-sm text-danger">
          Could not rename the device. Try again.
        </p>
      ) : null}
    </form>
  );
}
