import type { MorselChoice } from "./types";

/** Keep explicit identity through edits outside its text; offsets are UTF-16. */
export function moveChoice(
  before: string,
  after: string,
  choice?: MorselChoice,
): MorselChoice | undefined {
  if (!choice || before === after) return choice;
  let start = 0;
  while (
    start < before.length &&
    start < after.length &&
    before[start] === after[start]
  )
    start++;
  let oldEnd = before.length;
  let newEnd = after.length;
  while (
    oldEnd > start &&
    newEnd > start &&
    before[oldEnd - 1] === after[newEnd - 1]
  ) {
    oldEnd--;
    newEnd--;
  }
  const delta = after.length - before.length;
  // Inserting directly at a name's edge changes the name unless separated by whitespace/comma.
  if (
    oldEnd <= choice.range.start &&
    (start < choice.range.start || /[\s,]$/.test(after.slice(start, newEnd)))
  ) {
    return {
      ...choice,
      range: {
        start: choice.range.start + delta,
        end: choice.range.end + delta,
      },
    };
  }
  if (
    start >= choice.range.end &&
    (start > choice.range.end || /^[\s,]/.test(after.slice(start, newEnd)))
  )
    return choice;
  return undefined;
}

type Snapshot = { raw: string; choice?: MorselChoice };

/** Follow the browser's text undo groups without replacing its native undo stack. */
export function createChoiceHistory(initial: Snapshot) {
  let entries = [initial];
  let index = 0;
  function remember(next: Snapshot) {
    if (
      entries[index].raw !== next.raw ||
      entries[index].choice !== next.choice
    ) {
      entries = entries.slice(0, index + 1);
      entries.push(next);
      index++;
    }
    return next.choice;
  }
  return {
    sync(snapshot: Snapshot) {
      if (entries[index].raw !== snapshot.raw) {
        entries = [snapshot];
        index = 0;
      }
    },
    choose(raw: string, choice: MorselChoice) {
      remember({ raw, choice });
    },
    edit(raw: string, inputType?: string) {
      const direction =
        inputType === "historyUndo" ? -1 : inputType === "historyRedo" ? 1 : 0;
      if (direction) {
        for (
          let next = index + direction;
          next >= 0 && next < entries.length;
          next += direction
        ) {
          if (entries[next].raw === raw) {
            index = next;
            return entries[next].choice;
          }
        }
      }
      return remember({
        raw,
        choice: moveChoice(entries[index].raw, raw, entries[index].choice),
      });
    },
  };
}
