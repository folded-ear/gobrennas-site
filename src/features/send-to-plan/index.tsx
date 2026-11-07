import { ControlTooltip } from "@/components/control-tooltip";
import { SendToPlanIcon } from "@/components/icons";
import {
  groupPlans,
  PlanOption,
  VIEW_ONLY_HINT,
} from "@/components/plan-option";
import { usePreference } from "@/hooks/use-preference";
import { resolveSelection } from "@/lib/plan-selection";
import { canChangePlan } from "@/lib/plans";
import { PREF_ACTIVE_PLAN } from "@/lib/preferences";
import { useFragment } from "@apollo/client/react";
import {
  Button,
  buttonGroupVariants,
  ButtonProps,
  Dropdown,
  Header,
  Separator,
  Spinner,
} from "@heroui/react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { Fragment } from "react";
import { SendToPlanFragmentDoc } from "./__generated__/sendToPlan.generated";
import { useSendRecipeToPlan } from "./use-send-recipe-to-plan";

type SendToPlanProps = ButtonProps & {
  recipeId: string;
  /** Whether I also offer a menu for sending to any plan, once. */
  choosable?: boolean;
};

/**
 * I send a recipe to the active plan, named on my face. When choosable, my
 * menu sends it to any plan instead, without changing which plan is active.
 * A view-only plan can't be sent to, and I say so.
 */
export function SendToPlan({
  recipeId,
  choosable = false,
  className,
  ...rest
}: SendToPlanProps) {
  const stored = usePreference(PREF_ACTIVE_PLAN);
  const { data, complete } = useFragment({
    fragment: SendToPlanFragmentDoc,
    from: "ROOT_QUERY",
  });
  const { send, sending } = useSendRecipeToPlan();

  if (!complete) return null;

  const plans = data.planner.plans;
  const [activeId] = resolveSelection(stored ? [stored] : [], plans, "single");
  const plan = plans.find((it) => it.id === activeId);
  if (!plan) return null;
  const viewOnly = !canChangePlan(plan);

  const main = (
    <Button
      {...rest}
      aria-disabled={viewOnly || undefined}
      // HeroUI drops pointer events when aria-disabled; hover must reach the tooltip.
      className={clsx(viewOnly && "pointer-events-auto", className)}
      isPending={sending}
      onPress={() => {
        if (!viewOnly) void send(recipeId, plan);
      }}
    >
      {({ isPending }) => (
        <>
          {isPending ? (
            <Spinner color="current" size="sm" />
          ) : (
            <SendToPlanIcon />
          )}
          <span className="max-w-(--send-to-plan-name-width) truncate">
            {isPending ? "Sending..." : plan.name}
          </span>
        </>
      )}
    </Button>
  );
  const hinted = viewOnly ? (
    <ControlTooltip label={VIEW_ONLY_HINT}>{main}</ControlTooltip>
  ) : (
    main
  );
  if (!choosable) return hinted;

  return (
    // HeroUI's ButtonGroup marks only direct children, and mine are wrapped.
    <div
      role="group"
      aria-label="Send to a plan"
      className={buttonGroupVariants({ orientation: "horizontal" }).base()}
    >
      {hinted}
      <Dropdown>
        <Button
          isIconOnly
          variant={rest.variant}
          size={rest.size}
          aria-label="Choose a plan"
        >
          <ChevronDown size={16} aria-hidden />
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu>
            {groupPlans(plans).map((group, i) => (
              <Fragment key={group.title}>
                {i > 0 ? <Separator /> : null}
                <Dropdown.Section>
                  <Header>{group.title}</Header>
                  {group.plans.map((it) => (
                    <Dropdown.Item
                      key={it.id}
                      id={it.id}
                      textValue={it.name}
                      aria-label={it.name}
                      isDisabled={!canChangePlan(it)}
                      onAction={() => {
                        void send(recipeId, it);
                      }}
                    >
                      {({ isDisabled }) => (
                        <PlanOption plan={it} disabled={isDisabled} />
                      )}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Section>
              </Fragment>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}
