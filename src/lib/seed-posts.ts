import type { CardCondition } from "./types";

/**
 * Extra demo posts so the browse page has real volume. Card details (image, set, number, rarity,
 * market price) are real TCGdex data captured when this file was written.
 * Times are hours relative to seeding: `posted` hours ago, open for `days`.
 */

type Card = { tcgCardId: string; cardName: string; setName: string; cardNumber: string; rarity: string; marketPrice: number; officialImage: string };

const card = (tcgCardId: string, cardName: string, setName: string, cardNumber: string, rarity: string, marketPrice: number, path: string): Card => ({
  tcgCardId,
  cardName,
  setName,
  cardNumber,
  rarity,
  marketPrice,
  officialImage: `https://assets.tcgdex.net/en/${path}`,
});

const C = {
  blastoise: card("base1-2", "Blastoise", "Base Set", "2/102", "Rare", 222.34, "base/base1/2"),
  venusaur: card("base1-15", "Venusaur", "Base Set", "15/102", "Rare", 173.95, "base/base1/15"),
  pikachuBase: card("base1-58", "Pikachu", "Base Set", "58/102", "Common", 12.88, "base/base1/58"),
  mewtwo: card("base1-10", "Mewtwo", "Base Set", "10/102", "Rare", 93.47, "base/base1/10"),
  zapdos: card("base1-16", "Zapdos", "Base Set", "16/102", "Rare", 46.93, "base/base1/16"),
  gyarados: card("base1-6", "Gyarados", "Base Set", "6/102", "Rare", 44.67, "base/base1/6"),
  alakazam: card("base1-1", "Alakazam", "Base Set", "1/102", "Rare", 69.72, "base/base1/1"),
  lugiaNeo: card("neo1-9", "Lugia", "Neo Genesis", "9/111", "Rare", 164.8, "neo/neo1/9"),
  darkCrobat: card("ex7-3", "Dark Crobat", "Team Rocket Returns", "3/109", "Rare", 35.06, "ex/ex7/3"),
  charizardEvo: card("xy12-11", "Charizard", "Evolutions", "11/108", "Rare", 102.04, "xy/xy12/11"),
  jessieJames: card("sm115-68", "Jessie & James", "Hidden Fates", "68/68", "Ultra Rare", 74.39, "sm/sm115/68"),
  rayquaza: card("swsh7-218", "Rayquaza VMAX", "Evolving Skies", "218/203", "Secret Rare", 1255.44, "swsh/swsh7/218"),
  sylveonVmax: card("swsh7-212", "Sylveon VMAX", "Evolving Skies", "212/203", "Secret Rare", 384.06, "swsh/swsh7/212"),
  umbreonV: card("swsh7-189", "Umbreon V", "Evolving Skies", "189/203", "Ultra Rare", 385.19, "swsh/swsh7/189"),
  sylveonV: card("swsh7-184", "Sylveon V", "Evolving Skies", "184/203", "Ultra Rare", 200.36, "swsh/swsh7/184"),
  gengar: card("swsh8-271", "Gengar VMAX", "Fusion Strike", "271/264", "Secret Rare", 1026.43, "swsh/swsh8/271"),
  charizardVstar: card("swsh9-174", "Charizard VSTAR", "Brilliant Stars", "174/172", "Secret Rare", 69.99, "swsh/swsh9/174"),
  giratina: card("swsh11-186", "Giratina V", "Lost Origin", "186/196", "Ultra Rare", 844.22, "swsh/swsh11/186"),
  lugiaV: card("swsh12-186", "Lugia V", "Silver Tempest", "186/195", "Ultra Rare", 516.38, "swsh/swsh12/186"),
  iono: card("sv02-269", "Iono", "Paldea Evolved", "269/193", "Special illustration rare", 54.47, "sv/sv02/269"),
  charizardOf: card("sv03-223", "Charizard ex", "Obsidian Flames", "223/197", "Special illustration rare", 99.83, "sv/sv03/223"),
  charizard151: card("sv03.5-199", "Charizard ex", "151", "199/165", "Special illustration rare", 354.07, "sv/sv03.5/199"),
  mewHyper: card("sv03.5-205", "Mew ex", "151", "205/165", "Hyper rare", 26.93, "sv/sv03.5/205"),
  bulbasaur: card("sv03.5-166", "Bulbasaur", "151", "166/165", "Illustration rare", 72.77, "sv/sv03.5/166"),
  charmander: card("sv03.5-168", "Charmander", "151", "168/165", "Illustration rare", 92.04, "sv/sv03.5/168"),
  squirtle: card("sv03.5-170", "Squirtle", "151", "170/165", "Illustration rare", 84.96, "sv/sv03.5/170"),
  charizardPf: card("sv04.5-234", "Charizard ex", "Paldean Fates", "234/91", "Special illustration rare", 264.25, "sv/sv04.5/234"),
  mewPf: card("sv04.5-232", "Mew ex", "Paldean Fates", "232/91", "Special illustration rare", 869.4, "sv/sv04.5/232"),
  greninja: card("sv06-214", "Greninja ex", "Twilight Masquerade", "214/167", "Special illustration rare", 337.24, "sv/sv06/214"),
  pikachuEx: card("sv08-238", "Pikachu ex", "Surging Sparks", "238/191", "Special illustration rare", 285.29, "sv/sv08/238"),
};

