"use client";

import { PlanItemStatus } from "@/__generated__/graphql";
import { usePageEngine } from "@/features/page-engine";
import { newDraftId } from "@/features/page-engine/ids";
import { PlanTree } from "@/features/plan-dnd/moves";
import { isBlankName } from "@/lib/plan-item-name";
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Draft,
  dropDraft,
  followCreated,
  ItemKey,
  keyId,
  keyString,
  sameKey,
  settleDraft,
  siblingBefore,
} from "./drafts";
import { Direction } from "./keymap";
import { neighborOf } from "./neighbors";

/** Where the caret starts in an editor. */
export type Caret = "start" | "end";

/** The item in edit mode, and where its caret starts. */
export type Editing = {
  readonly key: ItemKey;
  readonly caret: Caret;
};

/** An existing item, as its edit is saved. */
export type EditedItem = {
  readonly id: string;
  readonly planId: string;
  readonly name: string;
  readonly hasChildren: boolean;
  /** Called when the edit deletes the item. */
  readonly onRemoved?: () => void;
};

/** What a row tells its surface about the item it shows. */
export type RowEntry = {
  readonly editable: boolean;
  /** What an edit starts from, and ends with when nothing is typed. */
  readonly initialText: string;
  /** Saves the row's edit, however it ended. */
  readonly commit: (text: string) => void;
};

/** What a new item made beside another carries. */
export type SplitPlace = {
  readonly planId: string;
  /** Assigned once created; left out, the item only inherits one. */
  readonly bucketId?: string | null;
  /** On a surface of flat lists, the list it's made in. */
  readonly group?: string;
};

/** A surface's own state, kept by whoever renders its rows. */
export type EditState = {
  readonly editing: Editing | null;
  readonly setEditing: Dispatch<SetStateAction<Editing | null>>;
  readonly drafts: readonly Draft[];
  readonly setDrafts: Dispatch<SetStateAction<readonly Draft[]>>;
};

/** What rows ask of the surface they're edited on. */
export type EditSurface = {
  readonly drafts: readonly Draft[];
  isEditing(key: ItemKey): boolean;
  readonly caret: Caret;
  /** The text an editor resumes with, or null when nothing's been typed. */
  resumeText(): string | null;
  setText(text: string): void;
  start(key: ItemKey, caret?: Caret): void;
  end(key: ItemKey): void;
  cancel(key: ItemKey): void;
  split(from: ItemKey, atStart: boolean, place: SplitPlace): void;
  addFirstChild(parentId: string, planId: string): void;
  remove(key: ItemKey, direction: Direction): void;
  register(key: ItemKey, entry: RowEntry): void;
  commitItem(item: EditedItem, text: string): void;
  commitDraft(draft: Draft, text: string): void;
  /** Whether a row's name should take focus, once it's out of edit mode. */
  wantsFocus(key: ItemKey): boolean;
  focused(key: ItemKey): void;
};

const EditSurfaceContext = createContext<EditSurface | null>(null);

/** I keep a surface's state: the item in edit mode, and new items. */
export function useEditState(): EditState {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [drafts, setDrafts] = useState<readonly Draft[]>([]);
  return { editing, setEditing, drafts, setDrafts };
}

type EditSurfaceProviderProps = PropsWithChildren<{
  readonly state: EditState;
  /** Every editable row's key, as shown, top to bottom. */
  readonly order: readonly ItemKey[];
  readonly tree: PlanTree;
  /** Whether a created item shows where its draft did. */
  readonly createdStayPut: boolean;
}>;

/**
 * I let the rows inside me be edited one at a time: whichever edit is
 * running ends, and saves, before another starts, when its row stops
 * being shown, and when I go away.
 */
