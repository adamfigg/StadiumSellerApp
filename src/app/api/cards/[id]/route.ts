import { getCard } from "@/lib/tcgdex";

export async function GET(_req: Request, ctx: RouteContext<"/api/cards/[id]">) {
  const { id } = await ctx.params;
  const card = await getCard(id);
  return card ? Response.json(card) : Response.json({ error: "Card not found" }, { status: 404 });
}
