# Forms and validation

How the recipe forms handle drafts, validation, and saving. The code is in
`src/features/recipe-form/`.

## The draft

- A fresh draft keeps browser-editable values as raw strings, so a blank or
  half-typed number survives editing. Nothing is coerced while a person
  edits.
- A Zod schema defines the draft's shape and rules. The draft type is the
  schema's input; its parsed output has numbers or null.
- The serializer parses once with that schema, then maps the result to the
  generated GraphQL input. Browser-only rules stay out of Apollo and React so
  they can be tested directly.

## Field rules

- Optional numeric and duration fields treat blank as unknown and serialize
  it as `null`. Zero is kept where the field allows it.
- Yield is a positive whole number. Calories and total cook time are
  non-negative whole numbers within the signed 32-bit bound; total time is
  limited so its milliseconds also fit.
- Total cook time accepts bare whole minutes, minutes with a unit, or one
  hour value followed by an optional minute value (`80 min`, `1h 20m`).
  Parsing ignores case and tolerates normal spaces and a comma between units.
  It rejects decimals, seconds, duplicate units, other text, and clock
  notation. Minutes become milliseconds only in the serializer; the draft
  text is unchanged.
- Source URL is optional text. The serializer trims it and maps blank to
  `null`; its format is not validated.
- Recipe labels are a string array. The shared label editor handles choosing
  suggestions, creating new labels, and removing them; the create adapter
  loads and retries suggestions. Serialization trims names, replaces slash
  runs with hyphens as the API does, drops blanks, and removes
  case-insensitive duplicates. No labels sends an empty array. See
  [recipe labels](product/recipes.md#recipe-labels).
- Ingredient rows keep raw text and stable client identities. Blank rows are
  omitted when serializing; populated rows keep their text and order.
  [Ingredient recognition](product/ingredient-recognition.md) covers
  scheduling, stale responses, and updates to derived row data.

## React Hook Form

- React Hook Form owns editable values, field errors, validation timing, and
  submission state.
- Connect the draft schema with `zodResolver` and `{ raw: true }`, so the form
  and its submit handler get the original strings. The serializer uses the
  schema's transformed output for the API payload.
- Validate on submit; after a submission, revalidate edited fields on change.
- Use `src/components/form-text-field.tsx` for string inputs and text areas.
  It connects `useController` to HeroUI and forwards the registered ref, so
  React Hook Form can focus the first invalid field. HeroUI's `Label`,
  `Description`, and `FieldError` provide the accessible associations; don't
  allocate error IDs or keep a ref per field by hand.
- Use a `Controller` for custom controls such as the ingredient rows.

## Validation and submission

- Validate every field in one pass so all errors show together, each beside
  its field. Focus the first invalid field after a failed submit.
- Recheck a field's error as it changes, keeping it until the field is valid,
  without clearing other fields' errors.
- The form owns its failure, success, and cancel lifecycle. One synchronous
  guard covers validation and persistence, so submissions can't overlap.
- While saving, mark the form busy and disable every control.
- A failure shows a safe, actionable alert above the fields and keeps the
  draft. Editing any field clears the alert.

## Adapters

- Persistence is an asynchronous submitter passed to the form, so create and
  edit share the form without depending on a mutation.
- The create adapter calls the generated operation, checks the returned ID,
  evicts affected cache data only after success, and hands the route outcome
  to the screen. Apollo state stays out of the form.

## Photos

- Photo selection and upload state live in the form's photo hook. File
  objects and blob URLs are temporary and never enter GraphQL variables.
- The hook prepares a candidate before replacing the current photo, cancels
  superseded candidates, and keeps the prepared file for upload retries.
- The create adapter provides the upload function: it requests an uncached
  scratch URL and uploads directly to storage with the required headers.
- The submitted draft gets only a ready filename and validated focus
  coordinates. The Save button and the submit handler both reject pending
  preparation and pending or failed uploads.
- A failed recipe save invalidates the scratch filename but keeps the file
  and focus for a fresh upload. See
  [photo behavior](product/recipes.md#photos-in-recipe-creation).

## Editing a saved recipe

- The edit adapter fetches a complete, uncached snapshot, checks ownership,
  and initializes the form once per recipe ID. The snapshot stays the
  baseline for serialization; cache updates never reset input or row IDs.
- Loaded ingredient rows carry their saved interpretation, which
  serialization uses while the raw text is unchanged, whatever recognition
  suggests. Editing the row discards it.
- Sections keep server IDs and labels; reference sections serialize only
  their ID. Hidden section labels are never inferred from recipe labels.
- The edit serializer keeps untouched metadata from the baseline, including
  nullable directions and exact cook-time milliseconds.
- Before calling the mutation, it rejects removing an owned section that an
  ingredient still refers to.
- A successful update evicts the recipe and its owned sections, through
  Apollo's identity policy, plus library and label queries. A failure
  invalidates nothing.
- Photo state tells a saved photo from a new scratch upload. Keeping the
  saved photo sends no photo fields; changing only its focus sends no
  filename. Clearing a replacement restores the saved photo; upload retries
  apply only to new files.

## Tests

- Test the draft factory, schema, and serializer as plain TypeScript:
  blank-to-`null`, numeric bounds, duration grammar, and minutes to
  milliseconds.
- Test the form through user interactions and accessible roles and labels:
  all field errors, scoped error clearing, focus, and pending state.
- Test Apollo adapters with the real in-memory cache and mock link: payload,
  success-only eviction, and malformed or failed replies.
