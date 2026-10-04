import { buildApolloLink } from "@/lib/apollo/build-apollo-link";
import { ApolloClient, HttpLink } from "@apollo/client";
import { LocalState } from "@apollo/client/local-state";
import { describe, expect, it } from "vitest";
import { changeMutation } from "./mutation";
import { sendOutcome } from "./outcome";
import type { SentChange } from "./state";
import { seededCache, THANKSGIVING } from "./test/status-cache";

const PIE = "1";
const PUMPKIN = "2";
const CREATED = "901";
const SERVER_NOTES = "from the server";
const SERVER_PREP = "diced";
const UNAUTHORIZED = "UNAUTHORIZED";

const BATCH: readonly SentChange[] = [
  { kind: "rename", id: PUMPKIN, planId: THANKSGIVING, name: "Squash" },
  {
    kind: "create",
    id: "draft:x",
    planId: THANKSGIVING,
    parentId: PIE,
    afterId: PUMPKIN,
    name: "Nutmeg",
  },
];

const whole = (id: string, name: string) => ({
  __typename: "PlanItem",
  id,
  name,
  status: "NEEDED",
  notes: SERVER_NOTES,
  parent: { __typename: "PlanItem", id: PIE },
  aggregate: null,
  preparation: SERVER_PREP,
  ingredient: null,
  quantity: null,
  components: [],
  bucket: null,
  children: [],
});

/** I build the app's client stack over a seeded cache, answering `body`. */
function clientAnswering(body: object) {
  const cache = seededCache();
  const http = new HttpLink({
    uri: "http://api.test/graphql",
    fetch: async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  });
  const client = new ApolloClient({
    dataMasking: true,
    cache,
    localState: new LocalState(),
    link: buildApolloLink("test", http),
  });
  return { cache, client };
}

async function send(client: ApolloClient) {
  const { mutation, variables } = changeMutation(BATCH);
  try {
    const { data, error } = await client.mutate({ mutation, variables });
    return sendOutcome({ data, error });
  } catch (thrown) {
    return sendOutcome({ thrown });
  }
}

const cached = (cache: ReturnType<typeof seededCache>, id: string) =>
  (cache.extract() as Record<string, Record<string, unknown>>)[
    `PlanItem:${id}`
  ];

describe("sending with the default fetch and error policies", () => {
  it("writes a saved batch whole, masked fields included", async () => {
    const { cache, client } = clientAnswering({
      data: {
        planner: {
          __typename: "PlannerMutation",
          s0: whole(PUMPKIN, "Squash"),
          s1: whole(CREATED, "Nutmeg"),
        },
      },
    });

    const outcome = await send(client);

    expect(outcome.kind).toBe("saved");
    expect(cached(cache, PUMPKIN)).toMatchObject({
      name: "Squash",
      notes: SERVER_NOTES,
      preparation: SERVER_PREP,
      components: [],
    });
    expect(cached(cache, CREATED)).toMatchObject({
      name: "Nutmeg",
      notes: SERVER_NOTES,
    });
  });

  it("refuses the field that errored and writes nothing", async () => {
    const { cache, client } = clientAnswering({
      data: {
        planner: {
          __typename: "PlannerMutation",
          s0: whole(PUMPKIN, "Squash"),
          s1: null,
        },
      },
      errors: [{ message: "Nope", path: ["planner", "s1"] }],
    });
    const before = cache.extract();

    const outcome = await send(client);

    expect(outcome).toEqual({ kind: "refused", fields: [1] });
    expect(cache.extract()).toEqual(before);
  });

  it("tells an expired login from a refusal", async () => {
    const { client } = clientAnswering({
      data: null,
      errors: [
        {
          message: "Expired",
          path: ["planner", "s0"],
          extensions: { classification: UNAUTHORIZED },
        },
      ],
    });

    const outcome = await send(client);

    expect(outcome).toEqual({ kind: "unauthorized" });
  });
});
