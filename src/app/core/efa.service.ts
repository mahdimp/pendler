import { Injectable } from "@angular/core";
import type {
  RawDeparture,
  RawDepartureMonitorResponse,
  RawDmDateTime,
  RawDmInfo,
  RawInfo,
  RawJourney,
  RawLeg,
  RawStopFinderPoint,
  RawStopFinderResponse,
  RawTimePoint,
  RawTripResponse,
} from "./efa-raw.types";
import type { Departure, DepartureBoard, DisruptionInfo, Journey, JourneyLeg, StopFinderResult } from "./efa.types";

const STOPFINDER_URL = "https://www3.vvs.de/vvs/widget/XML_STOPFINDER_REQUEST";
const TRIP_URL = "https://www3.vvs.de/mngvvs/XML_TRIP_REQUEST2";
const DM_URL = "https://www3.vvs.de/vvs/widget/XML_DM_REQUEST";

// The VVS EFA API is public, undocumented, and CORS-open (access-control-allow-origin: *) —
// reverse-engineered from https://github.com/zaanposni/vvspy. No API key, no webhook/push
// mechanism, so this client is called directly from the browser and polled on demand.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function fmtTime(d: Date): string {
  return `${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function extractPlatform(point: RawTimePoint | undefined): string | null {
  if (point?.type !== "platform") return null;
  const match = /Gleis\s*(\S+)/i.exec(point.disassembledName ?? "");
  return match ? match[1] : (point.disassembledName ?? null);
}

function minutesBetween(planned: Date, estimated: Date): number {
  return Math.round((estimated.getTime() - planned.getTime()) / 60_000);
}

/** Treats any of the given EFA realtime-status fields (single strings or arrays of them) as cancelled if any mentions "cancel". */
function isCancelledStatus(...statuses: (string | string[] | undefined)[]): boolean {
  return statuses.some((s) => {
    if (!s) return false;
    const values = Array.isArray(s) ? s : [s];
    return values.some((v) => /cancel/i.test(v));
  });
}

function isWalkLeg(leg: RawLeg): boolean {
  return leg.transportation?.product?.name === "footpath";
}

function parseInfo(info: RawInfo, fallbackId: number): DisruptionInfo {
  return {
    id: String(info.id ?? info.title ?? info.content ?? fallbackId),
    title: String(info.title ?? ""),
    content: String(info.content ?? info.subtitle ?? ""),
  };
}

function parseLeg(leg: RawLeg): JourneyLeg {
  const origin = leg.origin ?? {};
  const destination = leg.destination ?? {};
  const infos: DisruptionInfo[] = (leg.infos ?? []).map((info, i) => parseInfo(info, i));
  return {
    lineName: leg.transportation?.disassembledName ?? leg.transportation?.number ?? null,
    isWalk: isWalkLeg(leg),
    originName: origin.name ?? "",
    originPlatform: extractPlatform(origin),
    departurePlanned: new Date(origin.departureTimePlanned ?? ""),
    departureEstimated: new Date(origin.departureTimeEstimated ?? origin.departureTimePlanned ?? ""),
    destinationName: destination.name ?? "",
    destinationPlatform: extractPlatform(destination),
    arrivalPlanned: new Date(destination.arrivalTimePlanned ?? ""),
    arrivalEstimated: new Date(destination.arrivalTimeEstimated ?? destination.arrivalTimePlanned ?? ""),
    cancelled: isCancelledStatus(leg.realtimeStatus),
    infos,
  };
}

function parseJourney(rawJourney: RawJourney): Journey {
  const legs = (rawJourney.legs ?? []).map(parseLeg);
  const firstLeg = legs[0];
  const lastLeg = legs[legs.length - 1];
  const firstTransitLeg = legs.find((l) => !l.isWalk) ?? firstLeg;

  const disruptionsById = new Map<string, DisruptionInfo>();
  for (const leg of legs) for (const info of leg.infos) disruptionsById.set(info.id, info);

  return {
    legs,
    departurePlanned: firstLeg.departurePlanned,
    departureEstimated: firstLeg.departureEstimated,
    arrivalPlanned: lastLeg.arrivalPlanned,
    arrivalEstimated: lastLeg.arrivalEstimated,
    departureDelayMinutes: minutesBetween(firstLeg.departurePlanned, firstLeg.departureEstimated),
    arrivalDelayMinutes: minutesBetween(lastLeg.arrivalPlanned, lastLeg.arrivalEstimated),
    originPlatform: firstTransitLeg.originPlatform,
    cancelled: legs.some((l) => l.cancelled),
    disruptions: [...disruptionsById.values()],
  };
}

// DepartureMonitor dateTime objects are plain local wall-clock components (no offset), unlike
// TripRequest's UTC "Z" timestamps. This assumes the browser's timezone is Europe/Berlin,
// same as VVS itself — true for this tool's intended (personal, local) use.
function parseDmDateTime(dt: RawDmDateTime): Date {
  return new Date(Number(dt.year), Number(dt.month) - 1, Number(dt.day), Number(dt.hour), Number(dt.minute));
}

function parseDmInfos(raw: RawDmInfo | RawDmInfo[] | null | undefined): DisruptionInfo[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map((info, i) => ({
    id: String(info.infoLinkText ?? i),
    title: String(info.infoText?.subtitle ?? info.infoLinkText ?? ""),
    content: String(info.infoText?.content ?? ""),
  }));
}

function parseDeparture(raw: RawDeparture): Departure {
  const planned = parseDmDateTime(raw.dateTime);
  const estimated = raw.realDateTime ? parseDmDateTime(raw.realDateTime) : planned;
  const infos = [...parseDmInfos(raw.stopInfos), ...parseDmInfos(raw.lineInfos)];
  return {
    stopName: String(raw.stopName ?? ""),
    lineName: String(raw.servingLine?.symbol ?? raw.servingLine?.number ?? ""),
    mode: String(raw.servingLine?.name ?? ""),
    direction: String(raw.servingLine?.direction ?? ""),
    directionFrom: String(raw.servingLine?.directionFrom ?? ""),
    platform: raw.platform != null ? String(raw.platform) : null,
    platformName: raw.platformName != null ? String(raw.platformName) : null,
    planned,
    estimated,
    delayMinutes: minutesBetween(planned, estimated),
    cancelled: isCancelledStatus(raw.realtimeTripStatus, raw.realtimeStatus),
    operatorName: raw.operator?.name ?? null,
    infos,
  };
}

@Injectable({ providedIn: "root" })
export class EfaService {
  async findStops(query: string): Promise<StopFinderResult[]> {
    const params = new URLSearchParams({
      outputFormat: "JSON",
      language: "de",
      stateless: "1",
      coordOutputFormat: "WGS84",
      locationServerActive: "1",
      type_sf: "any",
      name_sf: query,
      anyObjFilter_sf: "2",
    });
    const res = await fetch(`${STOPFINDER_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(`StopFinder request failed: ${res.status}`);
    const data = (await res.json()) as RawStopFinderResponse;
    const rawPoint = data.stopFinder?.points?.point;
    if (!rawPoint) return [];
    const points: RawStopFinderPoint[] = Array.isArray(rawPoint) ? rawPoint : [rawPoint];
    return points
      .filter((p) => p.anyType === "stop" && p.stateless)
      .map((p) => ({ id: String(p.stateless), name: String(p.name) }));
  }

  /** Queries upcoming departures for a single station. */
  async getDepartures(stopId: string, limit = 15): Promise<DepartureBoard> {
    const now = new Date();
    const params = new URLSearchParams({
      locationServerActive: "1",
      lsShowTrainsExplicit: "1",
      stateless: "1",
      language: "de",
      SpEncId: "0",
      anySigWhenPerfectNoOtherMatches: "1",
      limit: String(limit),
      depArr: "departure",
      type_dm: "any",
      anyObjFilter_dm: "2",
      deleteAssignedStops: "1",
      name_dm: stopId,
      mode: "direct",
      dmLineSelectionAll: "1",
      useRealtime: "1",
      outputFormat: "json",
      coordOutputFormat: "WGS84[DD.ddddd]",
      itdDateYear: String(now.getFullYear()),
      itdDateMonth: pad(now.getMonth() + 1),
      itdDateDay: pad(now.getDate()),
      itdTimeHour: pad(now.getHours()),
      itdTimeMinute: pad(now.getMinutes()),
    });
    const res = await fetch(`${DM_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(`DepartureMonitor request failed: ${res.status}`);
    const data = (await res.json()) as RawDepartureMonitorResponse;
    const raw = data.departureList;
    const departures = raw ? (Array.isArray(raw) ? raw : [raw]).map(parseDeparture) : [];
    const stationNotices = parseDmInfos(data.dm?.points?.point?.infos?.info);
    return { departures, stationNotices };
  }

  /** Queries journey options between two stops near the given time. */
  async getTrips(fromStopId: string, toStopId: string, at: Date, limit = 5): Promise<Journey[]> {
    const params = new URLSearchParams({
      SpEncId: "0",
      calcOneDirection: "1",
      changeSpeed: "normal",
      computationType: "sequence",
      coordOutputFormat: "EPSG:4326",
      deleteAssignedStops: "0",
      deleteITPTWalk: "0",
      descWithElev: "1",
      illumTransfer: "on",
      imparedOptionsActive: "1",
      itOptionsActive: "1",
      itdDate: fmtDate(at),
      itdTime: fmtTime(at),
      language: "de",
      locationServerActive: "1",
      macroWebTrip: "true",
      name_destination: toStopId,
      name_origin: fromStopId,
      noElevationProfile: "1",
      noElevationSummary: "1",
      outputFormat: "rapidJSON",
      outputOptionsActive: "1",
      ptOptionsActive: "1",
      routeType: "leasttime",
      searchLimitMinutes: "360",
      securityOptionsActive: "1",
      serverInfo: "1",
      showInterchanges: "1",
      trITArrMOT: "100",
      trITArrMOTvalue: "15",
      trITDepMOT: "100",
      trITDepMOTvalue: "15",
      tryToFindLocalityStops: "1",
      type_destination: "any",
      type_origin: "any",
      useElevationData: "1",
      useLocalityMainStop: "0",
      useRealtime: "1",
      useUT: "1",
      version: "10.2.10.139",
      w_objPrefAl: "12",
      w_regPrefAm: "1",
    });
    const res = await fetch(`${TRIP_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(`TripRequest failed: ${res.status}`);
    const data = (await res.json()) as RawTripResponse;
    const journeys = data.journeys;
    if (!Array.isArray(journeys) || journeys.length === 0) return [];
    return journeys.slice(0, limit).map(parseJourney);
  }
}
