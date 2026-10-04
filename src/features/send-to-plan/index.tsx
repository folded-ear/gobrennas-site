import { SendToPlanIcon } from "@/components/icons";
import { useFragment } from "@apollo/client/react";
import { Button, ButtonProps, Spinner } from "@heroui/react";
import { SendToPlanFragmentDoc } from "./__generated__/sendToPlan.generated";
import { useSendRecipeToPlan } from "./use-send-recipe-to-plan";

type SendToPlanProps = ButtonProps & {
  recipeId: string;
  activePlanId: string;
};

export function SendToPlan({
  recipeId,
  activePlanId,
  ...rest
}: SendToPlanProps) {
  const { data, complete } = useFragment({
    fragment: SendToPlanFragmentDoc,
    variables: { activePlanId },
    from: "ROOT_QUERY",
  });

  const { send, sending } = useSendRecipeToPlan();

  if (!complete) return null;

  const plan = data.planner.plan;
  return (
    <Button
      {...rest}
      isPending={sending}
      onPress={() => {
        void send(recipeId, plan);
      }}
    >
      {({ isPending }) => (
        <>
          {isPending ? (
            <Spinner color="current" size="sm" />
          ) : (
            <SendToPlanIcon />
          )}
          {isPending ? "Sending..." : plan.name}
        </>
      )}
    </Button>
  );
}
