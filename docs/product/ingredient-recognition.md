# Ingredient recognition

State: Agreed  
Delivery: Partly built

## Purpose

Help people enter ingredients by identifying quantities, units, and ingredients
while keeping their original text editable. BFS-22 adds single-row recognition;
BFS-82 adds contextual suggestions and recognition of multiline-pasted rows.
[BFS-23](https://linear.app/go-brennas/issue/BFS-23) defines the shared request
and draft-update behavior below. Raw row editing and single-row recognition
are implemented. Suggestions and automatic recognition of all multiline-pasted
rows remain planned; a pasted row is recognized when focused or edited.

## Behavior

- Recognition follows a brief pause in editing. It preserves entered text,
  row order, focus, and selection. Very short or blank rows remain editable
  without recognition requests.
- Recipe creation has no per-row recognition opt-out or checkbox. A leading
  `!` does not disable recipe ingredient recognition; that convention belongs
  to planner entries such as tentative meal ideas.
- The editable input is followed by a separate preview labeled Quantity, Unit,
  Ingredient, and Preparation. New units and ingredients are labeled as new.
  Missing ingredient recognition is informational and does not prevent saving.
- Pasted rows appear immediately and are recognized in the background. Work
  on the actively edited row takes priority over waiting pasted rows.
- Suggestions belong to the active cursor position. Choosing one replaces
  only its indicated text range. Editing or moving the cursor makes old
  suggestions unavailable; leaving a row hides its suggestions.
- Editing text clears recognition derived from the previous text. A late
  response cannot restore outdated ingredient details or suggestions.
- Loading and failures do not block editing. A failed row shows non-blocking
  feedback and offers retry; successful recognition in other rows is retained.
- Saving does not wait for recognition. It preserves populated raw rows and
  includes recognized details when they match the current text. Blank rows
  are omitted. Results arriving after submission do not change that save.

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
transport batching, or a bulk API operation now. No prerequisite
`gobrennas-api` change or separate API issue is required.

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
- For active-row requests, capture `selectionStart`, clamped to the raw text's
  length. A selection uses its start. Cursor positions and range offsets use
  the input's UTF-16 indices. Pasted background rows use the end of their text.
  The focused pasted row can request suggestions using its actual cursor.
- BFS-22 requests recognition only. BFS-82 also requests suggestions for the
  active row; moving the cursor or focusing a row schedules fresh contextual
  suggestions. Background requests omit suggestions, whose server resolver
  performs separate work. Use uncached recognition requests.

### Results and draft updates

- Associate work with the row's stable `clientId`, a monotonically increasing
  revision, and a snapshot of raw text, cursor, and whether suggestions were
  requested. Increment the revision whenever that request context changes.
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
  raw text, then follows the ordinary edit/invalidation/debounce path. A stale
  suggestion cannot be applied.

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
  raw text alone. Omit blank rows as before. Recognition completing afterward
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
