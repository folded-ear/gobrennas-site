# Ingredient recognition

State: Agreed  
Delivery: Built; authenticated browser verification pending

## Purpose

Help people enter ingredients by identifying quantities, units, and ingredients
while keeping their original text editable. BFS-22 adds single-row recognition;
BFS-82 adds contextual suggestions and recognition of multiline-pasted rows.
[BFS-23](https://linear.app/go-brennas/issue/BFS-23) defines the shared request
and draft-update behavior below. Raw row editing and single-row recognition
are implemented using the shared `Morsel` component. Multiline paste queues
all affected rows for recognition. Grouped suggestions use the recognition API
in recipe creation. The fixture-based `/sandbox/food-entry` playground is preserved
on the [`morsel-prototype` branch](https://github.com/folded-ear/gobrennas-site/tree/morsel-prototype)
(commit `6b760b3`) for future interaction experiments; it is not included in the
recognition UI branch.

## Behavior

- Recognition follows a brief pause in editing. It preserves entered text,
  row order, focus, and selection. Very short or blank rows remain editable
  without recognition requests.
- Recipe creation has no per-row recognition opt-out or checkbox. A leading
  `!` does not disable recipe ingredient recognition; that convention belongs
  to planner entries such as tentative meal ideas.
- Recognition appears inline: quantity has a light gray background, unit has a
  muted dotted underline, and ingredient is black with subtle visual bolding
  (white in dark mode). Ordinary text stays dark gray. Keep it readable as
  normal text even across a full planner. Accessible summaries identify Quantity,
  Unit, Ingredient, and Preparation, including new units and ingredients. Missing
  ingredient recognition is informational and does not prevent saving.
- Pasted rows appear immediately and are recognized in the background. Work
  on the actively edited row takes priority over waiting pasted rows.
- Opening a saved recipe also queues its ingredient rows, including owned
  section rows, for background recognition without moving focus or opening
  suggestions. These highlights do not replace saved ingredient data until
  the person edits the row.
- Suggestions belong to the active cursor position. Choosing one replaces
  only its indicated text range. Editing or moving the cursor makes old
  suggestions unavailable; leaving a row hides its suggestions.
- Choosing an ingredient or leaving a recognized row settles its name. Returning
  to that row, moving the cursor, or editing its quantity, units, or preparation
  keeps the dropdown closed. Editing the ingredient name enables suggestions
  again; Arrow Down explicitly opens available alternatives. Recognition still
  updates in the background, and a recognition response arriving while someone
  is actively typing does not close their suggestions.
- Editing text clears recognition derived from the previous text. A late
  response cannot restore outdated ingredient details or suggestions.
- A small spinner inside the input indicates recognition is pending without
  shifting the text or surrounding rows. Loading and failures do not block
  editing. A failed row shows non-blocking feedback and offers retry; successful
  recognition in other rows is retained.
- Saving does not wait for recognition. It preserves populated raw rows and
  includes recognized details when they match the current text. Blank rows
  are omitted. Results arriving after submission do not change that save.

## Morsel interaction

`Morsel` is the reusable food editor. Recipe creation is its first consumer;
planner item details also use recognition-only Morsel for existing leaf rows.
Planner fields use a compact inline layout; resting ingredient rows reuse its
highlight styles on the original text.
Planner suggestions and shopping adoption are later work. The archived prototype keeps its
fake parser and catalog on the separate branch linked above.

- Suggest ingredients only, not units. Group candidates by **Pantry item**,
  **Recipe**, and **Section**, omitting empty groups. Keep distinct identities
  even when names match. Selecting a section references it as one ingredient;
  it remains an ordinary ingredient row pointing to that section’s recipe ID.
  Its position is preserved, and its children are not copied into rows. The
  suggestion group describes the selected item, not the containing recipe’s
  structure. Adding and editing structural sections is separate work.
- Keep the dropdown compact: 4px vertical padding per option, 2px per heading,
  readable text, and subtle group separators. Optional secondary information can
  help distinguish choices. The prototype's durations and descriptions are fake;
  real suggestions must use available source data.
- No option is automatically active. Arrow keys browse; Enter selects an active
  option, otherwise it adds a recipe row. Tab leaves without selecting. Escape
  dismisses, including when a response is still pending. New input or cursor
  movement can reopen suggestions for an unsettled name; ArrowDown can explicitly
  reopen matching suggestions for a settled name too.
- Pointer selection keeps focus in the editor and places the caret immediately
  after the inserted name. Replace exactly the server's range, preserving the
  prefix and suffix. Never auto-add double quotes to names.
- Browser-owned `contenteditable="plaintext-only"` keeps text freely editable.
  CSS Custom Highlights decorate ranges without wrapping text in spans or
  rewriting the DOM. This preserves selection and native editing history.
  `::highlight` cannot change font weight: the ingredient's subtle bold look
  uses two opposite quarter-pixel, zero-blur text shadows.
- Explicit identity follows native undo/redo snapshots, including browser-coalesced
  text edits. Manually retyping a previously chosen name does not restore the old
  choice. A multiline row replacement resets that row's choice history.
- The input wraps naturally and is about 42px high for one line. A browser without
  Custom Highlights still gets editable plain text. Programmatic insertion uses
  an isolated `execCommand("insertText")` helper to preserve native undo; unsupported
  insertion shows a recoverable error instead of silently losing the text.

### API integration

The API supplies authoritative candidate kinds, IDs, names, and target ranges.
Morsel opts into suggestions that include owned sections and retain different
identities with the same name. The legacy client runs alongside Morsel until
cut-over: its unchanged queries exclude owned sections and deduplicate suggestions
by name. Omitting an explicit choice keeps the existing pantry-first recognition
behavior. Explicit selection binds that identity and
its current UTF-16 name range; the server verifies both before recognizing the
surrounding quantity, unit, and preparation. Changed or missing names produce a
recoverable recognition error rather than silently switching identities.

Section suggestions include their parent recipe name as secondary information.
Recipe times and pantry descriptions remain fixture-only experiments. The API's
existing total count limit (ten by default) still applies, with pantry matches
first and owned recipe/section matches following. The UI groups the returned set.

Both repos must run this version for real suggestions: the site selects the new
schema fields. Section selection saves an ordinary ingredient reference and
round-trips through `recipe.ingredients`, retaining its position. Structural
sections continue to use the existing `sections` input. No database migration
is required.

## Text conventions and saving

- Paired double quotes explicitly identify an ingredient name, including names
  not already in the library. Straight quotes (`"chocolate chips"`), curly
  quotes (`“chocolate chips”`), and guillemets (`«chocolate chips»`) are supported
  by the API. Paired underscores explicitly identify a unit (`_pinch_`).
- Keep markers in raw text and the recognition preview. Strip them from parsed
  names when saving new units or ingredients. Existing matches save their IDs.
  The API owns recognition; the browser does not guess missing closing markers
  or parse ingredient text independently.
- Preserve the entered quantity text, including fractions, and save the numeric
  value returned by recognition. An explicit unit without a number saves with
  quantity one, matching the API's automatic-recognition behavior; the API
  stores units as part of a quantity.
- Preparation is the text left after removing recognized quantity, unit, and
  ingredient ranges. Normalize its whitespace and redundant commas for saving,
  leaving the original raw text unchanged.

## Requests and draft updates

Reuse the existing single-row recognition operation in
[the schema](../../schema.graphql). Each eligible row makes its own request
through the existing Apollo transport. Do not introduce aliased bulk queries,
transport batching, or a bulk API operation now. Bulk scheduling needs no API
change. The approved Morsel suggestion behavior does need a richer recognition
contract, implemented alongside the site in `gobrennas-api` (described above).

### Input and scheduling

- Keep one recognition queue per editor, with at most three requests in flight
  and at most one in flight per row. The active row takes priority over queued
  background rows; background rows otherwise run in queue order.
- Debounce text and cursor changes for 300 ms. Keep only the latest queued work
  for each row. Do not request during IME composition; start the debounce after
  composition ends. Skip rows whose trimmed text has fewer than two characters,
  but send eligible raw text unchanged so range offsets remain correct.
- A multiline paste first updates the draft using the existing paste behavior.
  Queue eligible affected rows immediately, without a per-row debounce. Do not
  recognize unaffected rows again or generate suggestions for background rows.
- For active-row requests, capture the start of the text selection, clamped to
  the raw text's length. A selection uses its start. Cursor positions and range offsets use
  the editor's UTF-16 indices. Pasted background rows use the end of their text.
  The focused pasted row can request suggestions using its actual cursor.
- Request suggestions for the active row only; moving the cursor or focusing
  a row schedules fresh contextual suggestions. Background requests omit suggestions, whose server resolver
  performs separate work. Use uncached recognition requests.

### Results and draft updates

- Associate work with the row's stable `clientId`, a unique
  revision token, and a snapshot of raw text, cursor, and whether suggestions were
  requested. Replace the revision token whenever that request context changes.
  Reordering does not change identity or revision. Never match by row index.
- Apply a result only if the editor and row still exist and the revision and
  request snapshot are current. Also verify the returned raw text and cursor
  match the request. This rejects both late responses and an old response when
  text changes away and then back to the same value. Apply the same checks to
  failures so obsolete errors cannot replace current success.
- Accepted results add ranges and parsed values to the current row without
  replacing its raw text or moving focus or selection. Pure conversion code
  prepares the parsed data for serialization; API field definitions remain in
  the schema. Request bookkeeping and suggestions are not persisted.
- Text edits immediately invalidate ranges, parsed values, and suggestions.
  Cursor-only changes invalidate suggestions and pending work, but can retain
  parsed data for unchanged raw text. Suggestions are shown or accepted only
  for the active row's current request context. Blur hides suggestions.
- Selecting a suggestion replaces its returned target range in the current
  raw text, records the explicit identity, then follows the ordinary debounce
  path. A stale suggestion cannot be applied. Edits outside the ingredient name
  preserve the choice; edits to its name release it. Re-recognition and immediate
  save must preserve a selected recipe or section over a same-name pantry item.

### Cancellation, failures, and save

- Remove obsolete queued work and abort obsolete in-flight work where the
  transport supports it. Release its concurrency slot when the request
  settles. Revision checks are mandatory even when abort is available.
  Deleting a row cancels its work; closing the editor cancels all work.
- Handle each row independently. A network or GraphQL failure leaves other
  results intact and marks only the current failed request. Cancellation is
  not a visible error. Retry uses the latest row context through the same
  queue; there is no automatic retry loop. A subsequent edit also schedules
  fresh work. An empty set of recognized ranges is a successful result.
- Saving snapshots the current draft without waiting for recognition. Include
  parsed data only when it belongs to the current raw text; otherwise send
  raw text alone, plus any still-valid explicit ingredient choice. Choosing a
  suggestion also retains recognized quantity/unit ranges outside its replacement,
  so an immediate save includes those values. Omit blank rows as before. Recognition completing afterward
  cannot change the submitted payload or trigger another save.

## Why this approach

Independent requests reuse the API and keep partial failures local to a row.
Combining aliases would couple failures: the current recognition field and its
parent are non-null, so an execution error can invalidate the whole response.
Transport batching would require verifying and supporting another transport
behavior. Neither is necessary for the current workflow.

A paste of 20 eligible rows still makes 20 HTTP requests. The queue limits
concurrency rather than reducing request count. The 300 ms debounce and
three-request limit are starting choices, not measured performance optima.
Aborting a browser request does not guarantee server work stops.

Consider a bulk operation later if measured request overhead or large-paste
latency makes individual requests inadequate. It should accept a bounded number
of rows and return explicit per-row success and failure results, retaining the
identity and revision rules above.

## Related documents

- [Recipes](recipes.md)
- [Forms and validation](../forms-and-validation.md)
