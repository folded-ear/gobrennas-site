# Planner

State: Agreed  
Delivery: Partly built

## Purpose

The planner is the workspace where a user organizes upcoming cooking. It brings
together the plans the user wants to work with.

The terms used here are defined in the [domain model](../domain/model.md).

## Behavior

- A user can choose which of their accessible plans appear in the planner.
- The planner displays items from all selected plans in one view.
- When the user has access to only one plan, the planner does not show a plan
  picker.
- The picker lists the user's own plans apart from plans shared with them,
  and shows each selected plan as its colored avatar.
- The selected plans are remembered per device, not per page visit. At least
  one plan is always selected; with nothing remembered, the first plan is.
- A plan can be marked complete.
- A plan item can be assigned to a user.
- A plan item can be given a date.
- A user can split preparation out of a planned recipe and schedule that work
  on a different day. The ingredients needed for that preparation stay with
  the split-out work.
- Plan access distinguishes Admin, Completer, Acquirer, and Viewer.

### The timeline

- The planner lays every selected plan out down one calendar, anchored on
  today. Where plans share a day or section, their items appear in plan
  order: the user's own plans, then those shared with them.
- Each day is introduced by a separator carrying its weekday and date, and
  today is marked as the current date.
- An item's section comes from its own bucket, or else from the nearest
  ancestor with one:
  - an unnamed bucket puts it on that bucket's day;
  - a named bucket puts it in that bucket's own section, headed by the
    bucket's name and, if it has one, its date;
  - with no bucket anywhere above, it is Unplanned.
- A bucket whose name is blank or only whitespace is unnamed.
- Named buckets sharing a name and date (or both undated) share one
  section, whatever their case or spacing. It takes the first bucket's
  spelling.
- When the user can reach more than one plan, each item heading its section
  carries a dot in its plan's color, named for the plan, and so does each
  named bucket's heading. Days and Unplanned carry none, and an item nested
  beneath another shares its plan, so carries none either.
- A named bucket's section always appears: a dated one right after its
  day, an undated one right after today. Unplanned always appears after
  those.
- The planner shows top-level items, items assigned to a bucket, and items
  that have children of their own. Anything else — a leaf nobody has
  bucketed — appears only in the item screen.
- An item appears beneath its parent when they fall in the same section,
  and in its own section when its bucket moves it elsewhere.
- A past date appears only when it carries an item or a named bucket.
  Today and the following week always appear. A future date carrying an
  item or a named bucket appears with the week either side of it.
- Days that nothing falls on collapse into a single break saying how long
  the skipped stretch is.
- A day or section nothing falls in still leaves room for something to be
  put there.
- Choosing an item on the timeline opens it in the item screen, together with
  everything below it, however deep and wherever those descendants sit on
  the calendar.
- The item open in the item screen is marked on the timeline.
- Choosing a day, named bucket, or Unplanned with anything in it opens it
  in a screen of its own; one with nothing in it can't be chosen.
- An item in a different section from its parent names that parent, and
  says which day the parent falls on when that day differs.
- An item falling after the thing it belongs to is marked as out of order,
  since preparation cannot follow what it feeds.

### The item screen

- The item screen slides in over the planner. Closing it, by its close
  button, a flick, or Back, returns to the planner.
- The item screen opens with the walk from the plan's root down to the item,
  naming every step along the way.
- The walk, the item's notes, and the rule beneath them stay in view; only
  what sits below the item scrolls, right to the screen's edges.
- When the user can reach more than one plan, the open item carries its
  plan's dot. The steps above it share its plan, so carry none.
- A step says which day it falls on wherever that differs from the step
  above it, so a plan whose parts share a day says its date once.
- An item nothing in the plan dates says nothing about when it happens.
- Choosing a step above the item opens that step instead. Nothing below the
  item can be chosen: it is already in view, and opening it would only
  narrow what is shown.
- An item below the open one that falls on another day says which day.

### The section screen

- The section screen slides in over the planner like the item screen, and
  closes the same ways.
- It is headed by the section's label, as on the timeline. A named bucket's
  heading carries the dots of every plan it spans; a day or Unplanned
  carries none.
- Below the heading, each item in the section appears with everything below
  it, however deep, from every selected plan.
- A section emptied while its screen is open stays open, showing nothing.

### Cooking

- An item with anything below it links to its cook view: on the timeline,
  in the item screen's walk down to the open item, and below it.
- The cook view is a page of its own, in the Planner section. Back returns
  to where it was opened from, with the item screen still open if it was.
- Cook is a readable view of one planned recipe and its sections, subrecipes,
  and preparation. Opening a recipe in the planner still opens the existing
  editable item screen. Cooking a whole day or bucket is deferred.
- The planned name, quantities, preparations, and ingredient choices are shown.
  Unrecognized rows keep their wording; recognized rows use the same read-only
  quantity, unit, and ingredient treatment as library recipes. Cook offers no
  ingredient editing or scaling controls.
