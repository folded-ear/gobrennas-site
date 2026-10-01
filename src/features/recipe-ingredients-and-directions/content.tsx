import { useId, type ReactNode } from "react";

export type RecipeIngredient = {
  text: string;
  quantity?: number;
  unit?: string;
  name?: string;
  preparation?: string;
};

/** Morsel's text treatment, without editor behavior or focus targets. */
export function IngredientRefText({
  text,
  quantity,
  unit,
  name,
  preparation,
}: RecipeIngredient) {
  return (
    <span className="morsel-text">
      {quantity !== undefined ? (
        <>
          <span className="morsel-quantity">{quantity}</span>{" "}
        </>
      ) : null}
      {unit ? (
        <>
          <span className="morsel-unit">{unit}</span>{" "}
        </>
      ) : null}
      {name ? <span className="morsel-ingredient">{name}</span> : text}
      {name && preparation ? `, ${preparation}` : null}
    </span>
  );
}

type ContentProps = {
  ingredients: readonly RecipeIngredient[];
  directions?: string | null;
  headingLevel?: 2 | 3;
  ingredientHeader?: ReactNode;
};

/** Recipe content shared by reading and cooking views, independent of its source. */
export function RecipeContent({
  ingredients,
  directions,
  headingLevel = 2,
  ingredientHeader,
}: ContentProps) {
  return (
    <div className="grid gap-lg md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="flex min-w-0 flex-col gap-lg">
        {ingredientHeader}
        <IngredientList ingredients={ingredients} headingLevel={headingLevel} />
      </div>
      <Directions text={directions} headingLevel={headingLevel} />
    </div>
  );
}

export function IngredientList({
  ingredients,
  headingLevel = 2,
}: Pick<ContentProps, "ingredients" | "headingLevel">) {
  const id = useId();
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section aria-labelledby={id} className="min-w-0">
      <Heading id={id} className="mb-sm text-xl">
        Ingredients
      </Heading>
      {ingredients.length > 0 ? (
        <ul className="divide-y divide-separator">
          {ingredients.map((ingredient, index) => (
            <li
              key={index}
              className="whitespace-pre-wrap break-words py-sm leading-normal"
            >
              <IngredientRefText {...ingredient} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">No ingredients listed.</p>
      )}
    </section>
  );
}

export function Directions({
  text,
  headingLevel = 2,
}: {
  text?: string | null;
  headingLevel?: 2 | 3;
}) {
  const id = useId();
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section aria-labelledby={id} className="min-w-0">
      <Heading id={id} className="mb-sm text-xl">
        Directions
      </Heading>
      {text?.trim() ? (
        <div className="whitespace-pre-wrap break-words leading-normal">
          {text}
        </div>
      ) : (
        <p className="text-muted">No directions provided.</p>
      )}
    </section>
  );
}

export function RecipeSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="border-t border-separator pt-lg">
      <h2 id={id} className="mb-md">
        {title}
      </h2>
      {children}
    </section>
  );
}
