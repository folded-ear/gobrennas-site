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
  separate amounts on the same line.
- A plan item with no quantity counts as one. A plan item with a zero
  quantity adds nothing.
- A shopping item from a single plan item with no quantity shows no amount.
  One from several plan items always shows its amounts.
- Plan items with no ingredient are listed on their own, unmerged, after the
  shopping items.

### Needed and acquired

- The list has two regions: Needed on top, Acquired below. Only Acquired
  is headed. A region with nothing in it doesn't appear.
- A plan item with a zero quantity counts as acquired, whatever its status.
- A shopping item is in Needed when any of its plan items is still needed,
  and its amounts sum only those. Once all are acquired, it moves to
  Acquired and sums them all.
- A plan item with no ingredient appears in the region its own status puts
  it in.
- Shopping items in each region are in store order, then by name.

### Checking items off

- Each shopping item, and each plan item with no ingredient, shows its
  status: a gray circle in Needed, an olive check in Acquired.
- A user who can change the plans behind a shopping item can press its
  status to mark every one of its plan items acquired, or, in Acquired,
  needed again. Plan items with a zero quantity are changed too.
- Each plan item listed under an expanded shopping item has a status of
  its own, which switches just that plan item.
- A change saves at once, and the status shows it is saving until it has.
  There is no undo, and no status control deletes anything.

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
- Each plan item shows its text first, with where it sits beneath: its
  ancestors, nearest first.
- A plan item with a zero quantity is marked "NO".
- Plan items with no ingredient appear the same way.

### Several plans

- When more than one plan is being shopped, each shopping item carries the
  dots of every plan behind it, grouped, to the right of its label.
- A plan item's ancestry then ends with its plan, marked with the plan's
  dot. Ancestor items never carry a dot.

## Example

Spaghetti sauce needs 1 tsp sugar and iced tea needs 2 Tbsp. With only the
iced tea's sugar acquired, the list shows sugar, 1 tsp, under Needed.
Expanding it shows both plan items: "1 tsp sugar" under the spaghetti sauce,
and "2 Tbsp sugar" under the iced tea.

## Not included

- Collapsing the Acquired region.
- Reordering ingredients to set their store order.
- Adding items that aren't on a plan.

## Open questions

- None yet.

## Related documents

- [Planner](planner.md)
- [Navigation](navigation.md)
- [Domain model](../domain/model.md)
