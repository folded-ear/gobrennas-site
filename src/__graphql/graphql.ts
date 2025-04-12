/* eslint-disable */
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** The type of a cursor, an opaque string used for walking connections. */
  Cursor: { input: any; output: any; }
  /** An RFC-3339 compliant Full Date Scalar */
  Date: { input: string; output: string; }
  /** An RFC-3339 compliant DateTime Scalar */
  DateTime: { input: string; output: string; }
  /** A 64-bit signed integer */
  Long: { input: number; output: number; }
  /** An Float scalar that must be greater than or equal to zero */
  NonNegativeFloat: { input: number; output: number; }
  /** An Int scalar that must be greater than or equal to zero */
  NonNegativeInt: { input: number; output: number; }
  /** An Int scalar that must be a positive value */
  PositiveInt: { input: number; output: number; }
  /** A file part in a multipart request */
  Upload: { input: File; output: File; }
};

export type AccessControlEntry = {
  __typename?: 'AccessControlEntry';
  /** The level of access the user has been granted. */
  level: AccessLevel;
  /** The user who has been granted access to an AccessControlled object. */
  user: User;
};

export type AccessControlled = {
  /** The object's ACL, which includes its owner and any grants of access. */
  acl: Acl;
  grants: Array<AccessControlEntry>;
  owner: User;
};

export enum AccessLevel {
  Administer = 'ADMINISTER',
  Change = 'CHANGE',
  View = 'VIEW'
}

export type Acl = Owned & {
  __typename?: 'Acl';
  /**
   * Users granted access, by the owner. This is conceptually map, so a given
   * user (the key) uniquely identifies their access level (the value).
   */
  grants: Array<AccessControlEntry>;
  owner: User;
};

export enum ChronoUnit {
  Hours = 'HOURS',
  Millis = 'MILLIS',
  Minutes = 'MINUTES',
  Seconds = 'SECONDS'
}

export type CorePlanItem = {
  childCount: Scalars['NonNegativeInt']['output'];
  children: Array<PlanItem>;
  descendantCount: Scalars['NonNegativeInt']['output'];
  descendants: Array<PlanItem>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  plan: Plan;
};

/**
 * A suggestion for how to interpret the always-a-String value of a preference.
 * Clients should be "generous" in their parsing, where possible. E.g, `BOOLEAN`
 * strings `"123"` and `"0"` should be treated as `true` and `false`, respectively.
 */
export enum DataType {
  Boolean = 'BOOLEAN',
  Float = 'FLOAT',
  /** A string with ID semantics */
  Id = 'ID',
  Int = 'INT',
  /** Arbitrary JSON-serialized data */
  Json = 'JSON',
  /** A JSON-serialized list of ID values */
  SetOfIds = 'SET_OF_IDS',
  String = 'STRING'
}

export type Deletion = {
  __typename?: 'Deletion';
  id: Scalars['ID']['output'];
  name: Maybe<Scalars['String']['output']>;
};

export type Favorite = Node & {
  __typename?: 'Favorite';
  id: Scalars['ID']['output'];
  /** The name/title of the object that is a favorite. */
  name: Scalars['String']['output'];
  /** The ID of the object that is a favorite. */
  objectId: Scalars['ID']['output'];
  /** The type of object that is a favorite. */
  objectType: Scalars['String']['output'];
  owner: User;
};

export type FavoriteMutation = {
  __typename?: 'FavoriteMutation';
  /**
   * Add the specified object to the current user's favorites, if not already
   * present, and return the favorite.
   */
  markFavorite: Favorite;
  /**
   * Remove the specified object from the current user's favorites, and return
   * whether any action was taken to ensure this.
   */
  removeFavorite: Scalars['Boolean']['output'];
};


export type FavoriteMutationMarkFavoriteArgs = {
  objectId: Scalars['ID']['input'];
  objectType: Scalars['String']['input'];
};


export type FavoriteMutationRemoveFavoriteArgs = {
  objectId: Scalars['ID']['input'];
  objectType: Scalars['String']['input'];
};

export type FavoriteQuery = {
  __typename?: 'FavoriteQuery';
  /** Retrieve the current user's favorites, if any. */
  all: Array<Favorite>;
  /** Retrieve the current user's favorite of the specified object, if exists. */
  byObject: Maybe<Favorite>;
  /** Retrieve the current user's favorites for the specified object type, if any. */
  byType: Array<Favorite>;
};


export type FavoriteQueryByObjectArgs = {
  objectId: Scalars['ID']['input'];
  objectType: Scalars['String']['input'];
};


export type FavoriteQueryByTypeArgs = {
  objectType: Scalars['String']['input'];
};

