import { possibleTypes } from "@/lib/apollo/possible-types";
import { defaultDataIdFromObject } from "@apollo/client";
import { InMemoryCache } from "@apollo/client-integration-nextjs";
import { relayStylePagination } from "@apollo/client/utilities";

export function buildInMemoryCache() {
  return new InMemoryCache({
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
      },
      LibraryQuery: {
        fields: {
          recipes: relayStylePagination(["scope", "query"]),
          suggestRecipesToCook: relayStylePagination(false),
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
}
