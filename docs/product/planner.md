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
- Choosing an item opens it in the drawer, together with everything below
  it, however deep and wherever those descendants sit on the calendar.

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
