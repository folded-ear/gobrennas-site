import { render, screen, userEvent } from "@/test";
import { describe, expect, it, vi } from "vitest";
import { DoSendToPlanDocument } from "./__generated__/doSendToPlan.generated";
import { useSendRecipeToPlan } from "./use-send-recipe-to-plan";

const recipeId = "recipe-1";
const plan = { id: "plan-1", name: "This Week" };

function Probe() {
  const { send } = useSendRecipeToPlan();
  return (
    <button
      onClick={() => {
        void send(recipeId, plan);
        void send(recipeId, plan);
      }}
    >
      Send twice
    </button>
  );
}

describe("useSendRecipeToPlan", () => {
  it("sends once while a send is in flight", async () => {
    const user = userEvent.setup();
    const sent = vi.fn(() => ({
      data: {
        library: {
          __typename: "LibraryMutation" as const,
          sendRecipeToPlan: { __typename: "PlanItem" as const, id: "item-1" },
        },
      },
    }));
    render(<Probe />, {
      mocks: [
        {
          request: {
            query: DoSendToPlanDocument,
            variables: { recipeId, planId: plan.id },
          },
          result: sent,
          maxUsageCount: 2,
        },
      ],
    });

    await user.click(screen.getByRole("button"));

    expect(await screen.findByText("Added to This Week")).toBeVisible();
    expect(sent).toHaveBeenCalledTimes(1);
  });
});
