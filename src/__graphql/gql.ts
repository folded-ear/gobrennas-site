/* eslint-disable */
import * as types from './graphql';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 */
const documents = {
    "\n  fragment librarySearchResult on RecipeConnection {\n    edges {\n      cursor\n      node {\n        id\n        owner {\n          id\n          imageUrl\n          email\n          name\n        }\n        photo {\n          url\n          focus\n        }\n        name\n        labels\n        externalUrl\n        calories\n        yield\n        totalTime\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n": types.LibrarySearchResultFragmentDoc,
    "\n  fragment recipeCore on Recipe {\n    id\n    name\n    directions\n    totalTime\n    ingredients {\n      raw\n      quantity {\n        quantity\n        units {\n          name\n        }\n      }\n      ingredient {\n        id\n        name\n      }\n      preparation\n    }\n  }\n": types.RecipeCoreFragmentDoc,
    "\n    query getSearchLibrary(\n      $query: String! = \"\"\n      $scope: LibrarySearchScope! = MINE\n      $first: NonNegativeInt! = 9\n      $after: Cursor = null\n    ) {\n      library {\n        recipes(first: $first, query: $query, scope: $scope, after: $after) {\n          ...librarySearchResult\n        }\n      }\n    }\n  ": types.GetSearchLibraryDocument,
    "\n      query getRecipeWithEverything($id: ID!) {\n        library {\n          getRecipeById(id: $id) {\n            ...recipeCore\n            yield\n            calories\n            externalUrl\n            labels\n            photo {\n              url\n              focus\n            }\n            owner {\n              id\n              name\n              email\n              imageUrl\n            }\n            subrecipes {\n              ...recipeCore\n            }\n            plannedHistory {\n              id\n              plannedAt\n              doneAt\n              status\n              owner {\n                name\n                email\n                imageUrl\n              }\n              rating: ratingInt\n              notes\n            }\n          }\n        }\n      }\n    ": types.GetRecipeWithEverythingDocument,
    "\n      query me {\n        getCurrentUser {\n          id\n          name\n          email\n          imageUrl\n          provider\n          roles\n        }\n      }\n    ": types.MeDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment librarySearchResult on RecipeConnection {\n    edges {\n      cursor\n      node {\n        id\n        owner {\n          id\n          imageUrl\n          email\n          name\n        }\n        photo {\n          url\n          focus\n        }\n        name\n        labels\n        externalUrl\n        calories\n        yield\n        totalTime\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n"): typeof import('./graphql').LibrarySearchResultFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment recipeCore on Recipe {\n    id\n    name\n    directions\n    totalTime\n    ingredients {\n      raw\n      quantity {\n        quantity\n        units {\n          name\n        }\n      }\n      ingredient {\n        id\n        name\n      }\n      preparation\n    }\n  }\n"): typeof import('./graphql').RecipeCoreFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query getSearchLibrary(\n      $query: String! = \"\"\n      $scope: LibrarySearchScope! = MINE\n      $first: NonNegativeInt! = 9\n      $after: Cursor = null\n    ) {\n      library {\n        recipes(first: $first, query: $query, scope: $scope, after: $after) {\n          ...librarySearchResult\n        }\n      }\n    }\n  "): typeof import('./graphql').GetSearchLibraryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      query getRecipeWithEverything($id: ID!) {\n        library {\n          getRecipeById(id: $id) {\n            ...recipeCore\n            yield\n            calories\n            externalUrl\n            labels\n            photo {\n              url\n              focus\n            }\n            owner {\n              id\n              name\n              email\n              imageUrl\n            }\n            subrecipes {\n              ...recipeCore\n            }\n            plannedHistory {\n              id\n              plannedAt\n              doneAt\n              status\n              owner {\n                name\n                email\n                imageUrl\n              }\n              rating: ratingInt\n              notes\n            }\n          }\n        }\n      }\n    "): typeof import('./graphql').GetRecipeWithEverythingDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      query me {\n        getCurrentUser {\n          id\n          name\n          email\n          imageUrl\n          provider\n          roles\n        }\n      }\n    "): typeof import('./graphql').MeDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
