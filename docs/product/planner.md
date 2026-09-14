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

- The planner lays a plan out down the calendar, anchored on today.
- Each day is introduced by a separator carrying its weekday and date, and
  today is marked as the current date.
- An item's section comes from its own bucket, or else from the nearest
  ancestor with one:
  - an unnamed bucket puts it on that bucket's day;
  - a named bucket puts it in that bucket's own section, headed by the
    bucket's name and, if it has one, its date;
  - with no bucket anywhere above, it is Unplanned.
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
- An item in a different section from its parent names that parent, and
  says which day the parent falls on when that day differs.
- An item falling after the thing it belongs to is marked as out of order,
  since preparation cannot follow what it feeds.

### The item screen

- The item screen slides in over the planner. Closing it, by its close
  button, a flick, or Back, returns to the planner.
- The item screen opens with the walk from the plan's root down to the item,
  naming every step along the way.
- A step says which day it falls on wherever that differs from the step
  above it, so a plan whose parts share a day says its date once.
- An item nothing in the plan dates says nothing about when it happens.
- Choosing a step above the item opens that step instead. Nothing below the
  item can be chosen: it is already in view, and opening it would only
  narrow what is shown.
- An item below the open one that falls on another day says which day.

### Cooking

- An item with anything below it links to its cook view: on the timeline,
  in the item screen's walk down to the open item, and below it.
- The cook view is a page of its own, in the Planner section. Back returns
  to where it was opened from, with the item screen still open if it was.

### Moving items

- A user who can change a plan sees a handle on the left edge of each of
  its items. Anyone else sees no handles.
- Dragging an item by its handle moves everything below it too.
- On the timeline, dropping an item on another day puts it on that day.
  - The item joins a bucket already on that day, preferring an unnamed one.
  - If the day has no bucket yet, an unnamed one is created for it.
  - The item keeps its place in the plan.
- On the timeline, dropping an item on a named bucket's section puts it in
  that bucket, and dropping it on Unplanned clears its bucket. An item
  whose ancestor has a bucket then shows wherever that bucket puts it.
- A bucket an item would inherit anyway isn't set on it: dropping an item
  where its ancestor's bucket already puts it clears its own bucket, and
  any item below it left with the same bucket it now inherits has that
  bucket cleared too.
- On the timeline, dropping a top-level item above or below another
  top-level item in the same section reorders it. Its section doesn't
  change. A nested item can't be reordered from the timeline.
- In the item screen:
  - dropping an item on the right three-quarters of another makes it that
    item's first child;
  - dropping it on the left quarter puts it before or after that item,
    depending on which half it lands in.
- An item can't be dropped inside itself.
- An item can't be dragged from the item screen to the timeline or back.
  Moving it in either one updates both.
- A move shows immediately. If it fails, the item goes back where it was
  and a message says so.
- Items can be moved by keyboard: Enter on a handle picks the item up, Tab
  moves between the places it can go, Enter drops it, and Escape cancels.

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
