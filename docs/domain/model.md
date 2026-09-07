# Domain model

State: Agreed  
Source: [`schema.graphql`](../../schema.graphql)

This is a compact map of the types and relationships exposed by the GraphQL
schema. It leaves out queries, mutations, pagination, search inputs, file
uploads, and recognition results.

## Recipes and ingredients

```mermaid
classDiagram
  direction LR

  class User
  class Ingredient {
    <<interface>>
  }
  class IngredientCollection {
    <<interface>>
  }
  class Recipe
  class Section
  class PantryItem
  class IngredientRef
  class Quantity
  class UnitOfMeasure

  Ingredient <|.. Recipe
  Ingredient <|.. PantryItem
  IngredientCollection <|.. Recipe
  IngredientCollection <|.. Section
  User "1" --> "0..*" Recipe : owns
  Recipe "0..1" *-- "0..*" Section : owns
  Recipe "1" *-- "0..*" IngredientRef : ingredients
  Section "1" *-- "0..*" IngredientRef : ingredients
  IngredientRef "0..*" --> "0..1" Ingredient : refers to
  IngredientRef "1" *-- "0..1" Quantity : measures
  Quantity "0..*" --> "0..1" UnitOfMeasure : uses
```

Both recipes and pantry items are ingredients. This lets a recipe contain a
pantry item or another recipe through an ingredient reference. A section is a
named collection of ingredients and directions. A recipe may own a section or
refer to one owned elsewhere.

## Planning

```mermaid
classDiagram
  direction LR

  class User
  class Ingredient
  class Recipe
  class Plan
  class PlanItem
  class PlanBucket
  class AccessControlEntry
  class AccessLevel {
    <<enumeration>>
    VIEW
    CHANGE
    ADMINISTER
  }
  class PlanItemStatus {
    <<enumeration>>
    NEEDED
    ACQUIRED
    COMPLETED
    DELETED
  }
  class PlannedRecipeHistory

  User "1" --> "0..*" Plan : owns
  Plan "1" o-- "0..*" AccessControlEntry : grants
  AccessControlEntry "0..*" --> "1" User : user
  AccessControlEntry --> AccessLevel : level
  Plan "1" *-- "0..*" PlanItem : root items
  PlanItem "0..1" *-- "0..*" PlanItem : parent / children
  PlanItem "0..1" o-- "0..*" PlanItem : aggregate / components
  Plan "1" *-- "0..*" PlanBucket : buckets
  PlanItem "0..*" --> "0..1" PlanBucket : grouped in
  PlanItem "0..*" --> "0..1" Ingredient : refers to
  PlanItem --> PlanItemStatus : status
  Recipe "1" --> "0..*" PlannedRecipeHistory : history
  PlannedRecipeHistory "0..*" --> "1" User : owner
  PlannedRecipeHistory --> PlanItemStatus : result
```

A plan is the root of a tree of plan items. A plan item may also participate in
a separate aggregate/component relationship. Buckets group items within one
plan and may give that group a name and date.

The plan owner may grant one access level to each other user. Recipe history
records when a recipe was planned and finished, who owns that history entry,
and its resulting status.

## Accounts and preferences

```mermaid
classDiagram
  direction LR

  class User
  class UserDevice
  class UserPreference
  class Favorite {
    objectType
    objectId
  }
  class Recipe
  class Plan
  class ShareInfo

  User "1" *-- "0..*" UserDevice : devices
  User "1" *-- "0..*" UserPreference : preferences
  UserDevice "0..1" o-- "0..*" UserPreference : overrides
  User "1" *-- "0..*" Favorite : favorites
  Recipe "1" *-- "1" ShareInfo : share link
  Plan "1" *-- "1" ShareInfo : share link
```

A preference belongs to a user and may be specific to one device. When the
device-specific value is absent, the user-level value and then the static
default are used. Favorites point to their target by object type and ID.

## Rules not shown in the diagrams

- A plan is the root of its plan-item tree and cannot have a parent.
- Following a plan item's parents always leads to its plan.
- A plan item can only use a bucket from the same plan.
- Recipe sections and recipe ingredients are separate collections.
- An ingredient reference may remain as raw text when it has not been matched
  to an ingredient.
- A user's access grant is unique within a plan.
