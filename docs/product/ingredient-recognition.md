# Ingredient recognition

State: Agreed  
Delivery: Built

## Purpose

Help people enter ingredients by recognizing quantities, units, and
ingredients while keeping their original text editable.

## Where it's used

Morsel is the ingredient editor that does this.

- Recipe editors use it for every ingredient row, with suggestions.
- The planner's timeline Add control uses it with suggestions. Choosing a
  pantry item or section keeps that choice on the new item; choosing a recipe
  adds it as send to plan does, ingredients included.
- Existing leaf rows in a planner item's detail use it for recognition only,
  without suggestions. Resting rows reuse its highlights on their original
  text.
- Shopping does not use it.

## Behavior

- Recognition follows a brief pause in editing. It preserves entered text,
  row order, focus, and selection. Very short or blank rows are not
  recognized.
- A leading `!` skips recognition in planner entries, such as tentative meal
  ideas. Recipe ingredients have no way to skip it.
- Recognition appears inline: quantity has a light gray background, unit has a
  muted dotted underline, and ingredient is black with a subtle bold (white in
  dark mode). Ordinary text stays dark gray. It stays readable as normal text,
  even across a full planner.
- Accessible summaries identify Quantity, Unit, Ingredient, and Preparation,
  including new units and ingredients.
- An unrecognized ingredient is informational and does not prevent saving.
- Pasted rows appear immediately and are recognized in the background. The
  row being edited takes priority over waiting pasted rows.
- Opening a saved recipe recognizes its ingredient rows, including owned
  section rows, in the background without moving focus or opening
  suggestions. These highlights do not replace saved ingredient data until
  the person edits the row.
- Editing text clears recognition derived from the previous text. A late
  response cannot restore outdated ingredient details or suggestions.
- A small spinner inside the input shows recognition is pending, without
  shifting text or rows. Loading and failures do not block editing. A failed
  row shows non-blocking feedback and offers retry; other rows keep their
  results.
- Saving does not wait for recognition. It keeps populated raw rows and
  includes recognized details that match the current text. Blank rows are
  omitted. Results arriving after submission do not change that save.

## Suggestions

- Suggestions belong to the cursor position. Choosing one replaces only its
  indicated text range. Editing or moving the cursor makes old suggestions
  unavailable; leaving a row hides them.
- Only ingredients are suggested, not units. Candidates are grouped under
  **Pantry item**, **Recipe**, and **Section**, omitting empty groups.
  Distinct items with the same name stay distinct. A section suggestion shows
  its recipe's name as secondary text.
- Choosing a section makes it one ingredient: an ordinary row referring to
  that section, kept in its position. Its contents are not copied into rows.
- The dropdown is compact: 4px vertical padding per option, 2px per heading,
  readable text, and subtle group separators.
- No option is active automatically. Arrow keys browse; Enter selects the
  active option, or otherwise adds a recipe row. Tab leaves without selecting.
  Escape dismisses, even while a response is pending.
- Choosing an ingredient, or leaving a recognized row, settles its name.
  Returning to the row, moving the cursor, or editing its quantity, unit, or
  preparation keeps the dropdown closed. Editing the name enables suggestions
  again, and Arrow Down opens them explicitly. A response arriving while
  someone is typing does not close their suggestions.
- Pointer selection keeps focus in the editor and places the caret right
  after the inserted name, leaving the text around it unchanged. Names are
  never wrapped in double quotes automatically.
- Undo and redo restore the choice that went with the text. Retyping a
  previously chosen name does not restore that choice. Edits outside the name
  keep the choice; edits to the name release it.
- A chosen recipe or section is kept over a same-name pantry item, through
  recognition and saving.

## The editor

- The input wraps naturally and is about 42px high for one line.
- A browser without CSS Custom Highlights still gets editable plain text.
- If the browser can't insert a chosen suggestion, the editor shows a
  recoverable error instead of losing the text.

## Text conventions and saving

- Paired double quotes mark an ingredient name, including one not yet in the
  library: straight (`"chocolate chips"`), curly (`“chocolate chips”`), or
  guillemets (`«chocolate chips»`). Paired underscores mark a unit
  (`_pinch_`).
- Markers stay in the raw text and the preview. They are stripped from new
  unit and ingredient names when saving. Existing matches save their IDs.
- Quantity text, including fractions, is kept as entered; the numeric value
  from recognition is saved. A unit without a number saves with quantity one.
- Read-only ingredient text built from saved parts, in library recipes, Cook,
  and the shopping list, shows a quantity's fractional part as a fraction
  (`0.5` shows as `½`, `1.0625` as `1 1/16`) when it falls in a range listed in
  `src/lib/fractions.ts`, and other quantities to at most three decimal places.
  A zero quantity shows as a "NO" badge in place of the quantity and unit.
- The planner's resting rows decorate their original wording instead: a
  quantity shows as a fraction the same way, or as written when no fraction
  covers it. Editable Morsel text always shows exactly as entered.
- Preparation is the text left after removing the recognized quantity, unit,
  and ingredient. Its whitespace and redundant commas are tidied for saving;
  the raw text is unchanged.

## Related documents

- [Recipes](recipes.md)
- [How recognition works](../architecture/ingredient-recognition.md)
- [Forms and validation](../forms-and-validation.md)