export type FileInfo = {
  __typename?: 'FileInfo';
  contentType: Scalars['String']['output'];
  filename: Scalars['String']['output'];
  size: Scalars['NonNegativeInt']['output'];
  url: Scalars['String']['output'];
};

export type Ingredient = {
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type IngredientInfo = {
  calories: InputMaybe<Scalars['Int']['input']>;
  directions: InputMaybe<Scalars['String']['input']>;
  externalUrl: InputMaybe<Scalars['String']['input']>;
  ingredients: InputMaybe<Array<IngredientRefInfo>>;
  labels: InputMaybe<Array<Scalars['String']['input']>>;
  name: Scalars['String']['input'];
  /** Filename of a scratch upload to set as this recipe's photo. */
  photo: InputMaybe<Scalars['String']['input']>;
  photoFocus: InputMaybe<Array<Scalars['Float']['input']>>;
  storeOrder: InputMaybe<Scalars['Int']['input']>;
  totalTime: InputMaybe<Scalars['Int']['input']>;
  type: Scalars['String']['input'];
  yield: InputMaybe<Scalars['Int']['input']>;
};

export type IngredientRef = {
  __typename?: 'IngredientRef';
  ingredient: Maybe<Ingredient>;
  preparation: Maybe<Scalars['String']['output']>;
  quantity: Maybe<Quantity>;
  raw: Scalars['String']['output'];
};

export type IngredientRefInfo = {
  ingredient: InputMaybe<Scalars['String']['input']>;
  ingredientId: InputMaybe<Scalars['Long']['input']>;
  preparation: InputMaybe<Scalars['String']['input']>;
  quantity: InputMaybe<Scalars['Float']['input']>;
  raw: Scalars['String']['input'];
  units: InputMaybe<Scalars['String']['input']>;
  uomId: InputMaybe<Scalars['Long']['input']>;
};

export type Label = Node & {
  __typename?: 'Label';
  id: Scalars['ID']['output'];
  /** Unique label name. */
  name: Scalars['String']['output'];
};

export type LabelsQuery = {
  __typename?: 'LabelsQuery';
  all: Array<Label>;
};

export type LibraryMutation = {
  __typename?: 'LibraryMutation';
  /** Create a new recipe in your library, from the passed info. */
  createRecipe: Recipe;
  /**
   * Create a new recipe in your library, from the passed info, which is based
   * on the passed source recipe id.
   */
  createRecipeFrom: Recipe;
  /** Delete a recipe from your library. */
  deleteRecipe: Deletion;
  history: Maybe<RecipeHistoryMutation>;
  /**
   * I add the specified recipe to the specified plan, and return the new
   * PlanItem corresponding to the recipe itself.
   */
  sendRecipeToPlan: PlanItem;
  /**
   * Set the photo for a recipe in your library, without changing any other
   * info about the recipe. A photo may be set during create and/or update.
   */
  setRecipePhoto: Recipe;
  /** Update a recipe in your library, from the passed info. */
  updateRecipe: Recipe;
};


export type LibraryMutationCreateRecipeArgs = {
  cookThis: InputMaybe<Scalars['Boolean']['input']>;
  info: IngredientInfo;
  photo: InputMaybe<Scalars['Upload']['input']>;
};


export type LibraryMutationCreateRecipeFromArgs = {
  info: IngredientInfo;
  photo: InputMaybe<Scalars['Upload']['input']>;
  sourceRecipeId: Scalars['ID']['input'];
};


export type LibraryMutationDeleteRecipeArgs = {
  id: Scalars['ID']['input'];
};


export type LibraryMutationHistoryArgs = {
  recipeId: Scalars['ID']['input'];
};


export type LibraryMutationSendRecipeToPlanArgs = {
  id: Scalars['ID']['input'];
  planId: Scalars['ID']['input'];
  scale?: InputMaybe<Scalars['Float']['input']>;
};


export type LibraryMutationSetRecipePhotoArgs = {
  filename: InputMaybe<Scalars['String']['input']>;
  focus: InputMaybe<Array<Scalars['Float']['input']>>;
  id: Scalars['ID']['input'];
  photo: InputMaybe<Scalars['Upload']['input']>;
};


export type LibraryMutationUpdateRecipeArgs = {
  id: Scalars['ID']['input'];
  info: IngredientInfo;
  photo: InputMaybe<Scalars['Upload']['input']>;
};

export type LibraryQuery = {
  __typename?: 'LibraryQuery';
  /**
   * Retrieve ingredients in bulk, regardless of type. Invalid IDs will be
   * silently ignored, and no result returned for them. Duplicate IDs will only
   * have a single result returned. The order of results is unspecified.
   * Identical to the query of the same name in 'pantry'.
   */
  bulkIngredients: Array<Ingredient>;
  /**
   * Retrieve a single recipe by its ID. Authenticated users can request any
   * recipe. Anonymous users must supply the recipe's secret.
   */
  getRecipeById: Recipe;
  /** Search the recipe library. */
  recipes: RecipeConnection;
  /**
   * Recognize quantity, unit, and/or ingredient in a raw ingredient ref (aka
   * item) string, and describe that structure. By default, also provide
   * suggestions based on partial matches.
   */
  recognizeItem: RecognizedItem;
  suggestRecipesToCook: RecipeConnection;
};


export type LibraryQueryBulkIngredientsArgs = {
  ids: InputMaybe<Array<Scalars['ID']['input']>>;
};


export type LibraryQueryGetRecipeByIdArgs = {
  id: Scalars['ID']['input'];
  secret: InputMaybe<Scalars['String']['input']>;
};


export type LibraryQueryRecipesArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  first?: Scalars['NonNegativeInt']['input'];
  ingredients?: Array<Scalars['ID']['input']>;
  query?: Scalars['String']['input'];
  scope?: LibrarySearchScope;
};


