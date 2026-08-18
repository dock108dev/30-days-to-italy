import { seedEpisodeState } from "../game/engine";
import type { GameState } from "../game/model";

export type AdminTruthPreviewId =
  | "day-19-no-ticket"
  | "day-21-replacement-bus"
  | "day-21-rebooked"
  | "day-21-refunded"
  | "day-21-cancelled"
  | "day-21-neutral";

export type AdminTruthPreview = {
  id: AdminTruthPreviewId;
  label: string;
  detail: string;
};

export const ADMIN_TRUTH_PREVIEWS: readonly AdminTruthPreview[] = [
  {
    id: "day-19-no-ticket",
    label: "Day 19 · no ferry ticket",
    detail: "€20 available; refund must be refused and either fare may be purchased.",
  },
  {
    id: "day-21-replacement-bus",
    label: "Day 21 · replacement bus",
    detail: "The cancelled ferry was refunded and a replacement bus was taken.",
  },
  {
    id: "day-21-rebooked",
    label: "Day 21 · ferry rebooked",
    detail: "The owned ferry ticket was moved to 15:30 without another charge.",
  },
  {
    id: "day-21-refunded",
    label: "Day 21 · ferry refunded",
    detail: "The owned ferry ticket was refunded and no replacement was bought.",
  },
  {
    id: "day-21-cancelled",
    label: "Day 21 · outing cancelled",
    detail: "The outing ended after the cancellation without a transport account.",
  },
  {
    id: "day-21-neutral",
    label: "Day 21 · no transport history",
    detail: "Giulia can ask only the neutral trip question.",
  },
];

function withoutTransportItems(inventory: string[]): string[] {
  return inventory.filter((item) => !/(ferry|traghetto|bus|autobus)/i.test(item));
}

export function seedAdminTruthPreview(
  current: GameState,
  previewId: AdminTruthPreviewId,
): GameState {
  if (previewId === "day-19-no-ticket") {
    const state = seedEpisodeState(current, "day-19");
    return {
      ...state,
      money: 2000,
      turnId: "d19_01_no_ticket",
      transportMode: "none",
      transportStatus: "none",
      transportTicketPrice: 0,
      busTicket: false,
      ferryMemory: null,
      inventory: withoutTransportItems(state.inventory),
    };
  }

  const state = seedEpisodeState(current, "day-21");
  const common = {
    ...state,
    turnId: "e04_01_usual",
    busTicket: false,
    inventory: withoutTransportItems(state.inventory),
  };

  switch (previewId) {
    case "day-21-replacement-bus":
      return {
        ...common,
        transportMode: "bus",
        transportStatus: "replacement-bus",
        transportTicketPrice: 240,
        busTicket: true,
        ferryMemory: "Ferry cancelled; €10 refunded; replacement bus taken",
        inventory: [...common.inventory, "Replacement bus ticket"],
      };
    case "day-21-rebooked":
      return {
        ...common,
        transportMode: "ferry",
        transportStatus: "rebooked",
        transportTicketPrice: 1000,
        ferryMemory: "Ferry cancelled; rebooked for 15:30",
        inventory: [...common.inventory, "Ferry ticket · 15:30"],
      };
    case "day-21-refunded":
      return {
        ...common,
        transportMode: "none",
        transportStatus: "refunded",
        transportTicketPrice: 0,
        ferryMemory: "Ferry cancelled; ticket refunded; outing cancelled",
      };
    case "day-21-cancelled":
      return {
        ...common,
        transportMode: "none",
        transportStatus: "cancelled",
        transportTicketPrice: 0,
        ferryMemory: "Ferry cancelled; no recovery selected",
      };
    case "day-21-neutral":
      return {
        ...common,
        transportMode: "none",
        transportStatus: "none",
        transportTicketPrice: 0,
        ferryMemory: null,
        knownFacts: common.knownFacts.filter(
          (fact) => !/(ferry|traghetto|bus|autobus|refund|rimbor)/i.test(fact),
        ),
      };
  }
}
