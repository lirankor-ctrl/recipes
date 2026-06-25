import RecipeForm from "@/components/RecipeForm";
import { PageHeader } from "@/components/ui";

export default function NewRecipePage() {
  return (
    <div>
      <PageHeader title="מתכון חדש" />
      <RecipeForm />
    </div>
  );
}
