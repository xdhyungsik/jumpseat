// src/features/zed/zedEngine.js
import {
  AIRPORT_ZONE_MAP,
  ZED_FARES,
  TAX_RATES,
  AIRPORT_COUNTRY,
} from "./zedData";

export function getZone(iata) {
  return AIRPORT_ZONE_MAP[iata.toUpperCase()] ?? null;
}

export function buildZoneKey(zoneA, zoneB) {
  return [zoneA, zoneB].sort().join("|");
}

export function lookupFare(zoneKey, cabin, level) {
  const entry = ZED_FARES[zoneKey];
  if (!entry) return null;
  return entry[cabin]?.[level - 1] ?? null;
}

export function estimateTax(origin, destination) {
  const rateO = TAX_RATES[AIRPORT_COUNTRY[origin]  ?? "DEFAULT"] ?? TAX_RATES.DEFAULT;
  const rateD = TAX_RATES[AIRPORT_COUNTRY[destination] ?? "DEFAULT"] ?? TAX_RATES.DEFAULT;
  return Math.max(rateO, rateD);
}

export function calculateZedFare({ origin, destination, carrier, cabin, level }) {
  const orig = origin.toUpperCase().trim();
  const dest = destination.toUpperCase().trim();

  const zoneO = getZone(orig);
  const zoneD = getZone(dest);

  if (!zoneO) return { ok: false, error: `"${orig}" is not a recognized airport code. Please check and try again.` };
  if (!zoneD) return { ok: false, error: `"${dest}" is not a recognized airport code. Please check and try again.` };

  const zoneKey = buildZoneKey(zoneO.sub, zoneD.sub);
  const baseFare = lookupFare(zoneKey, cabin, level);

  if (baseFare === null) {
    return { ok: false, error: `No ZED fare found for ${zoneO.sub} ↔ ${zoneD.sub}. This zone pair may not have an agreement.` };
  }

  const taxRate = estimateTax(orig, dest);
  const taxes   = parseFloat((baseFare * taxRate).toFixed(2));
  const total   = parseFloat((baseFare + taxes).toFixed(2));

  return {
    ok: true,
    result: {
      origin: orig, destination: dest,
      originZone: zoneO, destinationZone: zoneD,
      zoneKey, carrier, cabin, level,
      baseFare, taxRate, taxes, total,
      currency: "USD",
      disclaimer:
        "Fares are estimates based on typical IATA ZED agreements. " +
        "Always verify the carrier flies your route and confirm fares with your airline's travel desk.",
    },
  };
}