export type LibraryQueryRecognizeItemArgs = {
  cursor: InputMaybe<Scalars['NonNegativeInt']['input']>;
  raw: Scalars['String']['input'];
};


export type LibraryQuerySuggestRecipesToCookArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  first?: Scalars['NonNegativeInt']['input'];
};

export enum LibrarySearchScope {
  Everyone = 'EVERYONE',
  Mine = 'MINE'
}

export type MutatePlanTree = {
  afterId: InputMaybe<Scalars['ID']['input']>;
  ids: Array<Scalars['ID']['input']>;
  parentId: Scalars['ID']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  favorite: FavoriteMutation;
  library: LibraryMutation;
  pantry: PantryMutation;
  planner: PlannerMutation;
  profile: ProfileMutation;
  textract: TextractMutation;
};

export type Node = {
  id: Scalars['ID']['output'];
};

export type Owned = {
  /** The user who owns this object. */
  owner: User;
};

export type PageInfo = {
  __typename?: 'PageInfo';
  /** The last cursor returned in this page's edges. */
  endCursor: Maybe<Scalars['Cursor']['output']>;
  /**
   * Whether this connection has a next page, or null if included in the
   * result of a backward paging operation.
   */
  hasNextPage: Scalars['Boolean']['output'];
  /**
   * Whether this connection has a previous page, or null if included in the
   * result of a forward paging operation.
   */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The first cursor returned in this page's edges. */
  startCursor: Maybe<Scalars['Cursor']['output']>;
};

export type PantryItem = Ingredient & Node & {
  __typename?: 'PantryItem';
  /**
   * The number of auto-detected duplicates of this pantry item. Exactly what
   * "duplicate" means is unspecified and subject to change, excepting that it
   * will remain consistent with a 'duplicates:12345' search query.
   */
  duplicateCount: Scalars['NonNegativeInt']['output'];
  /** When this pantry item was first used. */
  firstUse: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  labels: Maybe<Array<Scalars['String']['output']>>;
  name: Scalars['String']['output'];
  /**
   * The relative order this pantry item will be shown on the shopping view.
   * The absolute value has no semantic, and may change arbitrarily.
   */
  storeOrder: Scalars['Int']['output'];
  /**
   * Other names this pantry item can be referred to as. E.g., an "apple" item
   * may have synonym "pomme".
   */
  synonyms: Maybe<Array<Scalars['String']['output']>>;
  /**
   * The number of times this pantry item is used, including synonyms, in both
   * library recipes and on a plan.
   */
  useCount: Scalars['NonNegativeInt']['output'];
};

export type PantryItemConnection = {
  __typename?: 'PantryItemConnection';
  edges: Array<PantryItemConnectionEdge>;
  pageInfo: PageInfo;
};

export type PantryItemConnectionEdge = {
  __typename?: 'PantryItemConnectionEdge';
  cursor: Scalars['Cursor']['output'];
  node: PantryItem;
};

export type PantryMutation = {
  __typename?: 'PantryMutation';
  addLabel: PantryItem;
  addSynonym: PantryItem;
  /**
   * Combine two or more pantry items, and return the result, after unifying
   * synonyms, labels, and references.
   */
  combineItems: PantryItem;
  /** Delete a pantry item, which MUST be unreferenced. */
  deleteItem: Deletion;
  /**
   * Orders one PantryItem relative to another, and returns it. Note that
   * there will almost certainly be other PantryItems affected by the operation.
   * A follow-on 'updatedSince' query can get the whole shebang, if you care.
   */
  orderForStore: PantryItem;
  removeLabel: PantryItem;
  removeSynonym: PantryItem;
  renameItem: PantryItem;
  setLabels: PantryItem;
  setSynonyms: PantryItem;
};


