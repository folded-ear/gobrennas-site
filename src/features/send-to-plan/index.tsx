import { SendToPlanIcon } from "@/components/icons";
import { useFragment, useMutation } from "@apollo/client/react";
import { Button, ButtonProps, Spinner } from "@heroui/react";
import { DoSendToPlanDocument } from "./__generated__/doSendToPlan.generated";
import { SendToPlanFragmentDoc } from "./__generated__/sendToPlan.generated";

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

  const [sendToPlan, { loading }] = useMutation(DoSendToPlanDocument);

  if (!complete) return null;

  const plan = data.planner.plan;
  return (
    <Button
      {...rest}
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
