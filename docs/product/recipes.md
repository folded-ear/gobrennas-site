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
- Title is required; whitespace alone does not count. Save recipe stays disabled
  until the title contains non-whitespace text. Directions are optional.
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
  moves focus to the first invalid field in form order. After a save attempt,
  editing a field rechecks its error; the error clears when the value is valid.
- Ingredients are optional raw text rows before Directions. Rows can be added,
  removed, or reordered with the up/down controls.
- In wider editors, directions sit to the right of ingredients, both for the
  recipe and each owned section. Narrow editors stack them vertically.
- Enter in an ingredient or its row's plus button inserts and focuses a new row
  immediately after it.
  Backspace or Delete on a blank row removes it and focuses the previous row,
  or the next row when the first is removed. Removing the last row leaves a
  fresh blank input ready to use.
- Pasting multiple lines replaces the selection, preserves surrounding text,
  and creates one row per nonblank line. Focus moves to the last pasted row.
- Blank ingredient rows are omitted when saving. Populated rows preserve their
  raw text and order; ingredient recognition is not required.
- Editing or focusing an ingredient runs recognition after a brief pause and
  shows a labeled preview. Saving includes current recognized details when
  available and preserves raw text when recognition is pending or fails. See
  [ingredient recognition](ingredient-recognition.md) for text conventions and
  request behavior.
- Canceling create returns to the Library without creating a recipe.

### Owned sections

State: Agreed — frontend scope of BFS-24.

- Add section appends an expanded section below the main recipe fields and
  focuses its title. A recipe may contain multiple owned sections.
- Each section has a required title, optional directions, and the same ingredient
  editor as the recipe. Paste, recognition, suggestions, and row controls work
  within that section; all rows share the editor's recognition request limit.
- Blank section titles prevent saving. Errors appear beside the fields and
  focus moves to the first invalid field on submission. The recipe's Save button
  remains available once its own title is entered so section errors can be shown.
- Removing any section opens “Remove this section?” with Cancel and Remove
  section actions, including empty new sections. Cancel keeps the section intact.
  Confirming removes it only from the draft and focuses Add section; saving
  applies the change.
- New sections are saved as owned sections through the existing recipe creation
  API. Their titles, directions, ingredient order, and recognized details are
  preserved; blank ingredient rows are omitted. Client identity is independent
  of server identity, including after earlier sections are removed.
- Referenced structural sections and editing saved recipes remain separate
  work. BFS-24's backend suggestion exclusions and save-time reference checks
  are explicitly deferred, alongside the update-ordering concern in BFS-96.

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
- [Ingredient recognition](ingredient-recognition.md)
