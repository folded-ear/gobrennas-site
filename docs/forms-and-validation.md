# Forms and validation

Reference implementation: [`src/features/recipe-form/`](../src/features/recipe-form/),
wired up at `/recipes/new`. Read it alongside this doc — it's a real form with
nested, repeating state, not a toy example.

## Form approach: controlled state + HeroUI's native fields

Forms are built from HeroUI's field primitives (`Form`, `TextField`,
`TextArea`, `Label`, `Input`, `FieldError`), which are themselves
[React Aria Components](https://react-spectrum.adobe.com/react-aria/forms.html)
under the hood. Field values live in a single state object per form; each
field is fully controlled (`value` + `onChange` on the `TextField`/
`TextArea` itself, not on a nested `Input`).

**We do not use React Hook Form (or similar).** React Aria's `Form` already
handles the parts a form library usually earns its keep on — `aria-invalid`,
focus management, and associating an error message with its field via
`FieldError`. Layering RHF on top would mean wrapping every HeroUI field in
`Controller` (RAC fields aren't native `<input>`s RHF can `register`
directly) for no real gain at this app's scale.

## Three layers

Complex forms are split into three layers so the fiddliest parts — a widget
with its own async behavior, and deeply nested draft state — can change
independently.

| Layer | Example | Owns |
|---|---|---|
| Generic form | [`useDraftForm`](../src/hooks/use-draft-form/index.ts) | Draft object, Zod validation, submit lifecycle |
| Domain draft | [`useRecipeDraft`](../src/features/recipe-form/use-recipe-draft.ts) | Semantic operations over one feature's shape |
| Widgets | [`ingredient-row.tsx`](../src/features/recipe-form/ingredient-row.tsx) | Their own local/ephemeral state, behind a narrow interface |

### Layer 1 — `useDraftForm`

```ts
const form = useDraftForm({
  schema: recipeFormSchema,
  initialValues: emptyRecipeFormValues, // a factory, if the draft has generated ids
  onValid: async (recipe) => { /* ...submit... */ },
});
```

It owns `values`, `setField`/`setValues`, `fieldErrors`, `submitError`,
`isSubmitting`, `handleSubmit`, and `validateThen`.

**The hook owns the submit lifecycle, not the mutation.** `onValid` may return
a promise; the hook awaits it, holds `isSubmitting` for the whole span, and
catches a rejection into `submitError`. Bind the submit button to
`isSubmitting` rather than a mutation's `loading` — a save is often more than
one round trip (uploading a photo before the mutation runs), and `loading`
only covers the last leg of it. Use `validateThen(fn)` for alternate submit
actions that share validation, like Save as Copy.

**Keep it generic and small.** It has no array or path helpers: there's one
level of nesting and one domain that needs them, which doesn't justify a
generic path-lens. Put that in layer 2 instead.

### Layer 2 — the domain draft hook

Ingredients appear in two places with identical UI — on the recipe, and on
each owned section. Rather than duplicating a section-flavored copy of every
operation, they're parameterized by scope:

```ts
type IngredientScope = { kind: "recipe" } | { kind: "section"; index: number };
```

`useRecipeDraft` wraps `useDraftForm` and adds `addIngredient(scope, afterIdx?)`,
`removeIngredient`, `moveIngredient`, `setIngredient`, `pasteIngredients`,
`addOwnedSection`, `removeSection`, `setSectionField`. It's pure state logic —
unit-testable with `renderHook` and no rendering.

`<IngredientRows>` then takes `{ draft, scope }` and is used **verbatim** at
both levels; the two call sites differ only in `scope`.

The dotted field names React Aria matches errors against are built by
`sectionFieldName` / `ingredientFieldName` in that same module, so the strings
exist in exactly one place. They have to line up with the paths Zod reports and
nothing checks that for you.

### Layer 3 — widgets own their own complexity

A widget's props are the seam that lets its internals change without
disturbing the layers above. `<IngredientRow>` is raw-text-only today, but its
interface is already the one the server-recognition version needs:

```ts
{ value, onChange, onPressEnter, onDelete, onMultilinePaste, placeholder }
```

**The draft holds what gets saved, and nothing else.** Ephemeral widget state —
in-flight recognition results, suggestion lists, upload progress — stays local
to the widget.

## Validation library: Zod

Each form owns one schema, colocated with its component, exporting the inferred
type as the form's value type. Model variants as a **discriminated union** so
conditional rules fall out of the model instead of an imperative check at
submit time:

```ts
export const sectionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("owned"),
    name: z.string().trim().min(1, "A section title is required."),
    // ...
  }),
  z.object({ kind: z.literal("reference"), id: z.string() /* ... */ }),
]);
```

A reference section has nothing editable, so the required-title rule simply
never reaches it. (The legacy client did this with a loop in `handleSave`.)

### Identity: `clientId` is separate from `id`

Repeating rows need a stable key and drag identity before they have a server
id. Keep those as two fields — `clientId` (always present, never sent) and `id`
(the server id, or `null` when unsaved) — rather than stuffing sentinel values
into `id` and having to detect them again at serialization time. Generate one
with `rand_chars` from [`src/lib/entropy.ts`](../src/lib/entropy.ts).

Because a blank draft now contains generated ids, `initialValues` is a
**factory**, not a constant — otherwise every form instance and every test
would share one set of ids.

### Serialization is a hand-written mapping

Codegen doesn't produce Zod schemas from `schema.graphql`, and GraphQL input
types are a poor match for form state anyway. Map validated values into the
mutation's input type in one place — see
[`to-ingredient-info.ts`](../src/features/recipe-form/to-ingredient-info.ts).
That's also where client-only fields get dropped, blank rows filtered, and
constants the mutation needs but the user never sets get filled in.

## Client vs. server validation

Validate on the client with the Zod schema before calling the mutation — that's
the only validation that runs today. The API enforces required fields via
GraphQL's `NonNull` (`!`) markers only; there's no field-level validation error
reporting on the backend (no Bean Validation, no `field` key in error
`extensions`), so a GraphQL error can't be mapped back to a specific field.
Treat any mutation failure as a form-level error rather than guessing which
field it belongs to.

If the API later starts returning field-level errors, merge them into the same
`fieldErrors` map — that's the extension point, and it needs no restructuring.

## Error display: inline for fields, a banner for everything else

Pass `fieldErrors` straight to `Form`'s `validationErrors` prop and give each
field a bare `<FieldError />`. React Aria matches errors to fields **by
`name`**, including dotted paths, so a nested `<TextField
name="sections.2.name">` gets its error with no per-field wiring:

```tsx
<Form validationBehavior="aria" validationErrors={fieldErrors} onSubmit={handleSubmit}>
  <TextField name="name" isRequired value={values.name} onChange={(v) => setField("name", v)}>
    <Label>Title</Label>
    <Input />
    <FieldError />
  </TextField>
</Form>
```

Form-level errors (the mutation failed — network error, server exception,
anything not tied to a field) render as an `Alert status="danger"` above the
fields, from `submitError`.

Errors only populate on submit, so nothing shows before the user's first
attempt; React Aria then clears a field's error as soon as its value changes.

## Submit button state

Pass `isSubmitting` to the button's `isPending` prop and use the render-prop
form of `Button`'s children to swap the label while pending. RAC's `Button`
treats `isPending` as non-interactive on its own — no separate `isDisabled`.

```tsx
<Button type="submit" isPending={isSubmitting}>
  {({ isPending }) => (
    <>
      {isPending && <Spinner color="current" size="sm" />}
      {isPending ? "Saving..." : "Save"}
    </>
  )}
</Button>
```

Leave Cancel enabled while submitting — it's a local navigation with no server
state to protect.

## Testing

There's no live-API path in local dev without running the API and completing
OAuth, so forms can't be exercised by hand — tests are the verification.

- **Pure logic** (draft operations, schemas, serialization) as plain `.ts`
  tests; use `renderHook` + `act` for the draft hook. Vitest picks up both
  `*.test.ts` and `*.test.tsx`.
- **Components** with Testing Library and Apollo's `MockedProvider`
  (`@apollo/client/testing/react`).

When asserting a validation error, check it's attached to the **right field**,
not merely present on the page — resolve the input's `aria-describedby` and
assert on that text. With nested paths, "an error rendered somewhere" is a much
weaker claim than it looks; see
[`index.test.tsx`](../src/features/recipe-form/index.test.tsx).
