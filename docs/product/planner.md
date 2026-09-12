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
  selector.
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
- An item's day comes from its bucket's date, from the nearest ancestor
  whose bucket has one, or from today when no ancestor has one. A bucket
  with no date passes the question up to the item's ancestors.
- The planner shows top-level items, items assigned to a bucket, and items
  that have children of their own. Anything else — a leaf nobody has
  bucketed — appears only in the drawer.
- An item appears beneath its parent when they fall on the same day, and
  on its own day when its bucket moves it elsewhere.
- A past date appears only when it carries an item. Today and the following
  week always appear. A future date carrying an item appears with the week
  either side of it.
- Days that nothing falls on collapse into a single break saying how long
  the skipped stretch is.
- A day nothing falls on still leaves room for something to be put there.
- Choosing an item on the timeline opens it in the drawer, together with
  everything below it, however deep and wherever those descendants sit on
  the calendar.
- The item open in the drawer is marked on the timeline, and stays marked
  while the drawer is closed.
- An item on a different day from its parent names that parent and says
  which day the parent falls on.
- An item falling after the thing it belongs to is marked as out of order,
  since preparation cannot follow what it feeds.

### The drawer

- The drawer opens with the walk from the plan's root down to the item,
  naming every step along the way.
- A step says which day it falls on wherever that differs from the step
  above it, so a plan whose parts share a day says its date once.
- An item nothing in the plan dates says nothing about when it happens.
- Choosing a step above the item opens that step instead. Nothing below the
  item can be chosen: it is already in view, and opening it would only
  narrow what is shown.
- An item below the open one that falls on another day says which day.

### Moving items

- A user who can change a plan sees a handle on the left edge of each of
  its items. Anyone else sees no handles.
- Dragging an item by its handle moves everything below it too.
- On the timeline, dropping an item on another day puts it on that day.
  - The item joins a bucket already on that day, preferring an unnamed one.
  - If the day has no bucket yet, an unnamed one is created for it.
  - The item keeps its place in the plan.
- On the timeline, dropping a top-level item above or below another
  top-level item on the same day reorders it. Its day doesn't change. A
  nested item can't be reordered from the timeline.
- In the drawer:
  - dropping an item on the right three-quarters of another makes it that
    item's first child;
  - dropping it on the left quarter puts it before or after that item,
    depending on which half it lands in.
- An item can't be dropped inside itself.
- An item can't be dragged from the drawer to the timeline or back.
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

- Is the set of selected plans stored per user or per device?
- How far into the past should a plan's oldest items keep the timeline
  running? Today every dated item shows, however old.
- What else happens when a plan is marked complete?
- What can an assignee do that another plan member cannot?
- Are Admin, Completer, Acquirer, and Viewer permissions that can be combined,
  or mutually exclusive roles?
- Can a plan have more than one Admin, or is Admin another name for its owner?

## Related documents

- [Domain model](../domain/model.md)
