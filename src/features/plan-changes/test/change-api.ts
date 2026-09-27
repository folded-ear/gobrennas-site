import { buildInMemoryCache } from "@/lib/apollo/build-in-memory-cache";
import { ApolloClient, ApolloLink, Observable } from "@apollo/client";
import { LocalState } from "@apollo/client/local-state";

type Cache = ReturnType<typeof buildInMemoryCache>;

/** A request the fake API received. */
export type ChangeRequest = {
  readonly variables: Record<string, unknown>;
  readonly keepalive: unknown;
};

/** Where the fake API numbers the items it creates from. */
export const FIRST_CREATED_ID = 100;

/** I name an item's parent as the cache has it, plan or item. */
function parentOf(cache: Cache, id: string) {
  const store = cache.extract() as Record<string, Record<string, unknown>>;
  const ref = (store[`PlanItem:${id}`]?.parent as { __ref: string })?.__ref;
  return {
    __typename: store[ref]?.__typename ?? "PlanItem",
    id: ref?.slice("PlanItem:".length),
  };
}

/** I give a whole plan item, as a created or renamed one comes back. */
function wholeItem(id: string, name: string, parent: object) {
  return {
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
  };
}

/**
 * I build a client whose API answers every aliased change as saved,
 * unless told to refuse: a status with its item in its new status, a
 * rename or create with the whole item, a bucket with the item's bucket.
 * Each request lands in `requests`.
 */
export function changeApiClient(
  cache: Cache,
  requests: ChangeRequest[],
  { refuse = false } = {},
): ApolloClient {
  let created = FIRST_CREATED_ID;
  const link = new ApolloLink(
    (operation) =>
      new Observable((observer) => {
        const variables = operation.variables;
        requests.push({
          variables,
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
        for (let i = 0; `name${i}` in variables || `id${i}` in variables; i++) {
          const id = variables[`id${i}`] as string;
          if (`status${i}` in variables) {
            planner[`s${i}`] = {
              __typename: "PlanItem",
              id,
              status: variables[`status${i}`],
            };
          } else if (`parentId${i}` in variables) {
            const parentId = variables[`parentId${i}`] as string;
            planner[`s${i}`] = wholeItem(
              String(created++),
              variables[`name${i}`] as string,
              {
                __typename:
                  cache.extract()[`PlanItem:${parentId}`]?.__typename ??
                  "PlanItem",
                id: parentId,
              },
            );
          } else if (`bucketId${i}` in variables) {
            const bucketId = variables[`bucketId${i}`];
            planner[`s${i}`] = {
              __typename: "PlanItem",
              id,
              bucket:
                bucketId === null
                  ? null
                  : { __typename: "PlanBucket", id: bucketId },
            };
          } else {
            planner[`s${i}`] = wholeItem(
              id,
              variables[`name${i}`] as string,
              parentOf(cache, id),
            );
          }
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
