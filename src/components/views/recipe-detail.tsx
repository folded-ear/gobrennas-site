"use client";

import { Recipe } from "@/__graphql/graphql";
import { Flex, Header } from "@adobe/react-spectrum";

export default function RecipeDetail({ recipe }: { recipe?: Recipe }) {
  console.log("recipe", recipe);

  return (
    <Flex direction="column">
      <Header>{recipe?.name}</Header>
      <Flex direction="column">
        <div>ingredients</div>
        <div>{recipe?.directions}</div>
      </Flex>
    </Flex>
  );
}
