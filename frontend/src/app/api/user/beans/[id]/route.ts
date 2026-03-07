import { getUserBeans, setUserBeans } from "../store";

function getUserId(request: Request) {
  return request.headers.get("X-User-Id") ?? "coffee-coach-user";
}

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(request: Request, { params }: Params) {
  const userId = getUserId(request);
  const { id } = await params;
  const existing = getUserBeans(userId);
  setUserBeans(
    userId,
    existing.filter((bean) => bean.id !== id),
  );
  return new Response(null, { status: 204 });
}
