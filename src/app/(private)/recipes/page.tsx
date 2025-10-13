import { Container } from "@/components/ui/layout";
import { PreloadQuery } from "@/lib/apollo-client";
import { gql } from "@apollo/client";
import { Suspense } from "react";

const GET_PLANS = gql(`
  query getPlans {
    planner {
      plans {
        id
        name
      }
    }
  }
`);

export default async function RecipesPage() {
  return (
    <PreloadQuery query={GET_PLANS}>
      <Suspense fallback={<>loading</>}>
        <Container>
          <h1 className="text-xl">Recipe Library</h1>
          <p>something</p>
        </Container>
      </Suspense>
    </PreloadQuery>
  );
}