export type PantryMutationAddLabelArgs = {
  id: Scalars['ID']['input'];
  label: Scalars['String']['input'];
};


export type PantryMutationAddSynonymArgs = {
  id: Scalars['ID']['input'];
  synonym: Scalars['String']['input'];
};


export type PantryMutationCombineItemsArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type PantryMutationDeleteItemArgs = {
  id: Scalars['ID']['input'];
};


export type PantryMutationOrderForStoreArgs = {
  after?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['ID']['input'];
  targetId: Scalars['ID']['input'];
};


export type PantryMutationRemoveLabelArgs = {
  id: Scalars['ID']['input'];
  label: Scalars['String']['input'];
};


export type PantryMutationRemoveSynonymArgs = {
  id: Scalars['ID']['input'];
  synonym: Scalars['String']['input'];
};


export type PantryMutationRenameItemArgs = {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};


export type PantryMutationSetLabelsArgs = {
  id: Scalars['ID']['input'];
  labels: Array<Scalars['String']['input']>;
};


export type PantryMutationSetSynonymsArgs = {
  id: Scalars['ID']['input'];
  synonyms: Array<Scalars['String']['input']>;
};

export type PantryQuery = {
  __typename?: 'PantryQuery';
  /**
   * Retrieve ingredients in bulk, regardless of type. Invalid IDs will be
   * silently ignored, and no result returned for them. Duplicate IDs will only
   * have a single result returned. The order of results is unspecified.
   * Identical to the query of the same name in 'pantry'.
   */
  bulkIngredients: Array<Ingredient>;
  /** Search available pantry items. */
  search: PantryItemConnection;
  updatedSince: Array<PantryItem>;
};


export type PantryQueryBulkIngredientsArgs = {
  ids: InputMaybe<Array<Scalars['ID']['input']>>;
};


export type PantryQuerySearchArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['NonNegativeInt']['input']>;
  query: InputMaybe<Scalars['String']['input']>;
  sortBy: InputMaybe<Scalars['String']['input']>;
  sortDir?: InputMaybe<SortDir>;
};


export type PantryQueryUpdatedSinceArgs = {
  cutoff: Scalars['Long']['input'];
};

export type Photo = {
  __typename?: 'Photo';
  focus: Maybe<Array<Scalars['Float']['output']>>;
  url: Scalars['String']['output'];
};

export type Plan = AccessControlled & CorePlanItem & Node & Owned & {
  __typename?: 'Plan';
  acl: Acl;
  bucketCount: Scalars['NonNegativeInt']['output'];
  buckets: Array<PlanBucket>;
  childCount: Scalars['NonNegativeInt']['output'];
  children: Array<PlanItem>;
  /**
   * The color associated with the plan, expressed as a number sign and six
   * hex digits (e.g., '#F57F17').
   */
  color: Scalars['String']['output'];
  descendantCount: Scalars['NonNegativeInt']['output'];
  descendants: Array<PlanItem>;
  grants: Array<AccessControlEntry>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  notes: Maybe<Scalars['String']['output']>;
  /** The plan's owner */
  owner: User;
  /** A plan's plan is always itself. */
  plan: Plan;
  share: ShareInfo;
  /**
   * Retrieve all items which have been updated since the passed cutoff
   * (expressed in milliseconds since the UNIX epoch). May include this plan!
   */
  updatedSince: Array<CorePlanItem>;
};


export type PlanUpdatedSinceArgs = {
  cutoff: Scalars['Long']['input'];
};

export type PlanBucket = {
  __typename?: 'PlanBucket';
  date: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  name: Maybe<Scalars['String']['output']>;
  plan: Plan;
};

/** Represents a single item on a plan */
export type PlanItem = CorePlanItem & Node & {
  __typename?: 'PlanItem';
  aggregate: Maybe<PlanItem>;
  bucket: Maybe<PlanBucket>;
  childCount: Scalars['NonNegativeInt']['output'];
  children: Array<PlanItem>;
  componentCount: Scalars['NonNegativeInt']['output'];
  components: Array<PlanItem>;
  descendantCount: Scalars['NonNegativeInt']['output'];
  descendants: Array<PlanItem>;
  id: Scalars['ID']['output'];
  ingredient: Maybe<Ingredient>;
  name: Scalars['String']['output'];
  notes: Maybe<Scalars['String']['output']>;
  /** This item's parent; follow enough and you'll always get to the plan. */
  parent: CorePlanItem;
  plan: Plan;
  preparation: Maybe<Scalars['String']['output']>;
  quantity: Maybe<Quantity>;
  status: PlanItemStatus;
};

