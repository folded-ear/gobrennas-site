# How ingredient recognition works

How the site requests and applies ingredient recognition. The user-visible
behavior is in [Ingredient recognition](../product/ingredient-recognition.md).

## The editor

Morsel (`src/features/morsel/`) is a `contenteditable="plaintext-only"`
element, so the browser owns editing, selection, and undo history. CSS Custom
Highlights decorate recognized ranges without wrapping text in spans or
rewriting the DOM. `::highlight` cannot change font weight, so the
ingredient's bold look is two opposite quarter-pixel, zero-blur text shadows.

Inserting a chosen suggestion goes through an isolated
`execCommand("insertText")` helper, which keeps native undo. Explicit
choices follow the browser's undo snapshots, including coalesced edits. A
multiline replacement of a row resets that row's choice history.

## The API contract

The API is authoritative for recognition, suggestion kinds, IDs, names, and
target ranges. The browser never parses ingredient text itself or guesses a
missing closing marker. Each eligible row makes its own request with the
single-row recognition operation in [the schema](../../schema.graphql).

- Morsel asks for suggestions that include owned sections and keep
  same-named items distinct. The API returns at most ten by default, pantry
  matches first; the UI groups them.
- Without an explicit choice, recognition prefers pantry items. A choice
  binds an identity and its UTF-16 name range; the server checks both before
  recognizing the quantity, unit, and preparation around it. A changed or
  missing name is a recognition error, never a silent switch of identity.
- A section choice saves as an ordinary ingredient reference, round-tripping
  through the recipe's ingredients in position. Structural sections use the
  separate `sections` input.
- The API stores a unit as part of a quantity, which is why a unit alone
  saves with quantity one.

## Scheduling

- Each editor has one queue (`recognition-queue.ts`): at most three requests
  in flight, and one per row. The active row goes first; other rows run in
  queue order.
- Text and cursor changes are debounced 300 ms, keeping only each row's latest
  work. Nothing is requested during IME composition; the debounce starts when
  it ends. Rows under two trimmed characters are skipped, but eligible text is
  sent untrimmed so range offsets stay correct.
- A multiline paste updates the draft first, then queues the affected
  eligible rows at once, without debounce. Unaffected rows are not
  recognized again.
- Active-row requests send the selection start, clamped to the text length,
  in UTF-16 indices, and ask for suggestions. Background rows send the end of
  their text and don't ask for suggestions, which cost the server separate
  work. Requests are uncached.

## Applying results

- Work is keyed by the row's stable `clientId`, a revision token, and a
  snapshot of raw text, cursor, and whether suggestions were requested. The
  token changes whenever that context does; reordering doesn't. Rows are
  never matched by index.
- A result applies only if the editor and row still exist, the revision and
  snapshot are current, and the returned text and cursor match the request.
  This rejects late responses, including one for text that changed away and
  back. Failures get the same checks, so an obsolete error can't replace a
  current success.
- An accepted result adds ranges and parsed values to the row without
  touching its raw text, focus, or selection. Request bookkeeping and
  suggestions are never persisted.
- A text edit drops ranges, parsed values, and suggestions at once. A cursor
  move drops suggestions and pending work, but keeps parsed data for
  unchanged text.
- Selecting a suggestion replaces its target range, records the identity,
  and follows the normal debounce. Quantity and unit ranges outside the
  replacement are kept, so an immediate save includes them.

## Cancellation, failures, and saving

- Obsolete queued work is removed and obsolete in-flight work aborted. A
  running request keeps its slot until it settles. Revision checks apply even
  when abort works. Deleting a row cancels its work; closing the editor
  cancels everything.
- A failure affects only its row. Cancellation is not an error. Retry
  re-queues the row's latest context; nothing retries automatically. An
  empty set of ranges is a success.
- Saving snapshots the draft. Parsed data is sent only when it belongs to the
  current text; otherwise the raw text goes alone, with any still-valid
  explicit choice.

## Why one request per row

Independent requests keep failures local to a row. Aliasing rows into one
query would couple them: the recognition field and its parent are non-null,
so one execution error can void the whole response. Transport batching would
be another transport behavior to verify and support.

A 20-row paste still makes 20 requests; the queue limits concurrency, not
count. The 300 ms debounce and three-request limit are starting choices, not
measured optima. Aborting a request doesn't guarantee the server stops.

If request overhead or large-paste latency becomes a measured problem, a bulk
operation should take a bounded number of rows and return per-row success or
failure, keeping the identity and revision rules above.
