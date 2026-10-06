import { IngredientRefText } from "@/components/ingredient-ref-text";
import type { IngredientParts } from "@/lib/ingredient-parts";
import { useId, type ReactNode } from "react";

type ContentProps = {
  ingredients: readonly IngredientParts[];
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
  actions,
  children,
}: {
  title: string;
  /** Set at the far end of my heading's row. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="border-t border-separator pt-lg">
      {actions ? (
        <div className="mb-md flex flex-wrap items-center gap-sm">
          <h2 id={id}>{title}</h2>
          <div className="ms-auto flex items-center gap-sm">{actions}</div>
        </div>
      ) : (
        <h2 id={id} className="mb-md">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