export enum PlanItemStatus {
  Acquired = 'ACQUIRED',
  Completed = 'COMPLETED',
  Deleted = 'DELETED',
  Needed = 'NEEDED'
}

export type PlannedRecipeHistory = Node & {
  __typename?: 'PlannedRecipeHistory';
  doneAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  notes: Maybe<Scalars['String']['output']>;
  /**
   * The user who owns this history item, which may or may not be the recipe's
   * owner.
   */
  owner: User;
  plannedAt: Scalars['DateTime']['output'];
  rating: Maybe<Rating>;
  ratingInt: Maybe<Scalars['PositiveInt']['output']>;
  /** The recipe this history item is for. */
  recipe: Recipe;
  status: PlanItemStatus;
};

export type PlannerMutation = {
  __typename?: 'PlannerMutation';
  /** Assign a plan item to a bucket (in the same plan), or clear an item's bucket. */
  assignBucket: PlanItem;
  /** Create a new bucket w/in a plan, with an optional name and date. */
  createBucket: PlanBucket;
  /** Create multiple new buckets w/in a plan. */
  createBuckets: Array<PlanBucket>;
  /**
   * Create a new item under the specified parent (which may be a plan, for
   * top-level items), after the specified peer item (null means 'at end'), and with
   * the specified name.
   */
  createItem: PlanItem;
  /** Create a new empty plan, optionally duplicating the specified source plan. */
  createPlan: Plan;
  /** Delete a bucket from a plan. */
  deleteBucket: Deletion;
  /** Delete multiple buckets from a single plan. */
  deleteBuckets: Array<Deletion>;
  /** Deletes an item from a plan. This operation cascades. */
  deleteItem: Deletion;
  /** Deletes the given plan, and all its related data. */
  deletePlan: Deletion;
  /** Create a new plan by duplicating the specified source plan. */
  duplicatePlan: Plan;
  /**
   * Move the given items under the given parent, in order, optionally after a
   * specific item already under that parent. The parent's info is returned.
   */
  mutateTree: PlanItem;
  /** Update the name of the given plan or plan item (but not bucket). */
  rename: CorePlanItem;
  /**
   * Reorder the item/plan subitems in the same order as the passed list. If
   * there are subitems not included in the list, they will not be reordered. If
   * an item under a different parent is included in the list, it will be moved
   * under this item.
   */
  reorderSubitems: Maybe<PlanItem>;
  /** Revokes the grant for a user w/in a plan, if one exists. */
  revokeGrant: Plan;
  /** Set the plan's color (e.g., '#F57F17'), or reset it with a null or empty string. */
  setColor: Plan;
  /** Set the access level granted to a user w/in a plan. */
  setGrant: Plan;
  /**
   * Sets the status of the given item. This will always return the updated
   * item, though it may immediately moved to the trash (in the background).
   */
  setStatus: PlanItem;
  /** Update a bucket w/in a plan, by setting or clearing its name and date. */
  updateBucket: PlanBucket;
  updatePlanNotes: Plan;
};


export type PlannerMutationAssignBucketArgs = {
  bucketId: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
};


export type PlannerMutationCreateBucketArgs = {
  date: InputMaybe<Scalars['Date']['input']>;
  name: InputMaybe<Scalars['String']['input']>;
  planId: Scalars['ID']['input'];
};


export type PlannerMutationCreateBucketsArgs = {
  buckets: Array<UnsavedBucket>;
  planId: Scalars['ID']['input'];
};


export type PlannerMutationCreateItemArgs = {
  afterId: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
  parentId: Scalars['ID']['input'];
};


export type PlannerMutationCreatePlanArgs = {
  name: Scalars['String']['input'];
  sourcePlanId: InputMaybe<Scalars['ID']['input']>;
};


export type PlannerMutationDeleteBucketArgs = {
  bucketId: Scalars['ID']['input'];
  planId: Scalars['ID']['input'];
};


export type PlannerMutationDeleteBucketsArgs = {
  bucketIds: Array<Scalars['ID']['input']>;
  planId: Scalars['ID']['input'];
};


export type PlannerMutationDeleteItemArgs = {
  id: Scalars['ID']['input'];
};


export type PlannerMutationDeletePlanArgs = {
  id: Scalars['ID']['input'];
};


