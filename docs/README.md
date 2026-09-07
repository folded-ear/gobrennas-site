# Project documentation

These documents record what GoBrennas should do, what its main concepts mean,
and how the software is put together. They are kept with the code so changes can
be reviewed and updated together.

## Where things go

- [`product/`](product/) describes behavior that a person using GoBrennas can
  observe. Organize these documents by product area, not by React component or
  API operation.
- [`domain/model.md`](domain/model.md) maps the main product concepts, their
  relationships, and the rules that must hold. It should not copy Java classes,
  GraphQL types, or database tables.
- [`architecture/`](architecture/) describes the current system, including
  application boundaries, data flow, and major tools.
- `architecture/decisions/` records technical or domain decisions whose reasons
  are worth preserving. Create a record after a decision is agreed, not for
  every dependency or small implementation choice.
- [`testing.md`](testing.md) and [`design-tokens.md`](design-tokens.md) contain
  code conventions that apply across features.
- [`templates/`](templates/) contains starting points for new documents.

Put rough ideas and meeting notes somewhere clearly marked as notes. Move an
idea into a product, domain, or decision document once it has been discussed.
Notes are useful history, but they are not requirements.

## State and delivery

Product documents use two labels near the top:

| Label | Values | Meaning |
| --- | --- | --- |
| State | `Draft`, `Agreed`, `Replaced` | Whether the document is still being discussed, is the chosen behavior, or has been superseded |
| Delivery | `Planned`, `Partly built`, `Built` | How closely the current application matches the document |

The domain model uses `State`. Add `Delivery` when the agreed model differs from
the current code.

Decision records use `State: Draft`, `State: Agreed`, or `State: Replaced`.
Architecture documents without a state describe the current implementation and
must be updated when that implementation changes.

If different parts of a document need different states, split the document.
Do not hide a mixture of agreed rules and undecided ideas under one label.

## What is authoritative

- Product behavior and domain rules marked `Agreed` are the intended baseline.
- `schema.graphql` is the source of truth for the current API data model. The
  domain diagrams are its human-readable map.
- `schema.graphql` is also the API reference. Read it directly for operations,
  arguments, return types, and field descriptions. Do not maintain a second
  handwritten version of that information.
- `Delivery: Built` means the code is expected to implement that baseline.
- Drafts, examples under `Open questions`, and working notes are not
  requirements.
- The code and tests show what the application does now. They do not silently
  override an agreed product or domain decision.

When code and an agreed document disagree, call out the difference. Decide
whether to change the code, change the document, or update the delivery label.
Do not quietly rewrite one to match the other.

## Writing rules

Write for the two people planning the product and for someone implementing a
change months later.

- Use the same names the product uses. Define a term under the relevant diagram
  if it is easy to confuse with another term.
- Use plain sentences and concrete verbs. Write "The planner displays selected
  plans," not "The planning experience enables plan orchestration."
- Put agreed behavior in the present tense, even when delivery is still
  planned. The delivery label says whether it is built.
- State rules directly. Follow them with examples when an edge case would
  otherwise be easy to miss.
- Keep user-visible behavior separate from implementation details.
- Link to code rather than copying code into a document. Copied details drift.
- Do not document API operations outside the schema. Write prose only when the
  product rule or the reason for a decision cannot be expressed there.
- Give each rule one authoritative home. Other documents should link to it.
- Keep open questions explicit. An agent must not invent an answer and present
  it as a decision.

## Domain diagrams

Use Mermaid UML class diagrams for the domain model. Mermaid is plain text, so
the diagrams can be reviewed with the rest of a pull request and rendered by
GitHub.

- Show concepts, relationships, and cardinality.
- Include only attributes that matter to the product.
- Do not include methods, storage fields, framework types, or GraphQL details.
- Leave query and mutation containers, pagination types, and input types out of
  the domain model.
- Put rules that the diagram cannot express in a short list below it.
- Use a state diagram for a lifecycle when a class diagram would make the
  transitions hard to understand.
- Add separate diagrams for product areas instead of joining everything into
  one unreadable diagram.

## Updating the documentation

Update the relevant document in the same pull request when a change affects:

- user-visible behavior;
- a domain term, relationship, lifecycle, or rule;
- a system boundary or data flow;
- an agreed technical decision; or
- a convention that future code should follow.

Small implementation details do not need permanent documentation. A useful
test is: would someone reasonably make a different choice without this context?
If yes, write it down.

Start new documents from the [product](templates/product.md),
[domain](templates/domain.md), or [decision](templates/decision.md) template.

## Current documents

### Product

- [Planner](product/planner.md)

### Domain

- [Domain model](domain/model.md)

### Architecture and code conventions

- [Site architecture](architecture/overview.md)
- [Technical stack](architecture/stack.md)
- [Testing conventions](testing.md)
- [Design tokens](design-tokens.md)
