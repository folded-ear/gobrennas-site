# Forms and validation

Recipe forms keep their editable state in a browser draft. The draft uses product
field names and starts from a fresh factory value. A pure validator checks it,
and a serializer produces the generated GraphQL input. Keep browser-only rules
out of Apollo and React so they can be tested directly.

The form owns its validation, pending, failure, success, and cancel lifecycle.
Persistence is an asynchronous submitter passed to the form, so an edit form can
reuse the same behavior without depending on a specific mutation.

Create adapters hold the Apollo work: call the generated operation, check the
returned identifier, evict affected cache data only after success, then hand the
route outcome to the screen. They do not put Apollo state into the reusable
form.

Show validation beside its field and focus the first invalid field after a
failed submit. While a save is pending, mark the form busy and disable every
control. Put a safe, actionable failure alert above the fields; preserve the
draft and clear that alert when the person edits either field.

Test the draft factory, validator, and serializer as plain TypeScript. Test the
form with user interactions and accessible roles, labels, errors, focus, and
pending state. Test Apollo adapters with the real in-memory cache and mock link
to cover their payload, success-only eviction, and malformed or failed replies.
