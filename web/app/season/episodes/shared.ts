import { EPISODE_IDS, type EpisodeId } from "../manifest";
import type { GameState } from "../../game/model";

export function completedBefore(day: number): EpisodeId[] {
  return EPISODE_IDS.filter((_, index) => index < day) as EpisodeId[];
}

export function addFact(facts: readonly string[], fact: string): string[] {
  return [...new Set([...facts, fact])].slice(-40);
}

export function addItem(items: readonly string[], item: string): string[] {
  return [...new Set([...items, item])].slice(-40);
}

const FINAL_MONEY: Record<number, number> = {
  22: 920,
  23: 520,
  24: 520,
  25: 520,
  26: 520,
  27: 520,
  28: 1020,
  29: 780,
  30: 580,
};

/** Canonical, truthful state immediately before a final-arc episode. */
export function finalArcAdminSeed(day: number): Partial<GameState> {
  const after22 = day >= 23;
  const after23 = day >= 24;
  const after24 = day >= 25;
  const after25 = day >= 26;
  const after26 = day >= 27;
  const after27 = day >= 28;
  const after28 = day >= 29;
  const after29 = day >= 30;
  return {
    money: FINAL_MONEY[day] ?? 920,
    hotelKey: true,
    apartmentKey: true,
    keyCustody: { hotel: "held", apartment: "held" },
    completed: completedBefore(day),
    laundryStatus: "clean",
    hotWaterStatus: after27 ? "fixed" : "temporary",
    repairCommitment: after27
      ? { window: "Friday at 10:00", status: "fulfilled" }
      : { window: "Friday at 10:00", status: "active" },
    repairCreditEligibility: day >= 27 ? "eligible" : "unknown",
    repairCreditStatus: after27 ? "issued" : "none",
    parcelStatus: "collected",
    secondParcelStatus: after23 ? "collected" : "none",
    vendorPreference: after22 ? "Panino caprese recommended by Enzo" : null,
    beachWeather: after24 ? "windy-early-close" : "unknown",
    beachPlanStatus: after24 ? "left-for-wind" : "none",
    beachRemedy: "none",
    invitationResponse: after25 ? "maybe" : "none",
    eventAttendance: "unknown",
    tablePreference: after26 ? "quiet" : "none",
    transportPlan: after28 ? {
      id: "day-28-vietri-stand-3",
      firstDeparture: "08:40",
      changeAt: "Vietri",
      connectionTime: "09:35",
      stand: "3",
      fare: 240,
      status: "paid",
    } : null,
    transportMode: after28 ? "bus" : "bus",
    transportStatus: after28 ? "booked" : "replacement-bus",
    transportTicketPrice: after28 ? 240 : 240,
    busTicket: true,
    stayResponse: after29 ? "not-sure" : "unknown",
    inventory: [
      "Clean clothes",
      "Collected parcel",
      ...(after22 ? ["Panino caprese"] : []),
      ...(after23 ? ["Second parcel"] : []),
      ...(after28 ? ["Day-trip bus ticket · 08:40 via Vietri"] : ["Replacement bus ticket"]),
    ],
    relationships: { Giulia: "efficient", Rosa: "efficient", Raffaele: "efficient", Enzo: "efficient", Marta: "neutral" },
    knownFacts: [
      "Ferry cancellation resolved truthfully",
      "Hot water works temporarily; permanent part due Friday at 10:00",
      ...(after22 ? ["Enzo recommended the €4 panino caprese"] : []),
      ...(after23 ? ["Second parcel collected from Marta"] : []),
      ...(after24 ? ["Lido closed early because of fictional high wind"] : []),
      ...(after27 ? ["Hot water permanently fixed; earned €5 repair credit issued"] : []),
      ...(after28 ? ["Day-trip bus: 08:40, change at Vietri, 09:35 from stand 3"] : []),
    ],
    commitments: after27 ? [] : ["Hot-water repair: Friday at 10:00"],
    worldEvents: [
      ...(after23 ? ["day23-second-parcel-collected"] : []),
      ...(after27 ? ["day27-repair-credit-issued"] : []),
      ...(after28 ? ["day28-vietri-fare-paid"] : []),
    ],
  };
}
