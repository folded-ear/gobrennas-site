import { PlanItemStatus } from "@/__generated__/graphql";
import { RecipeInformation } from "@/features/recipe-detail/information";
import {
  RecipeContent,
  RecipeSection,
} from "@/features/recipe-ingredients-and-directions/content";
import { Button, Disclosure } from "@heroui/react";
import type { ReactNode } from "react";
import type { CookRecipeContent, CookSection } from "./model";

type Props = {
  recipe: CookRecipeContent;
  /** Set at the far end of a section's heading row. Left out, sections carry none. */
  sectionActions?: (section: CookSection) => ReactNode;
};

export function CookRecipe({
  recipe: { main, sections },
  sectionActions,
}: Props) {
  const source =
    main.item?.ingredient?.__typename === "Recipe"
      ? main.item.ingredient
      : undefined;
  const hasDetails =
    source &&
    (source.totalTime !== null ||
      source.calories !== null ||
      Boolean(source.externalUrl?.trim()) ||
      Boolean(source.labels?.length));
  return (
    <div className="flex flex-col gap-lg">
      {hasDetails ? (
        <Disclosure>
          <Disclosure.Heading>
            <Button slot="trigger" variant="tertiary" className="px-sm">
              Recipe details
              <Disclosure.Indicator />
            </Button>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body className="pt-sm pb-xs">
              <RecipeInformation {...source} yield={null} />
            </Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>
      ) : null}
      {main.item?.status === PlanItemStatus.COMPLETED ? (
        <p className="text-muted">Already cooked</p>
      ) : null}
      <RecipeContent
        ingredients={main.ingredients}
        directions={main.directions}
      />
      {sections.map((section) => (
        <RecipeSection
          key={section.item.id}
          title={section.title}
          actions={sectionActions?.(section)}
        >
          {section.item.status === PlanItemStatus.COMPLETED ? (
            <p className="mb-md text-muted">Already prepared</p>
          ) : null}
          <RecipeContent
            headingLevel={3}
            ingredients={section.ingredients}
            directions={section.directions}
          />
        </RecipeSection>
      ))}
    </div>
  );
}
