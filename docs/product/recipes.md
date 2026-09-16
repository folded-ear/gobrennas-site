# Recipes

State: Draft  
Delivery: Partly built

## Purpose

Recipes live in the Library. A person can add one there, then see its detail
without leaving the Library behind.

## Behavior

### Library and detail

- The Library header offers Add Recipe beside the plan picker.
- Add Recipe opens the create editor as a focused screen over the Library.
- After a successful create, the new recipe detail replaces the editor over the
  Library.
- Selecting recipe detail from the Library opens it over the Library. Direct
  detail and editor addresses use full-page fallbacks.

### Create editor

- The create editor lets a person save a new recipe or cancel.
- Title is required; whitespace alone does not count. Directions are optional.
- An invalid save explains the missing title and does not create a recipe.
- Canceling create returns to the Library without creating a recipe.

### Saving

- While a save is pending, the editor communicates progress and disables its
  actions.
- A failed create or edit save leaves the editor open with the entered values,
  explains that the person can try again, and makes retry available.

### Edit editor

- The proposed edit editor replaces recipe detail when that detail is already a
  focused screen. Edit chosen from the Library opens the editor over the
  Library.
- Saving or canceling edit replaces the editor with recipe detail, so the editor
  is not left in history. Canceling shows the unchanged detail.

## Open questions

- What happens when a person dismisses an editor with unsaved changes?

## Related documents

- [Navigation](navigation.md)
