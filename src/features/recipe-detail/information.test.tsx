import { render, screen } from "@/test";
import { describe, expect, it } from "vitest";
import { RecipeInformation } from "./information";

describe("RecipeInformation", () => {
  it.each(["javascript:alert(1)", "Grandma’s notebook"])(
    "keeps %s readable without creating an unsafe link",
    (source) => {
      render(
        <RecipeInformation
          externalUrl={source}
          yield={null}
          totalTime={0}
          calories={0}
          labels={null}
        />,
      );
      expect(screen.getByText(source)).toBeVisible();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.getByText("0 min")).toBeVisible();
      expect(screen.getByText("0")).toBeVisible();
    },
  );
});
