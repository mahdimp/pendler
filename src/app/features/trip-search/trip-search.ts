import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from "@angular/core";
import { EfaService } from "../../core/efa.service";
import type { Journey } from "../../core/efa.types";
import type { SavedRoute, Stop } from "../../core/storage.service";
import { StorageService } from "../../core/storage.service";
import { formatTime, platformSuffix } from "../../core/time";
import { BackButton } from "../../shared/back-button";
import { DisruptionList } from "../../shared/disruption-list";
import { Icon } from "../../shared/icon";
import { Spinner } from "../../shared/spinner";
import { StatusPill } from "../../shared/status-pill";
import { StopPicker } from "../../shared/stop-picker";

type Step = "start" | "from" | "to" | "loading" | "results" | "detail" | "error";

interface JourneyRow {
  journey: Journey;
  label: string;
  worstDelay: number;
}

function journeyLabel(j: Journey): string {
  const dep = formatTime(j.departureEstimated);
  const arr = formatTime(j.arrivalEstimated);
  const durationMin = Math.round((j.arrivalEstimated.getTime() - j.departureEstimated.getTime()) / 60_000);
  const lines =
    j.legs
      .filter((l) => !l.isWalk)
      .map((l) => l.lineName)
      .filter(Boolean)
      .join(", ") || "walk only";
  return `${dep} → ${arr} (${durationMin} min) via ${lines}`;
}

@Component({
  selector: "app-trip-search",
  standalone: true,
  imports: [BackButton, DisruptionList, Icon, Spinner, StatusPill, StopPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack">
      @if (step() !== "from" && step() !== "to") {
        <app-back-button [label]="step() === 'start' ? 'Back to menu' : 'Back'" (pressed)="goBack()" />
      }

      @switch (step()) {
        @case ("start") {
          <h1>Trip search</h1>
          @if (storage.savedRoutes().length > 0) {
            <p class="dim">Saved routes</p>
            <div class="stack">
              @for (route of storage.savedRoutes(); track route.id; let i = $index) {
                <div class="row stagger-item" [style.--stagger-index]="i">
                  <button class="card-button" style="flex:1" (click)="startSaved(route)">
                    {{ route.from.name }} → {{ route.to.name }}
                  </button>
                  <button
                    class="btn"
                    style="min-width:44px"
                    (click)="storage.deleteSavedRoute(route.id)"
                    aria-label="Remove saved route"
                  >
                    <app-icon name="x" [size]="16" />
                  </button>
                </div>
              }
            </div>
          }
          <button class="btn btn-primary" (click)="step.set('from')">New search</button>
        }
        @case ("from") {
          <app-stop-picker
            label="From stop"
            [recents]="storage.recentStations()"
            (picked)="pickFrom($event)"
            (cancel)="step.set('start')"
          />
        }
        @case ("to") {
          <app-stop-picker
            label="To stop"
            [recents]="storage.recentStations()"
            (picked)="pickTo($event)"
            (cancel)="step.set('start')"
          />
        }
        @case ("loading") {
          <app-spinner label="Searching…" />
        }
        @case ("results") {
          <h1>{{ from()?.name }} → {{ to()?.name }}</h1>
          <button class="btn" (click)="save()" [disabled]="alreadySaved()">
            <app-icon name="bookmark" [size]="16" />
            {{ alreadySaved() ? "Saved" : "Save this route" }}
          </button>
          <div class="stack">
            @for (row of rows(); track $index; let i = $index) {
              <button class="card-button stagger-item" [style.--stagger-index]="i" (click)="openDetail(row.journey)">
                <div class="row-between">
                  <div class="title">{{ row.label }}</div>
                  <app-status-pill [cancelled]="row.journey.cancelled" [delayMinutes]="row.worstDelay" />
                </div>
              </button>
            }
          </div>
        }
        @case ("detail") {
          @if (selected(); as j) {
            <h1>Journey details</h1>
            <div class="stack">
              @for (leg of j.legs; track $index) {
                <div class="card">
                  <div class="title" [style.color]="leg.cancelled ? 'var(--destructive)' : null">
                    {{ leg.isWalk ? "Walk" : leg.lineName }} {{ leg.cancelled ? "— Cancelled" : "" }}
                  </div>
                  <p class="dim">
                    {{ leg.originName }}{{ platformSuffix(leg.originPlatform) }} — dep
                    {{ formatTime(leg.departureEstimated) }}
                  </p>
                  <p class="dim">
                    → {{ leg.destinationName }}{{ platformSuffix(leg.destinationPlatform) }} — arr
                    {{ formatTime(leg.arrivalEstimated) }}
                  </p>
                </div>
              }
            </div>
            <app-disruption-list [infos]="j.disruptions" />
          }
        }
        @case ("error") {
          <p style="color: var(--destructive)" role="alert">{{ error() }}</p>
        }
      }
    </div>
  `,
})
export class TripSearch {
  private readonly efa = inject(EfaService);
  readonly storage = inject(StorageService);
  readonly formatTime = formatTime;
  readonly platformSuffix = platformSuffix;

  back = output<void>();

  step = signal<Step>("start");
  from = signal<Stop | null>(null);
  to = signal<Stop | null>(null);
  journeys = signal<Journey[]>([]);
  selected = signal<Journey | null>(null);
  error = signal("");

  readonly rows = computed<JourneyRow[]>(() =>
    this.journeys().map((journey) => ({
      journey,
      label: journeyLabel(journey),
      worstDelay: Math.max(journey.departureDelayMinutes, journey.arrivalDelayMinutes),
    })),
  );

  /** Reflects the actual saved-routes list, not just "saved during this visit" — so a route
   * saved earlier (or picked via the saved-routes quick-start) correctly shows as already saved. */
  readonly alreadySaved = computed(() => {
    const from = this.from();
    const to = this.to();
    if (!from || !to) return false;
    return this.storage.savedRoutes().some((r) => r.from.id === from.id && r.to.id === to.id);
  });

  pickFrom(stop: Stop): void {
    this.storage.touchRecentStation(stop);
    this.from.set(stop);
    this.step.set("to");
  }

  pickTo(stop: Stop): void {
    this.storage.touchRecentStation(stop);
    this.to.set(stop);
    this.runSearch();
  }

  startSaved(route: SavedRoute): void {
    this.from.set(route.from);
    this.to.set(route.to);
    this.runSearch();
  }

  goBack(): void {
    switch (this.step()) {
      case "start":
        this.back.emit();
        break;
      case "detail":
        this.step.set("results");
        break;
      default:
        this.step.set("start");
    }
  }

  private runSearch(): void {
    const from = this.from();
    const to = this.to();
    if (!from || !to) return;
    this.step.set("loading");
    this.efa
      .getTrips(from.id, to.id, new Date(), 5)
      .then((results) => {
        if (results.length === 0) {
          this.error.set(`No trips found from ${from.name} to ${to.name}.`);
          this.step.set("error");
          return;
        }
        this.journeys.set(results);
        this.step.set("results");
      })
      .catch((err) => {
        this.error.set(String(err));
        this.step.set("error");
      });
  }

  openDetail(j: Journey): void {
    this.selected.set(j);
    this.step.set("detail");
  }

  save(): void {
    const from = this.from();
    const to = this.to();
    if (!from || !to) return;
    this.storage.saveRoute(from, to);
  }
}
