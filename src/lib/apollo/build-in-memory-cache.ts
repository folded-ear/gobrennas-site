import {
  attachView,
  makeView,
  overlayPolicies,
} from "@/features/page-engine/overlay";
import { possibleTypes } from "@/lib/apollo/possible-types";
import { defaultDataIdFromObject, Reference } from "@apollo/client";
import { InMemoryCache } from "@apollo/client-integration-nextjs";
import { relayStylePagination } from "@apollo/client/utilities";

export function buildInMemoryCache() {
  const view = makeView();
  const overlay = overlayPolicies(view);
  const cache = new InMemoryCache({
    possibleTypes,
    typePolicies: {
      Query: {
        fields: {
          library: {
            // this was 'merge:false' before...
            merge(existing, incoming, { mergeObjects }) {
              return mergeObjects(existing, incoming);
            },
          },
        },
      },
      PlannerQuery: {
        merge: true,
        fields: {
          // Each poll's cutoff is new, so only the plan names an answer.
          updatedSince: { keyArgs: ["planId"] },
        },
      },
      LibraryQuery: {
        fields: {
          recipes: relayStylePagination(["scope", "query"]),
          suggestRecipesToCook: relayStylePagination(false),
        },
      },
      // Pending plan changes show over server data (page-engine/overlay.ts),
      // local fields (schema-local.graphql) among them.
      Plan: overlay.Plan,
      PlanItem: {
        fields: {
          ...overlay.PlanItem.fields,
          inert: {
            read(_, { readField }) {
              let parent = readField<Reference>("parent");
              // A plan has no parent, so the walk ends there.
              while (parent) {
                if (readField("pendingStatus", parent)) return true;
                parent = readField<Reference>("parent", parent);
              }
              return false;
            },
          },
        },
      },
      UserPreference: {
        // User prefs are uniquely identified by name within the context of a
        // single cache, even if the pref is cross-device.
        keyFields: ["name"],
      },
    },
    dataIdFromObject: (responseObject) => {
      switch (responseObject.__typename) {
        // use keys based on the root of inheritance hierarchies
        case "Plan":
          return `PlanItem:${responseObject.id}`;
        case "PantryItem":
        case "Section":
        case "Recipe":
          return `Ingredient:${responseObject.id}`;
        default:
          return defaultDataIdFromObject(responseObject);
      }
    },
  });
  attachView(cache, view);
  return cache;
}
