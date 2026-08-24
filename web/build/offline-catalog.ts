import { CORE_POCKET_DECK_CARDS } from "../app/pocket-deck/catalog";
import { TURNS } from "../app/season/registry";

export const REQUIRED_ENCOUNTER_AUDIO_COUNT = Object.keys(TURNS).length * 2;
export const REQUIRED_POCKET_DECK_AUDIO_COUNT = CORE_POCKET_DECK_CARDS.length * 2;
export const REQUIRED_AUDIO_COUNT =
  REQUIRED_ENCOUNTER_AUDIO_COUNT + REQUIRED_POCKET_DECK_AUDIO_COUNT;
