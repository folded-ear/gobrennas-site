import { PlanItemStatus } from "@/__generated__/graphql";
import { ApolloClient, ApolloLink, Observable } from "@apollo/client";
import { LocalState } from "@apollo/client/local-state";
import { beforeEach, describe, expect, it } from "vitest";
import { StatusChange } from "./queue";
import { aliasedSender } from "./send";
import { readStatus, seededCache, THANKSGIVING } from "./test/status-cache";

type Request = {
  readonly variables: Record<string, unknown>;
  readonly keepalive: unknown;
};

const PUMPKIN: StatusChange = {
  id: "2",
  planId: THANKSGIVING,
  name: "Pumpkin",
  status: PlanItemStatus.ACQUIRED,
};
const CREAM: StatusChange = {
  id: "3",
  planId: THANKSGIVING,
  name: "Whipped cream",
  status: PlanItemStatus.ACQUIRED,
};

let cache: ReturnType<typeof seededCache>;
let requests: Request[];

/**
 * I play the API: every aliased setStatus in a request is answered with
 * its item, now in its new status, unless I'm told to refuse.
 */
function clientFor(refuse = false) {
  const link = new ApolloLink(
    (operation) =>
      new Observable((observer) => {
        requests.push({
          variables: operation.variables,
          keepalive: operation.getContext().fetchOptions?.keepalive,
        });
        if (refuse) {
          observer.next({ data: null, errors: [{ message: "Nope" }] });
          observer.complete();
          return;
        }
        const planner: Record<string, unknown> = {
          __typename: "PlannerMutation",
        };
        for (const [name, value] of Object.entries(operation.variables)) {
          const match = /^id(\d+)$/.exec(name);
          if (match === null) continue;
          planner[`s${match[1]}`] = {
            __typename: "PlanItem",
            id: value,
            status: operation.variables[`status${match[1]}`],
          };
        }
        observer.next({ data: { planner } });
        observer.complete();
      }),
  );
  return new ApolloClient({
    dataMasking: true,
    cache,
    localState: new LocalState(),
    link,
  });
}

beforeEach(() => {
  cache = seededCache();
  requests = [];
});

describe("aliasedSender", () => {
  it("sends a plan's changes as one request", async () => {
    const send = aliasedSender(clientFor());

    const saved = await send([PUMPKIN, CREAM], { keepalive: false });

    expect(requests).toHaveLength(1);
    expect(saved).toEqual([true, true]);
    expect(readStatus(cache, "2")?.status).toBe(PlanItemStatus.ACQUIRED);
    expect(readStatus(cache, "3")?.status).toBe(PlanItemStatus.ACQUIRED);
  });

  it("asks the browser to finish a request the page won't wait for", async () => {
    const send = aliasedSender(clientFor());

    await send([PUMPKIN], { keepalive: true });

    expect(requests[0].keepalive).toBe(true);
  });

  it("reports every change unsaved when the server refuses", async () => {
    const send = aliasedSender(clientFor(true));

    const saved = await send([PUMPKIN, CREAM], { keepalive: false });

    expect(saved).toEqual([false, false]);
    expect(readStatus(cache, "2")?.status).toBe(PlanItemStatus.NEEDED);
  });
});
