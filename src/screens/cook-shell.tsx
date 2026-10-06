"use client";

import { CookRecipe } from "@/features/cook-recipe";
import type {
  CookRecipeContent,
  CookSection,
} from "@/features/cook-recipe/model";
import { RecipeActionBar } from "@/features/recipe-detail/action-bar";
import { PLANNER_PATH } from "@/lib/routes";
import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

type CookShellProps = {
  title: ReactNode;
  /** Set in my action bar, before Close. */
  actions?: ReactNode;
  recipe: CookRecipeContent;
  /** Set at the far end of a section's heading row. */
  sectionActions?: (section: CookSection) => ReactNode;
};

/** I lay out a cook view: an action bar over the scrolling recipe. */
export function CookShell({
  title,
  actions,
  recipe,
  sectionActions,
}: CookShellProps) {
  const router = useRouter();
  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] w-full max-w-5xl flex-col px-md">
      <RecipeActionBar title={title} onClose={() => router.back()}>
        {actions}
      </RecipeActionBar>
      <article
        aria-label={recipe.main.title}
        className="min-h-0 flex-1 overflow-y-auto py-md"
      >
        <CookRecipe recipe={recipe} sectionActions={sectionActions} />
      </article>
    </div>
  );
}

type CookUnavailableProps = {
  heading: string;
  message: string;
};

/** I stand in for a cook view with nothing to show, offering the planner. */
export function CookUnavailable({ heading, message }: CookUnavailableProps) {
  const router = useRouter();
  return (
    <div className="p-xl">
      <h1>{heading}</h1>
      <p className="my-md">{message}</p>
      <Button onPress={() => router.replace(PLANNER_PATH)}>
        Back to planner
      </Button>
    </div>
  );
}