const raw = (condition: Extract<CardCondition, { kind: "raw" }>["condition"]): CardCondition => ({ kind: "raw", condition });
const graded = (company: Extract<CardCondition, { kind: "graded" }>["company"], grade: string): CardCondition => ({ kind: "graded", company, grade });

/** [seller id, price, shipping ("local" = meetup), hours ago, message?] */
type DemoOffer = [sellerId: string, price: number, shipping: number | "local", hoursAgo: number, message?: string];

export type DemoPost = {
  id: string;
  buyerId: string;
  card: Card;
  condition: CardCondition;
  budget: [min: number, max: number];
  scope?: "local" | "nationwide";
  posted: number;
  days: number;
  description?: string;
  offers?: DemoOffer[];
  /** Index into `offers` the buyer accepted (pending or sold). */
  accepted?: number;
  status?: "pending" | "sold" | "no_deal";
  closedReason?: "sold" | "buyer_closed" | "expired";
  closedHoursAgo?: number;
};

export const DEMO_POSTS: DemoPost[] = [
  {
    id: "w_blastoise", buyerId: "u_jordan", card: C.blastoise, condition: raw("Lightly Played"), budget: [180, 240], scope: "local", posted: 30, days: 5,
    description: "Childhood binder rebuild. Light whitening is fine, no creases.",
    offers: [["u_dex", 205, "local", 20, "Can meet in Austin this weekend."], ["u_cardvault", 215, 8, 25], ["u_topdeck", 219, 6, 10, "Ships in a top loader and team bag."]],
  },
  {
    id: "w_venusaur", buyerId: "u_priya", card: C.venusaur, condition: graded("PSA", "8"), budget: [350, 500], posted: 50, days: 7,
    description: "Looking for a PSA 8 to finish my Base Set starters.",
    offers: [["u_topdeck", 489, 15, 40], ["u_cardvault", 470, 12, 12, "Clean slab, no scratches on the case."]],
  },
  {
    id: "w_pikachu_base", buyerId: "u_marcus", card: C.pikachuBase, condition: raw("Near Mint"), budget: [10, 20], posted: 8, days: 3,
    description: "Red cheeks or yellow cheeks, either works. Just want a clean one.",
    offers: [["u_eli", 12, 1, 6, "Yellow cheeks, pulled from my own collection."], ["u_hana", 14, 1, 3]],
  },
  {
    id: "w_mewtwo", buyerId: "u_maya", card: C.mewtwo, condition: graded("CGC", "9"), budget: [150, 220], posted: 70, days: 7,
    offers: [["u_topdeck", 199, 10, 60]],
  },
  {
    id: "w_zapdos", buyerId: "u_priya", card: C.zapdos, condition: raw("Lightly Played"), budget: [30, 50], posted: 4, days: 2,
    description: "Holo scratches are ok if the front looks good.",
  },
  {
    id: "w_lugia_neo", buyerId: "u_marcus", card: C.lugiaNeo, condition: raw("Moderately Played"), budget: [120, 170], posted: 26, days: 5,
    description: "Moderate play is fine, it's going in a binder.",
    offers: [["u_dex", 158, 8, 22], ["u_topdeck", 149, 12, 5, "Some edge wear, holo is bright."]],
  },
  {
    id: "w_zard151", buyerId: "u_priya", card: C.charizard151, condition: raw("Near Mint"), budget: [320, 380], posted: 20, days: 4,
    description: "Pack fresh only. Please include photos of the centering.",
    offers: [["u_hana", 339, 5, 15, "Pulled it last month, straight into a sleeve."], ["u_cardvault", 349, 5, 12], ["u_topdeck", 344, 8, 4]],
  },
  {
    id: "w_mew_hyper", buyerId: "u_jordan", card: C.mewHyper, condition: raw("Near Mint"), budget: [20, 35], posted: 12, days: 3,
    offers: [["u_eli", 24, 4, 9]],
  },
  {
    id: "w_zard_of", buyerId: "u_maya", card: C.charizardOf, condition: graded("PSA", "10"), budget: [180, 240], posted: 40, days: 5,
    offers: [["u_topdeck", 215, 15, 30], ["u_hana", 225, 10, 28]],
    accepted: 0, status: "pending",
  },
  {
    id: "w_zard_pf", buyerId: "u_marcus", card: C.charizardPf, condition: raw("Near Mint"), budget: [240, 290], posted: 90, days: 7,
    offers: [["u_eli", 270, 5, 85], ["u_hana", 262, 5, 80, "Mint copy, can ship tomorrow."]],
    accepted: 1, status: "sold", closedReason: "sold", closedHoursAgo: 60,
  },
  {
    id: "w_iono", buyerId: "u_priya", card: C.iono, condition: raw("Near Mint"), budget: [45, 60], posted: 15, days: 3,
    description: "Iono SIR for my trainer binder.",
    offers: [["u_hana", 52, 4, 10], ["u_eli", 49, 5, 7]],
  },
  {
    id: "w_rayquaza", buyerId: "u_jordan", card: C.rayquaza, condition: graded("PSA", "9"), budget: [1100, 1400], posted: 33, days: 7,
    description: "Dream card. Want a sharp PSA 9 with good centering.",
    offers: [["u_cardvault", 1249, 25, 28, "Fully insured, signature required."], ["u_topdeck", 1299, 20, 20], ["u_dex", 1285, "local", 6, "Austin meetup at my shop."]],
  },
  {
    id: "w_sylveon_vmax", buyerId: "u_maya", card: C.sylveonVmax, condition: raw("Near Mint"), budget: [340, 400], scope: "local", posted: 18, days: 4,
    description: "Would love to meet up in Utah County or SLC.",
    offers: [["u_cardvault", 365, "local", 14, "Come by the shop any afternoon."]],
  },
  {
    id: "w_giratina", buyerId: "u_marcus", card: C.giratina, condition: raw("Near Mint"), budget: [780, 880], posted: 55, days: 7,
    description: "Alt art Giratina, raw NM. Serious offers only.",
    offers: [["u_topdeck", 859, 20, 44], ["u_cardvault", 839, 15, 30]],
  },
  {
    id: "w_zard_vstar", buyerId: "u_eli", card: C.charizardVstar, condition: raw("Near Mint"), budget: [55, 75], posted: 10, days: 3,
    description: "Picking one up for a friend's birthday.",
    offers: [["u_hana", 64, 5, 6]],
  },
  {
    id: "w_gengar", buyerId: "u_priya", card: C.gengar, condition: graded("PSA", "10"), budget: [1600, 1900], posted: 60, days: 7,
    description: "Gengar VMAX alt in a 10. Will pay more for great eye appeal.",
    offers: [["u_topdeck", 1725, 30, 50], ["u_dex", 1790, 25, 20]],
  },
  {
    id: "w_greninja", buyerId: "u_jordan", card: C.greninja, condition: raw("Near Mint"), budget: [300, 360], posted: 5, days: 2,
  },
  {
    id: "w_pikachu_ex", buyerId: "u_maya", card: C.pikachuEx, condition: raw("Near Mint"), budget: [260, 310], posted: 22, days: 4,
    description: "Surging Sparks Pikachu for my son.",
    offers: [["u_eli", 275, 5, 18], ["u_hana", 279, 5, 12], ["u_cardvault", 284, "local", 8]],
  },
  {
    id: "w_jessie_james", buyerId: "u_marcus", card: C.jessieJames, condition: raw("Lightly Played"), budget: [55, 80], posted: 100, days: 5,
    offers: [["u_topdeck", 79, 6, 90]],
    status: "no_deal", closedReason: "buyer_closed", closedHoursAgo: 30,
  },
  {
    id: "w_zard_evo", buyerId: "u_priya", card: C.charizardEvo, condition: raw("Near Mint"), budget: [80, 110], posted: 130, days: 5,
    status: "no_deal", closedReason: "expired",
  },
  {
    id: "w_dark_crobat", buyerId: "u_jordan", card: C.darkCrobat, condition: raw("Lightly Played"), budget: [25, 40], scope: "local", posted: 45, days: 6,
    offers: [["u_dex", 30, "local", 40]],
  },
  {
    id: "w_umbreon_v", buyerId: "u_marcus", card: C.umbreonV, condition: raw("Near Mint"), budget: [350, 420], posted: 28, days: 5,
    description: "The Umbreon V alt with the city lights.",
    offers: [["u_cardvault", 389, 10, 24], ["u_eli", 395, 6, 16], ["u_topdeck", 379, 15, 3, "Beat the others, ships same day."]],
  },
  {
    id: "w_sylveon_v", buyerId: "u_hana", card: C.sylveonV, condition: raw("Near Mint"), budget: [170, 220], posted: 16, days: 3,
    offers: [["u_cardvault", 195, 8, 11]],
  },
  {
    id: "w_lugia_v", buyerId: "u_maya", card: C.lugiaV, condition: graded("PSA", "9"), budget: [480, 560], posted: 36, days: 6,
    offers: [["u_dex", 529, 15, 30], ["u_topdeck", 519, 20, 26]],
  },
  {
    id: "w_bulbasaur", buyerId: "u_priya", card: C.bulbasaur, condition: raw("Near Mint"), budget: [60, 80], posted: 9, days: 3,
    description: "Collecting all three 151 starter illustration rares.",
    offers: [["u_hana", 69, 4, 5]],
  },
  {
    id: "w_charmander", buyerId: "u_priya", card: C.charmander, condition: raw("Near Mint"), budget: [80, 100], posted: 9, days: 3,
    description: "Collecting all three 151 starter illustration rares.",
    offers: [["u_eli", 85, 4, 6], ["u_hana", 88, 4, 4]],
  },
  {
    id: "w_squirtle", buyerId: "u_priya", card: C.squirtle, condition: raw("Near Mint"), budget: [75, 95], posted: 9, days: 3,
    description: "Collecting all three 151 starter illustration rares.",
  },
  {
    id: "w_mew_pf", buyerId: "u_jordan", card: C.mewPf, condition: graded("PSA", "10"), budget: [900, 1100], posted: 48, days: 7,
    description: "Gold Mew in a 10.",
    offers: [["u_cardvault", 1049, 20, 40], ["u_hana", 1030, 15, 12]],
  },
  {
    id: "w_gyarados", buyerId: "u_marcus", card: C.gyarados, condition: raw("Heavily Played"), budget: [20, 35], posted: 3, days: 1,
    description: "Heavily played is fine, I just want the holo.",
  },
  {
    id: "w_alakazam", buyerId: "u_maya", card: C.alakazam, condition: raw("Moderately Played"), budget: [45, 70], posted: 58, days: 7,
    offers: [["u_dex", 55, 5, 40], ["u_eli", 58, 4, 33]],
  },
];
