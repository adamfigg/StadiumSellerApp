import "server-only";

/**
 * TCGdex — free Pokémon TCG API, no key required. https://tcgdex.dev
 * Images: `${image}/low.webp` (thumb) or `${image}/high.webp` (full).
 */
const BASE = process.env.TCGDEX_API_URL ?? "https://api.tcgdex.net/v2/en";

export interface CardSummary {
  id: string;
  name: string;
  number: string;
  setId: string;
  setName: string;
  image: string;
}

export interface CardDetails extends CardSummary {
  rarity?: string;
  illustrator?: string;
  /** TCGplayer market price (USD) for the ungraded card, when TCGdex has one. */
  marketPrice?: number;
}

interface ApiSet {
  id: string;
  name: string;
  cardCount?: { official?: number };
}

interface ApiCardBrief {
  id: string;
  localId: string;
  name: string;
  image?: string;
}

interface ApiCard extends ApiCardBrief {
  rarity?: string;
  illustrator?: string;
  set: ApiSet;
  pricing?: { tcgplayer?: Record<string, unknown> };
}

async function get<T>(path: string, revalidate: number): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, { next: { revalidate } });
  if (!res.ok) throw new Error(`TCGdex ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}

async function getSets(): Promise<Map<string, ApiSet>> {
  const sets = await get<ApiSet[]>("sets", 86_400);
  return new Map(sets.map((s) => [s.id, s]));
}

const number = (localId: string, set?: ApiSet) =>
  set?.cardCount?.official ? `${localId}/${set.cardCount.official}` : localId;

/** Name search. Skips TCG Pocket (digital-only) cards and cards without images. */
export async function searchCards(query: string, limit = 24): Promise<CardSummary[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const [sets, cards] = await Promise.all([
    getSets(),
    get<ApiCardBrief[]>(
      `cards?name=${encodeURIComponent(q)}&pagination:itemsPerPage=100`,
      3_600,
    ),
  ]);
  const results: CardSummary[] = [];
  for (const c of cards) {
    if (!c.image || c.image.includes("/tcgp/")) continue;
    const setId = c.id.slice(0, c.id.length - c.localId.length - 1);
    const set = sets.get(setId);
    if (!set) continue;
    results.push({
      id: c.id,
      name: c.name,
      number: number(c.localId, set),
      setId,
      setName: set.name,
      image: c.image,
    });
    if (results.length >= limit) break;
  }
  return results;
}

function marketPrice(tcgplayer?: Record<string, unknown>): number | undefined {
  if (!tcgplayer) return undefined;
  for (const value of Object.values(tcgplayer)) {
    const price = (value as { marketPrice?: unknown } | null)?.marketPrice;
    if (typeof price === "number" && price > 0) return price;
  }
  return undefined;
}

export async function getCard(id: string): Promise<CardDetails | undefined> {
  if (!/^[\w.-]+$/.test(id)) return undefined;
  try {
    const c = await get<ApiCard>(`cards/${id}`, 3_600);
    if (!c.image) return undefined;
    return {
      id: c.id,
      name: c.name,
      number: number(c.localId, c.set),
      setId: c.set.id,
      setName: c.set.name,
      image: c.image,
      rarity: c.rarity,
      illustrator: c.illustrator,
      marketPrice: marketPrice(c.pricing?.tcgplayer),
    };
  } catch {
    return undefined;
  }
}
