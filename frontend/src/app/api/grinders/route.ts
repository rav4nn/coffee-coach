import grinders from "@/data/hand_grinders.json";

export async function GET() {
  return Response.json(grinders.hand_grinders);
}
