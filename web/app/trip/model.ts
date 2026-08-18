import { addLocalCalendarDays, isValidLocalDate } from "./date";

export const TRIP_PROFILE_SCHEMA_VERSION = 1 as const;
export const DEFAULT_REGION = "Campania / Amalfi Coast";

export const TRANSPORT_MODES = ["ferry", "bus", "train", "taxi", "walking"] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];
export type TravelParty = "solo" | "accompanied";
export type LodgingType = "hotel" | "rental" | "mixed";
export type BeachPlans = "yes" | "maybe" | "no";
export type SocialPreference = "minimal" | "more";

export type TripProfile = {
  schemaVersion: typeof TRIP_PROFILE_SCHEMA_VERSION;
  departureDate: string;
  tripLengthDays: number;
  regionLabel: string;
  party: TravelParty;
  lodging: LodgingType;
  transport: TransportMode[];
  beachPlans: BeachPlans;
  socialPreference: SocialPreference;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

export function createDefaultTripProfile(now = new Date()): TripProfile {
  return {
    schemaVersion: TRIP_PROFILE_SCHEMA_VERSION,
    departureDate: addLocalCalendarDays(now, 30),
    tripLengthDays: 8,
    regionLabel: DEFAULT_REGION,
    party: "solo",
    lodging: "mixed",
    transport: ["ferry", "bus", "train", "walking"],
    beachPlans: "yes",
    socialPreference: "minimal",
  };
}

export function normalizeTripProfile(value: unknown, now = new Date()): TripProfile | null {
  if (!isRecord(value) || value.schemaVersion !== TRIP_PROFILE_SCHEMA_VERSION) return null;
  const defaults = createDefaultTripProfile(now);

  const region = typeof value.regionLabel === "string"
    ? value.regionLabel.trim().replace(/\s+/g, " ").slice(0, 80)
    : "";
  const requestedLength = typeof value.tripLengthDays === "number" && Number.isFinite(value.tripLengthDays)
    ? Math.round(value.tripLengthDays)
    : defaults.tripLengthDays;
  const selectedTransport = Array.isArray(value.transport)
    ? value.transport.filter(
        (item): item is TransportMode =>
          typeof item === "string" && TRANSPORT_MODES.includes(item as TransportMode),
      )
    : [];
  const transport = [...new Set(selectedTransport)];

  return {
    schemaVersion: TRIP_PROFILE_SCHEMA_VERSION,
    departureDate:
      typeof value.departureDate === "string" && isValidLocalDate(value.departureDate)
        ? value.departureDate
        : defaults.departureDate,
    tripLengthDays: Math.min(30, Math.max(3, requestedLength)),
    regionLabel: region || defaults.regionLabel,
    party: enumValue(value.party, ["solo", "accompanied"], defaults.party),
    lodging: enumValue(value.lodging, ["hotel", "rental", "mixed"], defaults.lodging),
    transport: transport.length > 0 ? transport : defaults.transport,
    beachPlans: enumValue(value.beachPlans, ["yes", "maybe", "no"], defaults.beachPlans),
    socialPreference: enumValue(
      value.socialPreference,
      ["minimal", "more"],
      defaults.socialPreference,
    ),
  };
}
