import { ChangeDetectionStrategy, Component, inject, OnDestroy, output, signal } from "@angular/core";
import { EfaService } from "../../core/efa.service";
import type { Departure, DisruptionInfo } from "../../core/efa.types";
import type { Stop } from "../../core/storage.service";
import { StorageService } from "../../core/storage.service";
import { formatPlatform, formatTime } from "../../core/time";
import { BackButton } from "../../shared/back-button";
import { DisruptionList } from "../../shared/disruption-list";
import { Spinner } from "../../shared/spinner";
import { StatusPill } from "../../shared/status-pill";
import { StopPicker } from "../../shared/stop-picker";

type Step = "pick" | "board" | "detail";

const REFRESH_MS = 10_000;

@Component({
  selector: "app-station-board",
  standalone: true,
  imports: [BackButton, DisruptionList, Spinner, StatusPill, StopPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (step()) {
      @case ("pick") {
        <app-stop-picker
          label="Which station"
          [recents]="storage.recentStations()"
          (picked)="choose($event)"
          (cancel)="back.emit()"
        />
      }
      @case ("board") {
        <div class="stack">
          <app-back-button (pressed)="back.emit()" />
          <h1>{{ station()?.name }}</h1>

          @if (error()) {
            <p style="color: var(--destructive)" role="alert">{{ error() }}</p>
          }
          @if (!loaded() && !error()) {
            <app-spinner label="Loading departures…" />
          }

          <app-disruption-list [infos]="stationNotices()" />

          @if (loaded() && !error() && departures().length === 0) {
            <p class="dim">No upcoming departures for this stop right now.</p>
          }

          <div class="stack">
            @for (d of departures(); track $index; let i = $index) {
              <button
                class="card-button stagger-item"
                [style.--stagger-index]="i"
                (click)="openDetail(d)"
              >
                <div class="row-between">
                  <div>
                    <div class="title">{{ formatTime(d.estimated) }} · {{ d.lineName }} → {{ d.direction }}</div>
                    <div class="dim">{{ formatPlatform(d.platformName, d.platform) }}</div>
                  </div>
                  <app-status-pill [cancelled]="d.cancelled" [delayMinutes]="d.delayMinutes" />
                </div>
              </button>
            }
          </div>
          @if (departures().length > 0) {
            <p class="micro">Auto-refreshes every 10s</p>
          }
        </div>
      }
      @case ("detail") {
        @if (selected(); as d) {
          <div class="stack">
            <app-back-button label="Back to board" (pressed)="step.set('board')" />
            <h1>{{ d.mode }} {{ d.lineName }} → {{ d.direction }}</h1>
            <p class="dim">From: {{ d.directionFrom || "—" }}</p>
            <div class="card stack">
              <p>Planned {{ formatTime(d.planned) }} · Estimated {{ formatTime(d.estimated) }}</p>
              <app-status-pill [cancelled]="d.cancelled" [delayMinutes]="d.delayMinutes" />
              <p class="dim">Platform: {{ formatPlatform(d.platformName, d.platform) || "—" }}</p>
              <p class="dim">Operator: {{ d.operatorName ?? "—" }}</p>
            </div>
            <app-disruption-list [infos]="d.infos" />
          </div>
        }
      }
    }
  `,
})
export class StationBoard implements OnDestroy {
  private readonly efa = inject(EfaService);
  readonly storage = inject(StorageService);
  readonly formatTime = formatTime;
  readonly formatPlatform = formatPlatform;

  back = output<void>();

  step = signal<Step>("pick");
  station = signal<Stop | null>(null);
  departures = signal<Departure[]>([]);
  stationNotices = signal<DisruptionInfo[]>([]);
  selected = signal<Departure | null>(null);
  error = signal("");
  /** Distinct from departures().length === 0 — that's ambiguous between "not fetched yet" and "fetched, genuinely none". */
  loaded = signal(false);

  private timer?: ReturnType<typeof setInterval>;

  choose(stop: Stop): void {
    this.storage.touchRecentStation(stop);
    this.station.set(stop);
    this.step.set("board");
    this.refresh();
    this.timer = setInterval(() => {
      if (!document.hidden) this.refresh();
    }, REFRESH_MS);
  }

  openDetail(d: Departure): void {
    this.selected.set(d);
    this.step.set("detail");
  }

  private refresh(): void {
    const station = this.station();
    if (!station) return;
    this.efa
      .getDepartures(station.id)
      .then((board) => {
        this.departures.set(board.departures);
        this.stationNotices.set(board.stationNotices);
        this.loaded.set(true);
      })
      .catch((err) => {
        this.error.set(String(err));
        this.loaded.set(true);
      });
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
