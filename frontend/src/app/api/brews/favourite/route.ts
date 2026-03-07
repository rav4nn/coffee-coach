type FavouritePayload = {
  brew_id: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as FavouritePayload;
  if (!payload.brew_id) {
    return Response.json({ message: "brew_id is required" }, { status: 400 });
  }
  return Response.json({ ok: true, brew_id: payload.brew_id });
}
