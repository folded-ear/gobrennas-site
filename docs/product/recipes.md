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
- Save recipe and Cancel sit beside Add Recipe in the sticky header and remain
  visible while the form scrolls, in both the drawer and the full-page editor.
- Title is required; whitespace alone does not count. Save recipe stays disabled
  until the title contains non-whitespace text. Directions are optional.
- It also offers optional Source URL, Yield, Total cook time, and Calories per
  serving fields, in that order between Title and Directions.
- Title, Source URL, Yield, Total cook time, Calories per serving, and recipe
  labels share two equal-width columns above ingredients and directions.
  Narrow editors stack these fields in a single column.
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

### Recipe labels

- The create editor offers optional recipe-level labels in a multi-select field.
  Labels sit with the recipe metadata above ingredients and directions,
  keeping them easy to reach when the recipe text is long.
  Selected labels appear as removable tags inside the field. Open the field to
  search existing labels, then select with the pointer or arrow keys and Enter.
  The menu stays open to choose several labels; selected options have checkmarks
  and can be selected again to remove them. Escape closes the menu.
- For a new name, select the Create suggestion with the pointer or arrow keys and
  Enter. Typing alone does not add a label. Clear recipe labels removes all
  selected labels.
- Label names are trimmed. Runs of `/` become a single `-`, matching the API's
  existing `LabelService.ensureLabel` behavior; changing that rule requires a
  separate API change. The Create suggestion previews the resulting name.
- Blank labels are ignored. Names are compared without regard to case after
  normalization, so the same label cannot be added twice. Selecting an existing
  label preserves its spelling.
- Added labels can be removed with their remove button or by focusing a label
  and pressing Delete or Backspace. Removing the last label returns focus to
  the label field.
- The editor explains loading, empty, no-match, and duplicate states. If
  suggestions cannot load, retry is available and free-form labels can still
  be added. Labels are retained after a failed recipe save, and their controls
  are disabled while saving.
- Added labels persist through recipe creation. Successful creation invalidates
  the cached label suggestions so subsequent editors can discover new labels.
- Section labels (BFS-80) and library search/filter changes are separate work.

### Photos in recipe creation

- The Photo field sits below metadata and above ingredients and directions.
  Choose photo opens a file picker; dropping a file selects it as well.
- Selection immediately shows a local preview and starts a direct browser upload
  through the existing scratch-upload API. JPEG, PNG, WebP, GIF, and AVIF files
  are supported if the browser can decode them. Invalid or unreadable images
  produce a field error. Unsupported file types and empty files are rejected
  before changing the current selection: its upload, preview, focus, and save
  readiness are preserved. These selection errors do not offer an upload retry.
- Images at least 1 MiB are resized in the browser toward a size below 1 MiB,
  matching the legacy upload target. Resized images become JPEGs; transparency
  is flattened onto white and animation is not preserved. Resizing attempts are
  bounded and report an error if the target cannot be reached.
- Preparation has indeterminate progress; upload progress reflects bytes sent.
  Sending all bytes does not mean success until storage confirms the upload.
- The rest of the draft remains editable during upload. Saving is blocked while
  a selected photo is uploading or has an error. Retry requests a fresh upload
  URL without requiring the person to select their file again.
- Clicking or dragging on the image sets its focus. Arrow keys adjust focus by
  one percentage point, Shift-arrow by ten, and Enter/Space resets it to center.
  A narrow crop preview updates as focus changes. Cards and detail pages use the
  same saved focus; exact cropping varies with the image container and screen.
- Choosing another photo cancels the previous attempt and resets focus to center.
  Late results from a canceled attempt cannot replace the current selection.
  Discard photo clears this unsaved selection and allows saving without a photo.
- Saving includes the completed upload's scratch filename and focus. If recipe
  saving fails, the selected file and focus remain available, but uploading must
  be retried because the API may already have consumed the scratch file.
- Canceling/unmounting aborts active work and releases local preview resources.
  Discarding a selection does not request deletion of an already-uploaded scratch
  object. Storage cleanup is outside this frontend change.
- This iteration covers creation only. Editing/replacing saved recipe photos is
  deferred to BFS-84; removing saved photos requires the separate BFS-79 work.

### Owned sections

State: Agreed — frontend scope of BFS-24.

- Add section appends an expanded section below the main recipe fields and
  focuses its title. A recipe may contain multiple owned sections.
- Each section has a required title, optional directions, and the same ingredient
  editor as the recipe. Paste, recognition, suggestions, and row controls work
  within that section; all rows share the editor's recognition request limit.
- Section ingredient inputs, row actions, and recognition feedback include the
  section number in their accessible names so they can be distinguished from
  the recipe's main ingredients and other sections.
- Blank section titles prevent saving. Errors appear beside the fields and
  focus moves to the first invalid field on submission. The recipe's Save button
  remains available once its own title is entered so section errors can be shown.
- Removing a section with a blank title, blank directions, and only blank
  ingredient rows removes it immediately. Whitespace alone counts as blank.
  Sections with content open “Remove this section?” with Cancel and Remove
  section actions. Cancel keeps the section intact. Removal changes only the
  draft and focuses Add section; saving applies the change.
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
