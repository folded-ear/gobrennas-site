# Shopping

State: Draft  
Delivery: Built

## Purpose

The shopping list tells a user what to buy for the plans they're shopping
from. It merges every plan item calling for the same ingredient into one
line, so each ingredient appears once, with how much is needed.

The terms used here are defined in the [domain model](../domain/model.md).

## Behavior

### Plans

- The Shopping header has the same plan picker as the Planner. The two
  remember their selections separately.
- The list gathers items from every selected plan.

### Shopping items

- The list is built from the plans' leaf items: items with nothing below
  them. A leaf whose ingredient is a recipe is a section header, and is
  left out.
- Plan items calling for the same ingredient make one shopping item,
  whatever their text, recipe, or plan. A shopping item is labeled with its
  ingredient's name, and its text can't be edited.
- A shopping item sums its quantities per unit. Different units show as
  separate amounts on the same line. Quantities show as fractions (see
  [Text conventions](ingredient-recognition.md#text-conventions-and-saving)).
- A plan item with no quantity counts as one. A plan item with a zero
  quantity adds nothing.
- A shopping item from a single plan item with no quantity shows no amount.
  One from several plan items always shows its amounts.
- Plan items with no ingredient are listed on their own, unmerged, after the
  shopping items.

### Needed and acquired

- The list has two regions: Needed on top, Acquired below. Only Acquired
  is headed. A region with nothing in it doesn't appear.
- Acquired starts collapsed. Its heading counts what's in it, like
  "Acquired (17)", and has a control to expand and collapse it. Whether
  it's open is kept only on the page, apart from which shopping item is
  expanded.
- A plan item with a zero quantity counts as acquired, whatever its status.
- A plan item under an acquired item, or under one with a zero quantity,
  counts as acquired too, whatever its own status. Its status isn't changed.
- A shopping item counts as needed when any of its plan items is still
  needed, and its amounts sum only those. Once all are acquired, it counts
  as acquired and sums them all.
- Each shopping item, and each plan item with no ingredient, shows in the
  region of what it counts as, except while it's held (see
  [Sweeping](#sweeping)).
- A plan item with no ingredient appears in its region on its own.
- Shopping items in each region are in store order, then by name.

### Sweeping

- When what a shopping item, or a plan item with no ingredient, counts as
  changes, it's held: it stays in the region it was in until the list is
  swept. A mistaken check-off is then undone in place. Changed back before
  a sweep, it's no longer held.
- Changes are held whoever makes them, and however: a status, an edit, or
  someone else's change.
- Anything new to the list shows in the region of what it counts as.
- The list is swept by the sweep button in the header, when the window
  loses focus, when Acquired is opened or closed, and when the plans being
  shopped change. The list starts with nothing held.

### Checking items off

- Each shopping item, and each plan item with no ingredient, shows what it
  counts as, whichever region it's in: a gray circle when needed, an olive
  check when acquired.
- A user who can change the plans behind a shopping item can press its
  status to mark every one of its plan items acquired, or, once it counts
  as acquired, needed again. Plan items with a zero quantity are changed too.
- Each plan item listed under an expanded shopping item has a status of
  its own, which switches just that plan item.
- A plan item that counts as acquired while marked needed shows the needed
  circle in olive, and its status names it as counting as acquired.
- A change shows at once; see the planner's
  [Saving changes](planner.md#saving-changes). There is no undo, and no
  status control deletes anything.

### Editing plan items

- Plan items, loose or under an expanded shopping item, are edited in
  place as on the [planner](planner.md#editing-items), adding and removing
  items included. A plan item's ancestry beneath it isn't part of what
  starts editing. The keys are the [planner's](planner.md#keyboard-shortcuts).
- A new item shows beside the one it came from until it's created. Then
  it's listed wherever its ingredient puts it. A new item made from one
  still being created stays where it shows.
- A new item whose shopping item disappears moves to the end of the
  needed loose items, still being edited.
- Collapsing a shopping item ends editing of its plan items. Expanding it
  again doesn't resume it.

### Expanding a shopping item

- Choosing a shopping item expands it in place, listing every plan item
  behind it, whatever their status. Expanding one collapses any other.
- Each plan item shows first, with where it sits beneath: its ancestors,
  nearest first. It shows its saved quantity, unit, ingredient, and
  preparation as read-only ingredient text (see
  [Text conventions](ingredient-recognition.md#text-conventions-and-saving)),
  so a zero quantity shows "NO".
- An ancestor that is acquired, or has a zero quantity, is named in olive.
- Plan items with no ingredient appear the same way, but show their text,
  with no "NO" for a zero quantity.

### Several plans

- When more than one plan is being shopped, each shopping item carries the
  dots of every plan behind it, grouped, to the right of its label.
- A plan item's ancestry then ends with its plan, marked with the plan's
  dot. Ancestor items never carry a dot.

### Without a connection

- Shopping is the one section that opens with no connection, once it has
  been opened online on the device. The device keeps the last shopping page
  and the latest shopping data, and a launch that can't reach the server
  starts from them.
- Checking items off works offline as it does anywhere else. The changes
  are sent once the connection returns, and the rest of the list picks up
  other people's changes then.
- Logging out forgets the shopping the device keeps.

## Example

Spaghetti sauce needs 1 tsp sugar and iced tea needs 2 Tbsp. With only the
iced tea's sugar acquired, the list shows sugar, 1 tsp, under Needed.
Expanding it shows both plan items: "1 tsp sugar" under the spaghetti sauce,
and "2 Tbsp sugar" under the iced tea.

## Not included

- Reordering ingredients to set their store order.
- Adding items that aren't on a plan.

## Open questions

- None yet.

## Related documents

- [Planner](planner.md)
- [Navigation](navigation.md)
- [Domain model](../domain/model.md)
