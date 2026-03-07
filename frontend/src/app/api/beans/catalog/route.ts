import beansCatalog from "@/data/beans_catalog.json";

type CatalogItem = {
  coffee_id: string;
  name: string;
  roaster: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roaster = searchParams.get("roaster")?.trim().toLowerCase();

  const beans = (beansCatalog as CatalogItem[]).filter((bean) => {
    if (!roaster) {
      return true;
    }

    return bean.roaster.toLowerCase() === roaster;
  });

  return Response.json({ beans });
}
