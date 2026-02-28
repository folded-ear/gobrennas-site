import { SendToPlan as Icon } from "@/components/ui/icons";
import { gql } from "@apollo/client";
import { useFragment, useMutation } from "@apollo/client/react";
import { Button, Spinner } from "@heroui/react";
import { DoSendToPlanDocument } from "./__generated__/doSendToPlan.generated";
import { SendToPlanFragmentDoc } from "./__generated__/sendToPlan.generated";

type SendToPlanProps = {
  recipeId: string;
  activePlanId: string;
};

export function SendToPlan({ recipeId, activePlanId }: SendToPlanProps) {
  const { data, complete } = useFragment({
    fragment: SendToPlanFragmentDoc,
    variables: { activePlanId },
    from: "ROOT_QUERY",
  });
  const [sendToPlan, { loading }] = useMutation(DoSendToPlanDocument);
  if (!complete) return null;
  const plan = data.planner.plan;
  return (
    <Button
      isPending={loading}
      onPress={() =>
        sendToPlan({
          variables: {
            recipeId,
            planId: activePlanId,
          },
        })
      }
    >
      {({ isPending }) => (
        <>
          {isPending ? <Spinner color="current" size="sm" /> : <Icon />}
          {isPending ? "Sending..." : plan.name}
        </>
      )}
    </Button>
  );
}
