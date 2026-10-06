import { PlanItemStatus } from "@/__generated__/graphql";
import {
  buildPlanDirectory,
  PlanDirectoryProvider,
} from "@/features/plan-directory";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "@/features/plan-item/__generated__/planItem.generated";
import {
  buildInMemoryCache,
  render,
  screen,
  seedFragment,
  userEvent,
  within,
} from "@/test";
import { describe, expect, it, vi } from "vitest";
import { BucketSection, UnplannedSection } from "./bucket-section";
import {
  PlanItemNode,
  TimelineBucketSection,
  TimelineItem,
  TimelineUnplanned,
} from "./model";

const PIE = { id: "42", name: "Pumpkin pie" };

const DIRECTORY = buildPlanDirectory([
  {
    id: "7",
    name: "Holidays",
    color: "#F57F17",
    mine: true,
    grants: [],
    descendants: [],
    buckets: [{ id: "b1" }],
  },
]);

function node({ id, name }: { id: string; name: string }): PlanItemNode {
  const item: TimelineItem = {
    __typename: "PlanItem",
    id,
    name,
    bucket: null,
    children: [],
  };
  return { item, children: [] };
}

function fragment({
  id,
  name,
}: {
  id: string;
  name: string;
}): PlanItemFragment {
  return {
    __typename: "PlanItem",
    id,
    name,
    status: PlanItemStatus.NEEDED,
    notes: null,
    preparation: null,
    parent: { __typename: "Plan", id: "7" },
    aggregate: null,
    ingredient: null,
    quantity: null,
    components: [],
    bucket: null,
  };
}

function bucket(
  overrides: Partial<TimelineBucketSection> = {},
): TimelineBucketSection {
  return {
    kind: "bucket",
    key: "bucket:lunch@",
    bucketIds: ["b1"],
    name: "Lunch",
    date: null,
    roots: [],
    ...overrides,
  };
}

function renderBucket(
  overrides: Partial<TimelineBucketSection> = {},
  onSelect?: (id: string) => void,
) {
  const cache = buildInMemoryCache();
  seedFragment(cache, PlanItemFragmentDoc, "planItem", fragment(PIE));
  return render(
    <PlanDirectoryProvider directory={DIRECTORY}>
      <ol>
        <BucketSection
          bucket={bucket(overrides)}
          context={new Map()}
          onSelect={onSelect}
        />
      </ol>
    </PlanDirectoryProvider>,
    { cache },
  );
}

describe("BucketSection", () => {
  it("labels itself with just the bucket's name when it has no date", () => {
    renderBucket({ name: "Grocery list", date: null });

    expect(screen.getByRole("heading", { name: "Grocery list" })).toBeVisible();
  });

  it("labels itself with the bucket's name and date when it has one", () => {
    renderBucket({ name: "Lunch", date: "2026-09-14" });

    expect(
      screen.getByRole("heading", { name: /^Lunch – .*Sep 14/ }),
    ).toBeVisible();
  });

  it("shows the items it holds", () => {
    renderBucket({ roots: [node(PIE)] });

    expect(screen.getByText("Pumpkin pie")).toBeVisible();
  });

  it("shows no item list when it holds nothing", () => {
    renderBucket();

    const section = screen.getByRole("listitem");
    expect(within(section).queryByRole("list")).toBeNull();
  });

  it("passes a chosen item up", async () => {
    const onSelect = vi.fn();
    renderBucket({ roots: [node(PIE)] }, onSelect);

    await userEvent.click(screen.getByRole("button", { name: "Pumpkin pie" }));

    expect(onSelect).toHaveBeenCalledWith("42");
  });

  it("links to cooking everything it holds", () => {
    renderBucket({ roots: [node(PIE)] });

    expect(screen.getByRole("link", { name: "Cook Lunch" })).toBeVisible();
  });

  it("offers nothing to cook when it holds nothing", () => {
    renderBucket();

    expect(screen.queryByRole("link", { name: "Cook Lunch" })).toBeNull();
  });
});

function unplanned(roots: readonly PlanItemNode[] = []): TimelineUnplanned {
  return { kind: "unplanned", roots };
}

function renderUnplanned(
  roots: readonly PlanItemNode[] = [],
  onSelect?: (id: string) => void,
) {
  const cache = buildInMemoryCache();
  seedFragment(cache, PlanItemFragmentDoc, "planItem", fragment(PIE));
  return render(
    <ol>
      <UnplannedSection
        unplanned={unplanned(roots)}
        context={new Map()}
        onSelect={onSelect}
      />
    </ol>,
    { cache },
  );
}

describe("UnplannedSection", () => {
  it("labels itself Unplanned", () => {
    renderUnplanned();

    expect(screen.getByRole("heading", { name: "Unplanned" })).toBeVisible();
  });

  it("shows the items it holds", () => {
    renderUnplanned([node(PIE)]);

    expect(screen.getByText("Pumpkin pie")).toBeVisible();
  });

  it("shows no item list when it holds nothing", () => {
    renderUnplanned();

    const section = screen.getByRole("listitem");
    expect(within(section).queryByRole("list")).toBeNull();
  });

  it("passes a chosen item up", async () => {
    const onSelect = vi.fn();
    renderUnplanned([node(PIE)], onSelect);

    await userEvent.click(screen.getByRole("button", { name: "Pumpkin pie" }));

    expect(onSelect).toHaveBeenCalledWith("42");
  });

  it("offers nothing to cook", () => {
    renderUnplanned([node(PIE)]);

    expect(screen.queryByRole("link", { name: /^Cook / })).toBeNull();
  });
});
