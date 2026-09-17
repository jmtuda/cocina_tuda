import { ImportWorkspace } from "../features/import/import-workspace";
import { RecipeWorkspace } from "../features/recipes/recipe-workspace";

export default function Home() {
  return (
    <>
      <ImportWorkspace />
      <RecipeWorkspace />
    </>
  );
}
