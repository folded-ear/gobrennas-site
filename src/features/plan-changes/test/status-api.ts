import { buildInMemoryCache } from "@/lib/apollo/build-in-memory-cache";
import { ApolloClient, ApolloLink, Observable } from "@apollo/client";
import { LocalState } from "@apollo/client/local-state";

/** A request the fake API received. */
export type StatusRequest = {
  readonly variables: Record<string, unknown>;
  readonly keepalive: unknown;
};

/**
 * I build a client whose API answers every aliased setStatus with its
 * item, now in its new status, unless told to refuse. Each request lands
 * in `requests`.
 */
export function statusApiClient(
  cache: ReturnType<typeof buildInMemoryCache>,
  requests: StatusRequest[],
  { refuse = false } = {},
): ApolloClient {
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
