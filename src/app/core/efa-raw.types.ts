// Wire-format shapes for the (undocumented) VVS EFA API responses. These mirror what the
// service actually observed in practice — kept separate from the clean domain model in
// efa.types.ts so `??`/optional-chaining in the parsers is at least checked against a known
// shape, even though the upstream API gives no formal guarantee about it.

export interface RawStopFinderPoint {
  anyType?: string;
  stateless?: string;
  name?: string;
}

export interface RawStopFinderResponse {
  stopFinder?: {
    points?: {
      point?: RawStopFinderPoint | RawStopFinderPoint[];
    };
  };
}

export interface RawTimePoint {
  name?: string;
  type?: string;
  disassembledName?: string;
  departureTimePlanned?: string;
  departureTimeEstimated?: string;
  arrivalTimePlanned?: string;
  arrivalTimeEstimated?: string;
}

export interface RawInfo {
  id?: string;
  title?: string;
  content?: string;
  subtitle?: string;
}

export interface RawLeg {
  origin?: RawTimePoint;
  destination?: RawTimePoint;
  transportation?: {
    disassembledName?: string;
    number?: string;
    product?: { name?: string };
  };
  infos?: RawInfo[];
  realtimeStatus?: string[];
}

export interface RawJourney {
  legs?: RawLeg[];
}

export interface RawTripResponse {
  journeys?: RawJourney[];
}

export interface RawDmDateTime {
  year: string | number;
  month: string | number;
  day: string | number;
  hour: string | number;
  minute: string | number;
}

export interface RawDmInfo {
  infoLinkText?: string;
  infoText?: { subtitle?: string; content?: string };
}

export interface RawDeparture {
  dateTime: RawDmDateTime;
  realDateTime?: RawDmDateTime;
  realtimeTripStatus?: string;
  realtimeStatus?: string;
  stopInfos?: RawDmInfo | RawDmInfo[] | null;
  lineInfos?: RawDmInfo | RawDmInfo[] | null;
  stopName?: string;
  servingLine?: {
    symbol?: string;
    number?: string;
    name?: string;
    direction?: string;
    directionFrom?: string;
  };
  platform?: string | number;
  platformName?: string;
  operator?: { name?: string };
}

export interface RawDepartureMonitorResponse {
  departureList?: RawDeparture | RawDeparture[];
}
