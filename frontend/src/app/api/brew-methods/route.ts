import brewMethods from "@/data/brew_methods.json";

type BrewMethodRecord = {
  method_id: string;
  display_name: string;
  parent_method: string | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parent = searchParams.get("parent");

  const methods = (brewMethods as BrewMethodRecord[]).filter((method) => {
    if (!parent) {
      return true;
    }

    return method.parent_method === parent;
  });

  return Response.json(methods);
}