export type PlannerMutationDuplicatePlanArgs = {
  name: Scalars['String']['input'];
  sourcePlanId: Scalars['ID']['input'];
};


export type PlannerMutationMutateTreeArgs = {
  spec: MutatePlanTree;
};


export type PlannerMutationRenameArgs = {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};


export type PlannerMutationReorderSubitemsArgs = {
  itemIds: Array<Scalars['ID']['input']>;
  parentId: Scalars['ID']['input'];
};


export type PlannerMutationRevokeGrantArgs = {
  planId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type PlannerMutationSetColorArgs = {
  color: InputMaybe<Scalars['String']['input']>;
  planId: Scalars['ID']['input'];
};


export type PlannerMutationSetGrantArgs = {
  accessLevel: AccessLevel;
  planId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type PlannerMutationSetStatusArgs = {
  doneAt: InputMaybe<Scalars['DateTime']['input']>;
  id: Scalars['ID']['input'];
  status: PlanItemStatus;
};


export type PlannerMutationUpdateBucketArgs = {
  bucketId: Scalars['ID']['input'];
  date: InputMaybe<Scalars['Date']['input']>;
  name: InputMaybe<Scalars['String']['input']>;
  planId: Scalars['ID']['input'];
};


export type PlannerMutationUpdatePlanNotesArgs = {
  notes: InputMaybe<Scalars['String']['input']>;
  planId: Scalars['ID']['input'];
};

export type PlannerQuery = {
  __typename?: 'PlannerQuery';
  plan: Plan;
  planItem: PlanItem;
  planOrItem: CorePlanItem;
  plans: Array<Plan>;
  /**
   * Retrieve all items on the given plan which have been updated since the
   * passed cutoff (expressed in milliseconds since the UNIX epoch). May include
   * the plan itself!
   */
  updatedSince: Array<CorePlanItem>;
};


export type PlannerQueryPlanArgs = {
  id: Scalars['ID']['input'];
};


export type PlannerQueryPlanItemArgs = {
  id: Scalars['ID']['input'];
};


export type PlannerQueryPlanOrItemArgs = {
  id: Scalars['ID']['input'];
};


export type PlannerQueryUpdatedSinceArgs = {
  cutoff: Scalars['Long']['input'];
  planId: Scalars['ID']['input'];
};

export type ProfileMutation = {
  __typename?: 'ProfileMutation';
  clearPreference: UserPreference;
  deleteDevice: Deletion;
  renameDevice: UserDevice;
  setPreference: UserPreference;
};


export type ProfileMutationClearPreferenceArgs = {
  deviceKey: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};


export type ProfileMutationDeleteDeviceArgs = {
  id: Scalars['ID']['input'];
};


export type ProfileMutationRenameDeviceArgs = {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};


export type ProfileMutationSetPreferenceArgs = {
  deviceKey: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type ProfileQuery = {
  __typename?: 'ProfileQuery';
  friends: Array<User>;
  me: User;
  /**
   * Request a pre-signed upload URL to PUT a scratch file to, identified by
   * the returned `filename`. Upload URLs are valid for only a short time; they
   * should be requested when an upload is needed, not preemptively in case one
   * may be needed in the future.
   */
  scratchFile: ScratchUpload;
};


export type ProfileQueryScratchFileArgs = {
  contentType: Scalars['String']['input'];
  originalFilename: InputMaybe<Scalars['String']['input']>;
};

export type Quantity = {
  __typename?: 'Quantity';
  quantity: Scalars['Float']['output'];
  units: Maybe<UnitOfMeasure>;
};

export type Query = {
  __typename?: 'Query';
  favorite: FavoriteQuery;
  /** DEPRECATED: prefer `profile.me` */
  getCurrentUser: Maybe<User>;
  labels: LabelsQuery;
  library: LibraryQuery;
  node: Maybe<Node>;
  pantry: PantryQuery;
  planner: PlannerQuery;
  profile: ProfileQuery;
  textract: TextractQuery;
};


export type QueryNodeArgs = {
  id: Scalars['ID']['input'];
};

export enum Rating {
  FiveStars = 'FIVE_STARS',
  FourStars = 'FOUR_STARS',
  OneStar = 'ONE_STAR',
  ThreeStars = 'THREE_STARS',
  TwoStars = 'TWO_STARS'
}

export type Recipe = Ingredient & Node & Owned & {
  __typename?: 'Recipe';
  calories: Maybe<Scalars['Int']['output']>;
  directions: Maybe<Scalars['String']['output']>;
  externalUrl: Maybe<Scalars['String']['output']>;
  favorite: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  ingredients: Array<IngredientRef>;
  labels: Maybe<Array<Scalars['String']['output']>>;
  name: Scalars['String']['output'];
  owner: User;
  photo: Maybe<Photo>;
  /**
   * Number of times this recipe has been sent to any plan, optionally
   * filtered by the result status (only COMPLETED and DELETED make sense).
   */
  plannedCount: Scalars['Int']['output'];
  /**
   * History of this recipe being planned, in reverse-chronological order,
   * optionally filtered by the result status (only COMPLETED and DELETED make
   * sense). By default, only the five most recent records will be returned.
   */
  plannedHistory: Array<PlannedRecipeHistory>;
  share: ShareInfo;
  /**
   * All subrecipes. Multiple layers of nested recipes are flattened, and the
   * contextual recipe is not included.
   */
  subrecipes: Array<Recipe>;
  totalTime: Maybe<Scalars['Int']['output']>;
  yield: Maybe<Scalars['Int']['output']>;
};


export type RecipeIngredientsArgs = {
  ingredients?: Array<Scalars['ID']['input']>;
};


export type RecipePlannedCountArgs = {
  status?: InputMaybe<PlanItemStatus>;
};


export type RecipePlannedHistoryArgs = {
  last?: InputMaybe<Scalars['NonNegativeInt']['input']>;
  status?: InputMaybe<PlanItemStatus>;
};


export type RecipeTotalTimeArgs = {
  unit?: InputMaybe<ChronoUnit>;
};

export type RecipeConnection = {
  __typename?: 'RecipeConnection';
  edges: Array<RecipeConnectionEdge>;
  pageInfo: PageInfo;
};

export type RecipeConnectionEdge = {
  __typename?: 'RecipeConnectionEdge';
  cursor: Scalars['Cursor']['output'];
  node: Recipe;
};

export type RecipeHistoryMutation = {
  __typename?: 'RecipeHistoryMutation';
  recipeId: Scalars['ID']['output'];
  /** Set/update the notes on this history item. */
  setNotes: PlannedRecipeHistory;
  /**
   * Set/update the rating on this history item. Either rating OR ratingInt
   * should be supplied, not both.
   */
  setRating: PlannedRecipeHistory;
};


export type RecipeHistoryMutationSetNotesArgs = {
  id: Scalars['ID']['input'];
  notes: Scalars['String']['input'];
};


export type RecipeHistoryMutationSetRatingArgs = {
  id: Scalars['ID']['input'];
  rating: InputMaybe<Rating>;
  ratingInt: InputMaybe<Scalars['PositiveInt']['input']>;
};

/**
 * A suggestion for what might come next at the cursor position, along with the
 * target range of the raw string it would replace.
 */
export type RecognitionSuggestion = {
  __typename?: 'RecognitionSuggestion';
  name: Scalars['String']['output'];
  target: RecognizedRange;
};

/** The result of recognizing a raw ingredient ref item. */
export type RecognizedItem = {
  __typename?: 'RecognizedItem';
  /** The position of the cursor in the raw string. */
  cursor: Scalars['NonNegativeInt']['output'];
  /** Recognized ranges within the raw string. */
  ranges: Array<RecognizedRange>;
  /** The raw string which was recognized. */
  raw: Scalars['String']['output'];
  /**
   * Suggestions of what the user might wish to insert at the current cursor
   * position. If more than 'count' suggestions are available, the returned
   * subset is unspecified, other than pantry items are preferred to recipes.
   */
  suggestions: Array<RecognitionSuggestion>;
};


/** The result of recognizing a raw ingredient ref item. */
export type RecognizedItemSuggestionsArgs = {
  count?: Scalars['PositiveInt']['input'];
};

/**
 * A recognized quantity in the raw string. The type indicates which of the id
 * or quantity fields will be non-null, if either.
 */
export type RecognizedRange = {
  __typename?: 'RecognizedRange';
  end: Scalars['NonNegativeInt']['output'];
  id: Maybe<Scalars['ID']['output']>;
  quantity: Maybe<Scalars['NonNegativeFloat']['output']>;
  start: Scalars['NonNegativeInt']['output'];
  type: RecognizedRangeType;
};

export enum RecognizedRangeType {
  Item = 'ITEM',
  NewItem = 'NEW_ITEM',
  NewUnit = 'NEW_UNIT',
  Quantity = 'QUANTITY',
  Unit = 'UNIT',
  Unknown = 'UNKNOWN'
}

/**
 * I represent an uploadable "scratch file", which may be PUT without further
 * authentication of the client. Scratch files are identified by their filename,
 * which may be passed to other APIs to "use" an uploaded scratch file.
 */
export type ScratchUpload = {
  __typename?: 'ScratchUpload';
  /** The cache-control header which must be set on the request. */
  cacheControl: Scalars['String']['output'];
  /** The content type of the scratch file. */
  contentType: Scalars['String']['output'];
  /** INFORMATIONAL: an example cURL command you might use to upload the file. */
  curl: Scalars['String']['output'];
  /** When the URL's signature will expire. */
  expiration: Scalars['DateTime']['output'];
  /** The filename which uniquely identifies the uploaded scratch file. */
  filename: Scalars['String']['output'];
  /** The URL to PUT the scratch file to. */
  url: Scalars['String']['output'];
};

export type ShareInfo = {
  __typename?: 'ShareInfo';
  id: Scalars['ID']['output'];
  secret: Scalars['String']['output'];
  slug: Scalars['String']['output'];
};

export enum SortDir {
  Asc = 'ASC',
  Desc = 'DESC'
}

export type TextractBox = {
  __typename?: 'TextractBox';
  height: Scalars['NonNegativeFloat']['output'];
  left: Scalars['NonNegativeFloat']['output'];
  top: Scalars['NonNegativeFloat']['output'];
  width: Scalars['NonNegativeFloat']['output'];
};

export type TextractJob = {
  __typename?: 'TextractJob';
  id: Scalars['ID']['output'];
  /** Lines of extracted text. Will only have data if 'ready' is true. */
  lines: Maybe<Array<TextractLine>>;
  photo: FileInfo;
  ready: Scalars['Boolean']['output'];
};

export type TextractLine = {
  __typename?: 'TextractLine';
  box: TextractBox;
  text: Scalars['String']['output'];
};

export type TextractMutation = {
  __typename?: 'TextractMutation';
  /** DEPRECATED: Uploads over GraphQL have CSRF issues. Use textract.createPreUploadedJob instead. */
  createJob: TextractJob;
  /**
   * Create a new job from a pre-uploaded file. Use the `profile.photoUpload`
   * field to obtain a pre-signed upload URL, and pass its filename here when done.
   */
  createPreUploadedJob: TextractJob;
  deleteJob: Deletion;
};


export type TextractMutationCreateJobArgs = {
  photo: Scalars['Upload']['input'];
};


export type TextractMutationCreatePreUploadedJobArgs = {
  filename: Scalars['String']['input'];
};


export type TextractMutationDeleteJobArgs = {
  id: Scalars['ID']['input'];
};

export type TextractQuery = {
  __typename?: 'TextractQuery';
  jobById: TextractJob;
  /** List all jobs the current user owns. */
  listJobs: Array<TextractJob>;
};


export type TextractQueryJobByIdArgs = {
  id: Scalars['ID']['input'];
};

export type UnitOfMeasure = Node & {
  __typename?: 'UnitOfMeasure';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type UnsavedBucket = {
  date: InputMaybe<Scalars['Date']['input']>;
  name: InputMaybe<Scalars['String']['input']>;
};

export type User = Node & {
  __typename?: 'User';
  devices: Array<UserDevice>;
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  imageUrl: Maybe<Scalars['String']['output']>;
  name: Maybe<Scalars['String']['output']>;
  /**
   * A value for every preference is returned. If a deviceKey is provided,
   * that device's values are preferred. Otherwise, the user's global preferences
   * are used, if they exists. If not, the static default is returned.
   */
  preferences: Array<UserPreference>;
  provider: Scalars['String']['output'];
  roles: Array<Scalars['String']['output']>;
};


export type UserPreferencesArgs = {
  deviceKey: InputMaybe<Scalars['String']['input']>;
};

export type UserDevice = Node & {
  __typename?: 'UserDevice';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  lastEnsuredAt: Scalars['DateTime']['output'];
  name: Scalars['String']['output'];
  preferences: Array<UserPreference>;
  user: User;
};

export type UserPreference = {
  __typename?: 'UserPreference';
  device: Maybe<UserDevice>;
  name: Scalars['String']['output'];
  type: DataType;
  user: User;
  value: Maybe<Scalars['String']['output']>;
};

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', getCurrentUser: { __typename?: 'User', id: string, name: string | null, email: string, imageUrl: string | null, provider: string, roles: Array<string> } | null };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: DocumentTypeDecoration<TResult, TVariables>['__apiType'];
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const MeDocument = new TypedDocumentString(`
    query me {
  getCurrentUser {
    id
    name
    email
    imageUrl
    provider
    roles
  }
}
    `) as unknown as TypedDocumentString<MeQuery, MeQueryVariables>;