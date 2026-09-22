import { ImportWorkspace } from "../features/import/import-workspace";
import { RecipeWorkspace } from "../features/recipes/recipe-workspace";
import { PlanningWorkspace } from "../features/planning/planning-workspace";
import { ShoppingWorkspace } from "../features/shopping/shopping-workspace";

export default function Home() {
  return (
    <>
      <ImportWorkspace />
      <RecipeWorkspace />
      <PlanningWorkspace />
      <ShoppingWorkspace />
    </>
  );
}