export function EditSurfaceProvider({
  state,
  order,
  tree,
  createdStayPut,
  children,
}: EditSurfaceProviderProps) {
  const { editing, setEditing, drafts, setDrafts } = state;
  const engine = usePageEngine();
  const rows = useRef(new Map<string, RowEntry>());
  const text = useRef<string | null>(null);
  const [focusKey, setFocusKey] = useState<ItemKey | null>(null);

  /** I end whatever edit is running, saving it unless told not to. */
  function endCurrent(save: boolean) {
    if (editing === null) return;
    const entry = rows.current.get(keyString(editing.key));
    const typed = text.current;
    text.current = null;
    setEditing(null);
    if (save && entry !== undefined) entry.commit(typed ?? entry.initialText);
  }

  function start(key: ItemKey, caret: Caret = "end") {
    if (editing !== null && sameKey(editing.key, key)) return;
    endCurrent(true);
    setEditing({ key, caret });
  }

  function editableOrder() {
    return order.filter(
      (key) => rows.current.get(keyString(key))?.editable ?? true,
    );
  }

  function parentOf(key: ItemKey): string | undefined {
    return "id" in key
      ? tree.parentOf.get(key.id)
      : drafts.find((it) => it.draftId === key.draftId)?.parentId;
  }

  function addDraft(draft: Omit<Draft, "draftId">) {
    const draftId = newDraftId();
    setDrafts((prev) => [...prev, { ...draft, draftId }]);
    start({ draftId });
  }

  const surface: EditSurface = {
    drafts,
    caret: editing?.caret ?? "end",
    isEditing: (key) => editing !== null && sameKey(editing.key, key),
    resumeText: () => text.current,
    setText(typed) {
      text.current = typed;
    },
    start,
    end(key) {
      if (editing !== null && sameKey(editing.key, key)) endCurrent(true);
    },
    cancel(key) {
      if (editing === null || !sameKey(editing.key, key)) return;
      endCurrent(false);
      if ("id" in key) {
        setFocusKey(key);
        return;
      }
      setFocusKey(neighborOf(editableOrder(), key, "backward"));
      setDrafts((prev) => dropDraft(prev, key.draftId));
    },
    split(from, atStart, { planId, bucketId, group }) {
      const parentId = parentOf(from);
      if (parentId === undefined) return;
      addDraft({
        planId,
        parentId,
        afterId: atStart ? siblingBefore(tree, drafts, parentId, from) : from,
        beside: { key: from, side: atStart ? "before" : "after" },
        ...(bucketId === undefined ? {} : { bucketId }),
        ...(group === undefined ? {} : { group }),
      });
    },
    addFirstChild(parentId, planId) {
      addDraft({
        planId,
        parentId,
        afterId: null,
        beside: { firstIn: parentId },
      });
    },
    remove(key, direction) {
      const target = neighborOf(editableOrder(), key, direction);
      if (target === null) {
        endCurrent(true);
      } else {
        start(target, direction === "backward" ? "end" : "start");
      }
    },
    register(key, entry) {
      rows.current.set(keyString(key), entry);
    },
    commitItem({ id, planId, name, hasChildren, onRemoved }, typed) {
      if (typed === name) return;
      if (!isBlankName(typed)) {
        engine.rename({ kind: "rename", id, planId, name: typed });
      } else if (hasChildren) {
        engine.rename({ kind: "rename", id, planId, name: "" });
      } else {
        engine.set([
          { kind: "status", id, planId, name, status: PlanItemStatus.DELETED },
        ]);
        onRemoved?.();
      }
    },
    commitDraft(draft, typed) {
      const { draftId } = draft;
      if (isBlankName(typed)) {
        setDrafts((prev) => dropDraft(prev, draftId));
        return;
      }
      // The item shows at once under its draft id, so its draft row is done.
      setDrafts((prev) => settleDraft(prev, draftId, draftId, createdStayPut));
      void engine
        .create({
          kind: "create",
          id: draftId,
          planId: draft.planId,
          parentId: draft.parentId,
          afterId: draft.afterId === null ? null : keyId(draft.afterId),
          name: typed,
          ...(draft.bucketId === undefined ? {} : { bucketId: draft.bucketId }),
        })
        .then((id) => {
          const shown = { id: draftId };
          setEditing((prev) =>
            prev === null || !sameKey(prev.key, shown)
              ? prev
              : id === null
                ? null
                : { ...prev, key: { id } },
          );
          if (id !== null && createdStayPut) {
            setDrafts((prev) => followCreated(prev, draftId, id));
          }
        });
    },
    wantsFocus: (key) => sameKey(focusKey, key),
    focused(key) {
      if (sameKey(focusKey, key)) setFocusKey(null);
    },
  };

  // An edit whose row stops being shown ends; one for a row yet to show,
  // like an item just created from its draft, waits for it.
  const shown = useRef(order);
  const current = useRef({ editing, endCurrent });
  useLayoutEffect(() => {
    current.current = { editing, endCurrent };
  });
  useLayoutEffect(() => {
    const was = shown.current;
    shown.current = order;
    const { editing: now, endCurrent: end } = current.current;
    if (
      now !== null &&
      was.some((it) => sameKey(it, now.key)) &&
      !order.some((it) => sameKey(it, now.key))
    ) {
      end(true);
    }
  }, [order]);
  useEffect(
    () => () => {
      const { editing: now } = current.current;
      if (now === null) return;
      const entry = rows.current.get(keyString(now.key));
      entry?.commit(text.current ?? entry.initialText);
    },
    [],
  );

  return <EditSurfaceContext value={surface}>{children}</EditSurfaceContext>;
}

const NO_DRAFTS: readonly Draft[] = [];

/** I give the new items on the surface I'm inside, if any. */
export function useEditDrafts(): readonly Draft[] {
  return useContext(EditSurfaceContext)?.drafts ?? NO_DRAFTS;
}

/** I give the surface I'm inside, or null outside any. */
export function useEditSurface(): EditSurface | null {
  return useContext(EditSurfaceContext);
}
