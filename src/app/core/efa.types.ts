export interface StopFinderResult {
  id: string;
  name: string;
}

export interface DisruptionInfo {
  id: string;
  title: string;
  content: string;
}

export interface JourneyLeg {
  lineName: string | null;
  isWalk: boolean;
  originName: string;
  originPlatform: string | null;
  departurePlanned: Date;
  departureEstimated: Date;
  destinationName: string;
  destinationPlatform: string | null;
  arrivalPlanned: Date;
  arrivalEstimated: Date;
  cancelled: boolean;
  infos: DisruptionInfo[];
}

export interface Departure {
  stopName: string;
  lineName: string;
  mode: string;
  direction: string;
  directionFrom: string;
  platform: string | null;
  platformName: string | null;
  planned: Date;
  estimated: Date;
  delayMinutes: number;
  cancelled: boolean;
  operatorName: string | null;
  infos: DisruptionInfo[];
}

export interface Journey {
  legs: JourneyLeg[];
  departurePlanned: Date;
  departureEstimated: Date;
  arrivalPlanned: Date;
  arrivalEstimated: Date;
  departureDelayMinutes: number;
  arrivalDelayMinutes: number;
  originPlatform: string | null;
  cancelled: boolean;
  disruptions: DisruptionInfo[];
}
