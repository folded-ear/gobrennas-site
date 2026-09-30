import {
  soupPhoto,
  stubPhotoBrowser,
} from "@/features/recipe-photo-editor/test/browser";
import { act, cleanup, render, screen, userEvent, waitFor } from "@/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateRecipeDocument } from "./__generated__/createRecipe.generated";
import { RecipeLabelSuggestionsDocument } from "./__generated__/recipeLabelSuggestions.generated";
import { RecipePhotoUploadDocument } from "./__generated__/recipePhotoUpload.generated";
import { CreateRecipeForm } from "./create-recipe-form";

const labels = {
  request: { query: RecipeLabelSuggestionsDocument },
  maxUsageCount: 2,
  result: { data: { labels: { __typename: "LabelsQuery", all: [] } } },
};
function scratch(filename: string) {
  return {
    request: {
      query: RecipePhotoUploadDocument,
      variables: { contentType: "image/jpeg", originalFilename: "soup.jpg" },
    },
    result: {
      data: {
        profile: {
          __typename: "ProfileQuery",
          scratchFile: {
            __typename: "ScratchUpload",
            url: `https://photos.example.test/${filename}`,
            filename,
            contentType: "image/jpeg",
            cacheControl: "max-age=31536000",
          },
        },
      },
    },
  };
}
function createRequest(filename: string) {
  return {
    query: CreateRecipeDocument,
    variables: {
      info: {
        type: "Recipe",
        name: "Lentil soup",
        externalUrl: null,
        yield: null,
        totalTime: null,
        calories: null,
        directions: "",
        labels: [],
        ingredients: [],
        sections: [],
        photo: filename,
        photoFocus: [0.51, 0.5],
      },
    },
  };
}
const success = {
  data: {
    library: {
      __typename: "LibraryMutation",
      createRecipe: { __typename: "Recipe", id: "lentil-soup" },
    },
  },
};

describe("creating a recipe with a photo", () => {
  let browser: ReturnType<typeof stubPhotoBrowser>;
  beforeEach(() => {
    browser = stubPhotoBrowser();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("uploads directly to storage and saves the scratch filename and chosen focus with the recipe", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(<CreateRecipeForm onCreated={onCreated} onCancel={() => {}} />, {
      mocks: [
        labels,
        scratch("scratch/soup.jpg"),
        { request: createRequest("scratch/soup.jpg"), result: success },
      ],
    });
    await user.type(
      screen.getByRole("textbox", { name: "Title" }),
      "Lentil soup",
    );
    await user.upload(screen.getByLabelText("Recipe photo"), soupPhoto());
    await waitFor(() => expect(browser.requests).toHaveLength(1));
    expect(screen.getByRole("button", { name: "Save recipe" })).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: "Title" }), "{Enter}");
    expect(onCreated).not.toHaveBeenCalled();
    act(() => browser.requests[0].respond());
    screen.getByRole("button", { name: "Photo focus" }).focus();
    await user.keyboard("{ArrowRight}");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("lentil-soup"));
    expect(browser.requests[0].body?.name).toBe("soup.jpg");
  });

  it("preserves the draft and focus through an upload failure and a save failure, requesting fresh uploads for retries", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(<CreateRecipeForm onCreated={onCreated} onCancel={() => {}} />, {
      mocks: [
        labels,
        scratch("scratch/first.jpg"),
        scratch("scratch/second.jpg"),
        scratch("scratch/third.jpg"),
        {
          request: createRequest("scratch/second.jpg"),
          error: new Error("Database unavailable"),
        },
        { request: createRequest("scratch/third.jpg"), result: success },
      ],
    });
    await user.type(
      screen.getByRole("textbox", { name: "Title" }),
      "Lentil soup",
    );
    await user.upload(screen.getByLabelText("Recipe photo"), soupPhoto());
    await waitFor(() => expect(browser.requests).toHaveLength(1));
    screen.getByRole("button", { name: "Photo focus" }).focus();
    await user.keyboard("{ArrowRight}");
    act(() => browser.requests[0].respond(403));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Photo upload failed",
    );
    await user.click(
      screen.getByRole("button", { name: "Retry photo upload" }),
    );
    await waitFor(() => expect(browser.requests).toHaveLength(2));
    act(() => browser.requests[1].respond());
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    expect(await screen.findByText("Couldn’t save recipe")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
      "Lentil soup",
    );
    expect(
      screen.getByRole("img", { name: "Narrow crop preview" }),
    ).toHaveStyle({
      objectPosition: "51% 50%",
    });
    expect(screen.getByRole("button", { name: "Save recipe" })).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Retry photo upload" }),
    );
    await waitFor(() => expect(browser.requests).toHaveLength(3));
    act(() => browser.requests[2].respond());
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("lentil-soup"));
    expect(browser.requests.map((request) => request.url)).toEqual([
      "https://photos.example.test/scratch/first.jpg",
      "https://photos.example.test/scratch/second.jpg",
      "https://photos.example.test/scratch/third.jpg",
    ]);
  });
});
