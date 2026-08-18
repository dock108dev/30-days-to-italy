import {
  POCKET_DECK_CATEGORY_LABELS,
} from "./catalog";
import type { PocketDeckCard, PocketDeckCategory } from "./model";

export function normalizePocketDeckSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function searchableText(card: PocketDeckCard): string {
  return normalizePocketDeckSearch([
    card.englishIntent,
    card.primaryItalian,
    card.shortItalian,
    card.variation ?? "",
    POCKET_DECK_CATEGORY_LABELS[card.category],
    ...card.searchTerms,
  ].join(" "));
}

export function searchPocketDeckCards(
  cards: readonly PocketDeckCard[],
  query: string,
  category: PocketDeckCategory | null = null,
): PocketDeckCard[] {
  const normalizedQuery = normalizePocketDeckSearch(query);
  const tokens = normalizedQuery.split(" ").filter(Boolean);

  return cards.filter((card) => {
    if (category !== null && card.category !== category) return false;
    if (tokens.length === 0) return true;
    const haystack = searchableText(card);
    return tokens.every((token) => haystack.includes(token));
  });
}
