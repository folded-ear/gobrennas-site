import PlanAvatar from "@/components/plan-avatar";
import { NavLink } from "@/components/sidebar/nav-link";
import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import {
  PlanNavLinkFragment,
  PlanNavLinkFragmentDoc,
} from "./__generated__/planNavLink.generated";

type PlanNavLinkProps = {
  plan: FragmentType<PlanNavLinkFragment>;
  isActive: boolean;
  isCollapsed: boolean;
  onSelect: () => void;
};

export function PlanNavLink({
  plan,
  isActive,
  isCollapsed,
  onSelect,
}: PlanNavLinkProps) {
  const { data, complete } = useFragment({
    fragment: PlanNavLinkFragmentDoc,
    from: plan,
  });

  if (!complete) return null;

  return (
    <NavLink href="/planner" isActive={isActive} onClick={onSelect}>
      <PlanAvatar plan={{ name: data.name, color: data.color }} size="sm" />
      {!isCollapsed && <span>{data.name}</span>}
    </NavLink>
  );
}
