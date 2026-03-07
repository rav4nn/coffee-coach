import beansCatalog from "@/data/beans_catalog.json";

type CatalogItem = {
  coffee_id: string;
  name: string;
  roaster: string;
};

export async function GET() {
  const roasters = Array.from(new Set((beansCatalog as CatalogItem[]).map((bean) => bean.roaster))).sort();
  return Response.json(roasters);
}
