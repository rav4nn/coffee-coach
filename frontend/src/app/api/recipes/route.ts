import recipes from "@/data/recipes.json";

type Recipe = {
  recipe_id: string;
  method: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const method = searchParams.get("method");
  const list = recipes as Recipe[];

  const filtered = method ? list.filter((recipe) => recipe.method === method) : list;

  return Response.json({ recipes: filtered });
}
