"use client";

import { EditIcon } from "@/components/icons";
import type { FragmentType } from "@apollo/client";
import { useFragment, useMutation } from "@apollo/client/react";
import { Button, TextArea, TextField } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import {
  type CookNotesFragment,
  CookNotesFragmentDoc,
} from "./__generated__/cookNotes.generated";
import { SetCookNotesDocument } from "./__generated__/setCookNotes.generated";

type CookNotesProps = {
  record: FragmentType<CookNotesFragment>;
  recipeId: string;
  /** Whether the viewer may change the notes. */
  editable: boolean;
};

/** I show a cook's notes, and let their owner edit them. */
export function CookNotes({ record, recipeId, editable }: CookNotesProps) {
  const { data, complete } = useFragment({
    fragment: CookNotesFragmentDoc,
    fragmentName: "cookNotes",
    from: record,
  });
  const [save, { loading }] = useMutation(SetCookNotesDocument);
  /** The notes being edited, or null when not editing. */
  const [draft, setDraft] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const editRef = useRef<HTMLButtonElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const wasEditing = useRef(false);
  const editing = draft !== null;

  useEffect(() => {
    if (editing) draftRef.current?.focus();
    else if (wasEditing.current) editRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  if (!complete) return null;
  const { id, notes } = data;

  async function commit(text: string) {
    setFailed(false);
    try {
      const result = await save({ variables: { recipeId, id, notes: text } });
      if (!result.data?.library.history?.setNotes)
        throw new Error("No saved notes returned.");
      setDraft(null);
    } catch {
      setFailed(true);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-xs">
        <TextField
          aria-label="Notes"
          value={draft}
          onChange={setDraft}
          isDisabled={loading}
        >
          <TextArea
            ref={draftRef}
            rows={3}
            className="field-sizing-content min-h-16 w-full px-sm py-xs"
          />
        </TextField>
        {failed ? (
          <p role="alert" className="text-danger text-sm">
            Couldn’t save the notes
          </p>
        ) : null}
        <div className="flex gap-xs">
          <Button size="sm" isDisabled={loading} onPress={() => commit(draft)}>
            Save
          </Button>
          <Button
            size="sm"
            variant="tertiary"
            isDisabled={loading}
            onPress={() => setDraft(null)}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-xs">
      {notes ? <p className="whitespace-pre-wrap">{notes}</p> : null}
      {editable ? (
        <Button
          ref={editRef}
          isIconOnly
          size="sm"
          variant="tertiary"
          aria-label="Edit notes"
          onPress={() => {
            setFailed(false);
            setDraft(notes ?? "");
          }}
        >
          <EditIcon size="small" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}
