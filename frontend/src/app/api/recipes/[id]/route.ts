import recipes from "@/data/recipes.json";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const items = recipes as Array<Record<string, unknown>>;
  const recipe =
    items.find((item) => typeof item?.recipe_id === "string" && String(item.recipe_id) === id) ?? null;

  if (!recipe) {
    return Response.json({ message: "Could not load this recipe" }, { status: 404 });
  }

  return Response.json(recipe);
}
