import type { ApolloCache } from "@apollo/client";
import { ApolloClient, ApolloLink, Observable } from "@apollo/client";
import { LocalState } from "@apollo/client/local-state";

/** A request the fake API received. */
export type ApiRequest = {
  readonly operation: string;
  readonly variables: Record<string, unknown>;
  readonly keepalive: unknown;
};

/** Where the fake API numbers the items it creates from. */
export const FIRST_CREATED_ID = 900;

/** How the fake API answers: saving, refusing, unreachable, or never. */
export type ApiMode = "save" | "refuse" | "unreachable" | "hang";

const whole = (id: string, name: string, parent: object) => ({
  __typename: "PlanItem",
  id,
  name,
  status: "NEEDED",
  notes: null,
  parent,
  aggregate: null,
  preparation: null,
  ingredient: null,
  quantity: null,
  components: [],
  bucket: null,
  children: [],
});

/** I name an item, plan or not, as the cache has it. */
function named(cache: ApolloCache, id: string) {
  const store = cache.extract() as Record<string, Record<string, unknown>>;
  return {
    __typename: (store[`PlanItem:${id}`]?.__typename as string) ?? "PlanItem",
    id,
  };
}

/** I name an item's parent as the cache has it. */
function parentOf(cache: ApolloCache, id: string) {
  const store = cache.extract() as Record<string, Record<string, unknown>>;
  const ref = (store[`PlanItem:${id}`]?.parent as { __ref: string })?.__ref;
  return named(cache, ref?.slice("PlanItem:".length) ?? "");
}

/** I answer one aliased change field as saved. */
function answerField(
  cache: ApolloCache,
  variables: Record<string, unknown>,
  i: number,
  nextId: () => string,
) {
  const id = variables[`id${i}`] as string;
  if (`status${i}` in variables) {
    return { __typename: "PlanItem", id, status: variables[`status${i}`] };
  }
  if (`parentId${i}` in variables) {
    return whole(
      nextId(),
      variables[`name${i}`] as string,
      named(cache, variables[`parentId${i}`] as string),
    );
  }
  if (`bucketId${i}` in variables) {
    const bucketId = variables[`bucketId${i}`];
    return {
      __typename: "PlanItem",
      id,
      bucket:
        bucketId === null ? null : { __typename: "PlanBucket", id: bucketId },
    };
  }
  if (`spec${i}` in variables) {
    const spec = variables[`spec${i}`] as { ids: string[] };
    return {
      __typename: "PlanItem",
      children: spec.ids.map((it) => ({ __typename: "PlanItem", id: it })),
    };
  }
  return whole(id, variables[`name${i}`] as string, parentOf(cache, id));
}

const fieldCount = (variables: Record<string, unknown>) => {
  let count = 0;
  while (Object.keys(variables).some((it) => it.endsWith(String(count)))) {
    count++;
  }
  return count;
};

/**
 * I build a client over a cache whose API saves every change unless its
 * mode says otherwise, and answers polls with what `polled` holds.
 */
export function fakeApi(cache: ApolloCache) {
  const requests: ApiRequest[] = [];
  let created = FIRST_CREATED_ID;
  const api = {
    mode: "save" as ApiMode,
    polled: [] as unknown[][],
    requests,
    client: null as unknown as ApolloClient,
  };
  const link = new ApolloLink(
    (operation) =>
      new Observable((observer) => {
        const { variables } = operation;
        if (operation.operationName === "recognizeIngredient") {
          observer.next({
            data: {
              library: {
                recognizeItem: {
                  raw: variables.raw,
                  cursor: variables.cursor,
                  ranges: [],
                },
              },
            },
          });
          observer.complete();
          return;
        }
        requests.push({
          operation: operation.operationName ?? "",
          variables,
          keepalive: operation.getContext().fetchOptions?.keepalive,
        });
        if (api.mode === "hang") return;
        if (api.mode === "unreachable") {
          observer.error(new TypeError("Failed to fetch"));
          return;
        }
        if (api.mode === "refuse") {
          observer.next({
            data: null,
            errors: [{ message: "Nope", path: ["planner", "s0"] }],
          });
          observer.complete();
          return;
        }
        const planner: Record<string, unknown> = {
          __typename:
            operation.operationName === "pollPlans"
              ? "PlannerQuery"
              : "PlannerMutation",
        };
        if (operation.operationName === "pollPlans") {
          for (let i = 0; `planId${i}` in variables; i++) {
            planner[`p${i}`] = api.polled[i] ?? [];
          }
        } else {
          const count = fieldCount(variables);
          for (let i = 0; i < count; i++) {
            planner[`s${i}`] = answerField(cache, variables, i, () =>
              String(created++),
            );
          }
        }
        observer.next({ data: { planner } });
        observer.complete();
      }),
  );
  api.client = new ApolloClient({
    dataMasking: true,
    cache,
    localState: new LocalState(),
    link,
  });
  return api;
}
