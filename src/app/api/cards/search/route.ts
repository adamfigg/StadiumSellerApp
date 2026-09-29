import { searchCards } from "@/lib/tcgdex";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  try {
    return Response.json(await searchCards(q));
  } catch {
    return Response.json({ error: "Card search is unavailable right now." }, { status: 502 });
  }
}
