import { Injectable, signal } from "@angular/core";

export interface Stop {
  id: string;
  name: string;
}

export interface SavedRoute {
  id: string;
  from: Stop;
  to: Stop;
}

const RECENT_STATIONS_KEY = "pendler.recentStations";
const SAVED_ROUTES_KEY = "pendler.savedRoutes";
const TRANSLATION_LANGUAGE_KEY = "pendler.translationLanguage";
const MAX_RECENT_STATIONS = 10;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

@Injectable({ providedIn: "root" })
export class StorageService {
  readonly recentStations = signal<Stop[]>(read<Stop[]>(RECENT_STATIONS_KEY, []));
  readonly savedRoutes = signal<SavedRoute[]>(read<SavedRoute[]>(SAVED_ROUTES_KEY, []));
  /** null means "auto-detect from the browser's language". */
  readonly translationLanguage = signal<string | null>(read<string | null>(TRANSLATION_LANGUAGE_KEY, null));

  touchRecentStation(stop: Stop): void {
    const updated = [stop, ...this.recentStations().filter((s) => s.id !== stop.id)].slice(
      0,
      MAX_RECENT_STATIONS,
    );
    this.recentStations.set(updated);
    write(RECENT_STATIONS_KEY, updated);
  }

  deleteRecentStation(id: string): void {
    const updated = this.recentStations().filter((s) => s.id !== id);
    this.recentStations.set(updated);
    write(RECENT_STATIONS_KEY, updated);
  }

  saveRoute(from: Stop, to: Stop): SavedRoute {
    const route: SavedRoute = { id: crypto.randomUUID(), from, to };
    const updated = [route, ...this.savedRoutes()];
    this.savedRoutes.set(updated);
    write(SAVED_ROUTES_KEY, updated);
    return route;
  }

  deleteSavedRoute(id: string): void {
    const updated = this.savedRoutes().filter((r) => r.id !== id);
    this.savedRoutes.set(updated);
    write(SAVED_ROUTES_KEY, updated);
  }

  setTranslationLanguage(code: string | null): void {
    this.translationLanguage.set(code);
    write(TRANSLATION_LANGUAGE_KEY, code);
  }
}
