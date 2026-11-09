import { DoSetPreferenceDocument } from "@/hooks/use-set-preference/__generated__/doSetPreference.generated";
import { getClient } from "@/lib/apollo-rsc";
import { PREF_PLANNER_PLANS } from "@/lib/preferences";
import { redirect, RedirectType } from "next/navigation";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/plan/[planId]">,
) {
  const { planId } = await ctx.params;
  const client = await getClient();
  await client.mutate({
    mutation: DoSetPreferenceDocument,
    variables: { name: PREF_PLANNER_PLANS, value: JSON.stringify([planId]) },
  });
  redirect("/planner", RedirectType.replace);
}
