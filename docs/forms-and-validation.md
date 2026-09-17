# Forms and validation

Recipe forms keep browser-editable values as raw strings in a fresh draft. This
preserves useful transient input such as a blank or partially typed number; the
draft does not coerce values while a person is editing. A pure validator checks
the draft, and a serializer performs the final conversion to the generated
GraphQL input. Keep browser-only rules out of Apollo and React so they can be
tested directly.

Optional numeric and duration fields treat a blank string as unknown and
serialize it as `null`; valid zero is retained where the field permits it. Yield
is a positive whole number. Calories and total cook time are non-negative whole
numbers within the signed 32-bit write bound; total time is limited so its
milliseconds conversion also fits that bound. Total cook time accepts a bare
whole-minute value, a minute value with a unit, or one hour value followed by an
optional minute value (for example, `80 min` or `1h 20m`). Parsing is
case-insensitive and tolerates normal spaces and the comma between units; it
does not accept decimals, seconds, duplicate units, arbitrary text, or clock
notation. The serializer converts parsed total-time minutes to milliseconds
only at the write boundary, leaving the raw draft text unchanged.

Source URL remains permissive optional text in this slice. The serializer trims
it and maps blank to `null`; it does not perform URL-format validation.

The form owns its validation, pending, failure, success, and cancel lifecycle.
Persistence is an asynchronous submitter passed to the form, so an edit form can
reuse the same behavior without depending on a specific mutation.

Create adapters hold the Apollo work: call the generated operation, check the
returned identifier, evict affected cache data only after success, then hand the
route outcome to the screen. They do not put Apollo state into the reusable
form.

Validate every field in one pass so all errors can appear together. Show each
validation error beside its field, focus the first invalid field after a failed
submit, and clear only the error for a field that changes. While a save is
pending, mark the form busy and disable every control. Put a safe, actionable
failure alert above the fields; preserve the draft and clear that alert when the
person edits any field.

Test the draft factory, validator, and serializer as plain TypeScript, including
optional blank-to-`null` behavior, numeric boundaries, duration grammar, and
minutes-to-milliseconds conversion. Test the form with user interactions and
accessible roles, labels, all field errors, scoped error clearing, focus, and
pending state. Test Apollo adapters with the real in-memory cache and mock link
to cover their payload, success-only eviction, and malformed or failed replies.
