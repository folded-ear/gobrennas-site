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

## Example

A pumpkin pie recipe calls for roasting a pumpkin before making the filling.
The user can turn the roasting step into a planned subrecipe, move it to an
earlier day, and keep the pumpkin with that work.

## Open questions

- Is the set of selected plans stored per user or per device?
- What else happens when a plan is marked complete?
- What can an assignee do that another plan member cannot?
- Are Admin, Completer, Acquirer, and Viewer permissions that can be combined,
  or mutually exclusive roles?
- Can a plan have more than one Admin, or is Admin another name for its owner?

## Related documents

- [Domain model](../domain/model.md)
