import { randomUUID } from "crypto";

import beansCatalog from "@/data/beans_catalog.json";

import { getUserBeans, setUserBeans } from "../beans/store";

type CatalogItem = {
  coffee_id: string;
  name: string;
  roaster: string;
};

type Body = {
  coffee_id?: string;
  roast_date?: string | null;
  is_pre_ground?: boolean;
};

function getUserId(request: Request) {
  return request.headers.get("X-User-Id") ?? "coffee-coach-user";
}

export async function GET(request: Request) {
  const userId = getUserId(request);
  return Response.json({ beans: getUserBeans(userId) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  if (!body.coffee_id) {
    return Response.json({ message: "coffee_id is required" }, { status: 400 });
  }

  const catalogEntry = (beansCatalog as CatalogItem[]).find((bean) => bean.coffee_id === body.coffee_id);
  if (!catalogEntry) {
    return Response.json({ message: "Invalid coffee_id" }, { status: 400 });
  }

  const userId = getUserId(request);
  const existing = getUserBeans(userId);
  const saved = {
    id: randomUUID(),
    coffee_id: body.coffee_id,
    name: catalogEntry.name,
    roaster: catalogEntry.roaster,
    roast_date: body.roast_date ?? null,
    is_pre_ground: Boolean(body.is_pre_ground),
  };

  setUserBeans(userId, [saved, ...existing]);
  return Response.json(saved, { status: 201 });
}
