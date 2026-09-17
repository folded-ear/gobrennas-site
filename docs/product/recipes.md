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
- It also offers optional Source URL, Yield, Total cook time, and Calories per
  serving fields, in that order between Title and Directions.
- Yield is a positive whole number. Calories per serving is a non-negative
  whole number. A blank value means it is unknown; zero remains valid for
  Calories per serving.
- Total cook time accepts a bare number of minutes or familiar hour-and-minute
  text, such as `80`, `80 min`, `1h 20m`, `1 hr 20 min`, or `1 hour, 20
  minutes`. It may be zero; a blank value means it is unknown. Decimal values,
  seconds, duplicate units, unrecognized text, and clock notation such as
  `1:20` are not accepted.
- Source URL is optional. Its surrounding whitespace is removed when saved,
  but its format is not validated in this slice.
- An invalid save explains every invalid field, does not create a recipe, and
  moves focus to the first invalid field in form order. Correcting a field
  clears that field's error.
- Canceling create returns to the Library without creating a recipe.

### Saving

- While a save is pending, the editor communicates progress and disables its
  fields and actions.
- A failed create or edit save leaves the editor open with the entered values,
  explains that the person can try again, and makes retry available.
- Editing any field after a failed save clears the failure alert. A successful
  create preserves the existing behavior: it opens the new recipe detail over
  the Library.

### Edit editor

- The proposed edit editor replaces recipe detail when that detail is already a
  focused screen. Edit chosen from the Library opens the editor over the
  Library.
- Saving or canceling edit replaces the editor with recipe detail, so the editor
  is not left in history. Canceling shows the unchanged detail.
- This metadata slice does not yet hydrate metadata into an edit editor or show
  it in recipe detail.

## Open questions

- What happens when a person dismisses an editor with unsaved changes?

## Related documents

- [Navigation](navigation.md)
