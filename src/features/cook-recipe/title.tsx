import { RecipePhoto } from "@/features/recipe-photo";
import { Button, Modal } from "@heroui/react";
import type { buildCookRecipe } from "./model";

type Props = {
  recipe: NonNullable<ReturnType<typeof buildCookRecipe>>;
  planName: string;
};

export function CookRecipeTitle({ recipe: { main }, planName }: Props) {
  const source =
    main.item.ingredient?.__typename === "Recipe"
      ? main.item.ingredient
      : undefined;
  // Only independent recipes carry a serving multiplier. Linked subrecipes
  // measure their use by their aggregate, even after being moved.
  const scale =
    main.item.aggregate === null && main.item.quantity?.units === null
      ? main.item.quantity.quantity
      : 1;

  return (
    <div className="flex min-w-0 items-center gap-md">
      {source?.photo ? (
        <Modal>
          <Button
            aria-label={`View photo of ${main.title}`}
            variant="tertiary"
            className="relative size-12 min-w-12 shrink-0 overflow-hidden rounded-lg p-0"
          >
            <RecipePhoto recipe={source} loading="eager" sizes="48px" />
          </Button>
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog className="sm:max-w-xl">
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>{main.title}</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
                    <RecipePhoto
                      recipe={source}
                      sizes="(min-width: 640px) 576px, 100vw"
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                </Modal.Body>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ) : null}
      <div className="min-w-0">
        <p className="text-sm text-muted">{planName}</p>
        <h1 className="break-words">{main.title}</h1>
        {source?.yield != null ? (
          <p className="text-sm text-muted">{source.yield * scale} servings</p>
        ) : null}
      </div>
    </div>
  );
}