- Ingredients come from the planned occurrence, including linked preparation
  moved elsewhere in the plan. A piece reachable both through the tree and a
  cooking link is shown once. Distinct planned copies of the same saved recipe
  remain distinct. Deleted items are omitted; completed prep remains readable
  and is identified as already prepared.
- Plan-specific notes replace saved directions when present. Otherwise, the
  linked recipe supplies directions. An occurrence whose saved recipe was
  deleted remains readable from its planned items and notes.
- Cook keeps a small photo thumbnail and serving count beside the title. The
  thumbnail opens a larger photo without leaving Cook. Time, source, calories,
  and labels are available under Recipe details, collapsed by default so the
  ingredients and directions begin near the top.
- An independently planned recipe's yield reflects the scale used when it was
  added to the plan; existing planned ingredient quantities are never scaled
  again by the view.
- The title, plan name, I cooked it, I prepped this, and Close remain above the
  scrolling content. Close returns to where Cook was opened. The view loads current plan
  data on entry; a missing or deleted occurrence offers a way back to the planner.
- I cooked it is the primary action. I prepped this is a secondary action that
  marks the recipe Acquired, keeps it in the plan, and stays in Cook. Once saved,
  it reads Prepped and can be pressed again to undo prep (mark Needed). Both
  show their result at once; see [Saving changes](#saving-changes). Viewers
  see the prep status as text and cannot change it.
- Marking a recipe cooked goes back, and the item waits out its undo window
  there, with a button to undo it in place of each of its cook links.

### Status

- Every item is needed until it is acquired, completed, or deleted.
- Each item on the timeline and below the open item or section in its
  screen shows its status: a gray circle when needed, an olive check when
  acquired. The open item itself, in the item screen's walk, shows none.
- A user who can change the plan can press the status to switch the item
  between needed and acquired. The status shows its new value at once; see
  [Saving changes](#saving-changes).
- A user who can change the plan can delete any item from the timeline or
  the item screen, whatever its status. Deleting an item removes
  everything below it too.
- Deleting an item with its delete button, or cooking it, waits a few
  seconds before it's saved. Until
  then the item is struck through, in red when deleted and green when
  cooked, and a button to undo it takes the place of the one that asked
  for it. Everything below it fades and can't be changed.
- Leaving or hiding the page sends any change still waiting.
- Anyone who can't change the plan sees each item's status, but can't
  change it.

### Moving items

- A user who can change a plan sees a handle on the left edge of each of
  its items. Anyone else sees no handles.
- Dragging an item by its handle moves everything below it too.
- An item only ever joins a bucket of its own plan.
- On the timeline, dropping an item on another day puts it on that day.
  - The item joins a bucket its plan already has on that day, preferring an
    unnamed one.
  - If its plan has no bucket on that day yet, an unnamed one is created.
  - The item keeps its place in the plan.
- On the timeline, dropping an item on a named bucket's section puts it in
  its plan's bucket of that name and date, creating one if its plan has
  none. Dropping it on Unplanned clears its bucket. An item whose ancestor
  has a bucket then shows wherever that bucket puts it.
- A bucket an item would inherit anyway isn't set on it: dropping an item
  where its ancestor's bucket already puts it clears its own bucket, and
  any item below it left with the same bucket it now inherits has that
  bucket cleared too.
- On the timeline, dropping a top-level item above or below another
  top-level item of the same plan, in the same section, reorders it. Its
  section doesn't change. A nested item can't be reordered from the
  timeline, and no item can be reordered among another plan's.
- In the item or section screen:
  - dropping an item on the right three-quarters of another makes it that
    item's first child;
  - dropping it on the left quarter puts it before or after that item,
    depending on which half it lands in;
  - an item can only be dropped among its own plan's items.
- In the section screen, the section's own items stay where the timeline
  put them: they can't be dragged, and an item dropped on one can only
  nest under it. A user who can change their plan sees a disabled handle
  on them; where the section holds several plans' items, each shows its
  plan's dot in the handle's place instead.
- An item can't be dropped inside itself.
- An item can't be dragged from the item screen to the timeline or back.
  Moving it in either one updates both.
- A move shows immediately. If the server refuses it, the item goes back
  where it was and a message says so; see [Saving changes](#saving-changes).
- Items can be moved by keyboard; see [Keyboard shortcuts](#keyboard-shortcuts).

### Adding from the timeline

- Each day, named bucket, and Unplanned section has an Add button when the user
  can add there. It opens the shared Morsel editor with pantry, recipe, and section
  suggestions. Choosing a suggestion preserves its identity when saved, including
  suggestions with the same name. A leading `!` skips recognition.
- When several eligible plans are shown, a plan picker chooses where the new item
  belongs. Creating a missing destination bucket requires administering that plan;
  adding to an existing bucket only requires permission to change items.
- Add saves a new root item at the end of the chosen plan and assigns it to the
  section's bucket. Unplanned items have no bucket. Choosing a recipe uses the same action as the library’s Add to plan: its
  ingredients and nested sections are added too, making the cooking and detail
  views available. A typed quantity scales the recipe (for example, `2 Chili` adds
  a double batch); no quantity means one batch. Saving waits for current recognition
  if the quantity was just edited. Recipe quantities must be greater than zero.
  A section suggestion still saves a reference only.
- Cancel discards the draft. A plain item appears in its section at once,
  bucket included; see [Saving changes](#saving-changes). A failure while
  making a missing bucket or adding a recipe keeps the text.

### Editing items

- Existing leaf rows inside an open item's detail use compact, inline Morsel while being edited.
  Quantity, unit, and ingredient highlights update after a brief pause. This
  first version has no suggestions; saving still sends the entered text.
  A leading `!` skips recognition. Recognition failures do not prevent saving.
  Resting rows use the same highlights while preserving the original wording,
  fractions, and punctuation. Pending name and status changes keep their existing
  visual feedback. Failed recognition leaves resting text readable without highlights.
  Headings, new rows, and section screens keep their plain text fields.
- A user who can change a plan edits an item's name in place wherever it
  shows as text: below the open item or in a section screen, and the open
  item itself at the head of the item screen. Names on the timeline open
  the item instead.
- Pressing anywhere in the space a name takes, or could take, starts
  editing it. The name itself can be reached by keyboard.
- One item is edited at a time. Leaving it, however that happens, saves
  its new name and shows it as usual again. Escape cancels, saving
  nothing, and leaves the screen open.
- An item waiting to be deleted or cooked, or below one that is, can't be
  edited.
- Enter adds a new, empty item beside the one being edited: above it with
  the cursor at the start of its name, below it otherwise. In the item
  screen's heading, Enter adds a new first child of the open item instead.
  Enter does nothing in a blank item.
- A new item is edited at once. Leaving it creates it, unless it's still
  blank, in which case it's thrown away.
- Backspace or Delete in an empty item with nothing below it deletes the
  item at once, with no undo, and moves on to the item before or after it,
  or to the other one when there's none that way. With neither, nothing is
  left being edited. In an item with something below it, the keys do
  nothing.
- An item left blank is deleted the same way when nothing is below it.
  With something below it, it's saved blank and shows as a lighter, italic
  "Unnamed" wherever its name appears.
- Deleting the open item from the item screen's heading closes the screen.
- A new item made beside one of a section's own items joins that section.

### Saving changes

- A change to an item (its status, name, bucket or place, or a new item)
  shows as done the moment it's made, before the server has it.
- The change is kept on the device until the server answers, and sent as
  soon as it can be: again after a reload, and once a lost connection
  returns. A failed connection never discards a change.
- If the server refuses a change, it is undone and a message says so.
  Changes made together, like a move and the bucket clearing it causes,
  are refused together.
- An item just made can be renamed, moved, and built on before the server
  has it; those changes are sent once it does.
- While the planner is open and visible, changes made in other tabs, on
  other devices, or by other users show within a few seconds, and at once
  when the page becomes visible again.
- When the login has expired, changes wait, and the header offers to sign
  in again. The page after signing in sends them.
- Logging out with changes still unsent warns first. Those changes stay on
  the device and are sent when the same user signs in again; another
  user's sign-in discards them.

### Keyboard shortcuts

While editing an item's name:

| Key | Does |
| --- | --- |
| Enter | Adds a new item below, or above with the cursor at the start. In the item screen's heading, adds a first child. |
| Backspace | In an empty item with nothing below it, deletes it and moves to the item before. |
| Delete | In an empty item with nothing below it, deletes it and moves to the item after. |
| Escape | Cancels the edit. |
| Tab | Leaves the item, saving it. |

On an item's handle:

| Key | Does |
| --- | --- |
| Space or Enter | Picks the item up. |
| Arrow keys | Move it. |
| Space, Enter, or Tab | Drops it. |
| Escape | Cancels the move. |

## Example

A pumpkin pie recipe calls for roasting a pumpkin before making the filling.
The user can turn the roasting step into a planned subrecipe, move it to an
earlier day, and keep the pumpkin with that work.

## Open questions

- How far into the past should a plan's oldest items keep the timeline
  running? Today every dated item shows, however old.
- What else happens when a plan is marked complete?
- What can an assignee do that another plan member cannot?
- Are Admin, Completer, Acquirer, and Viewer permissions that can be combined,
  or mutually exclusive roles?
- Can a plan have more than one Admin, or is Admin another name for its owner?

## Related documents

- [Domain model](../domain/model.md)
- [Navigation](navigation.md)
