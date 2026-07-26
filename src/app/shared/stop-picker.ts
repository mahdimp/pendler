import { ChangeDetectionStrategy, Component, inject, input, output, signal } from "@angular/core";
import { EfaService } from "../core/efa.service";
import { StorageService, type Stop } from "../core/storage.service";
import { BackButton } from "./back-button";
import { Icon } from "./icon";

type Step = "search" | "select";

@Component({
  selector: "app-stop-picker",
  standalone: true,
  imports: [Icon, BackButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack">
      <app-back-button label="Cancel" (pressed)="cancel.emit()" />

      @switch (step()) {
        @case ("search") {
          <p class="dim">{{ label() }}:</p>

          @if (recents().length > 0) {
            <p class="micro">Recent stations</p>
            <div class="stack">
              @for (stop of recents(); track stop.id; let i = $index) {
                <div class="row stagger-item" [style.--stagger-index]="i">
                  <button class="card-button" style="flex:1" (click)="picked.emit(stop)">{{ stop.name }}</button>
                  <button
                    class="btn"
                    style="min-width:44px"
                    (click)="removeRecent(stop)"
                    [attr.aria-label]="'Remove ' + stop.name + ' from recent stations'"
                  >
                    <app-icon name="x" [size]="16" />
                  </button>
                </div>
              }
            </div>
            <p class="micro">or search a different station:</p>
          }

          <div class="input-wrap">
            <app-icon name="search" [size]="20" />
            <input
              type="text"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
              (keydown.enter)="search()"
              placeholder="e.g. Stuttgart Hauptbahnhof"
              autofocus
            />
          </div>
          <button class="btn btn-primary" (click)="search()" [disabled]="loading()">
            @if (loading()) {
              <app-icon class="spinner" name="refresh-cw" [size]="16" />
            }
            {{ loading() ? "Searching…" : "Search" }}
          </button>
          @if (error()) {
            <p class="micro" style="color: var(--destructive)" role="alert">{{ error() }}</p>
          }
        }
        @case ("select") {
          <p class="dim">Select the correct stop:</p>
          <div class="stack">
            @for (stop of results(); track stop.id; let i = $index) {
              <button class="card-button stagger-item" [style.--stagger-index]="i" (click)="picked.emit(stop)">
                {{ stop.name }}
              </button>
            }
          </div>
        }
      }
    </div>
  `,
})
export class StopPicker {
  private readonly efa = inject(EfaService);
  private readonly storage = inject(StorageService);

  label = input.required<string>();
  recents = input<Stop[]>([]);
  picked = output<Stop>();
  cancel = output<void>();

  step = signal<Step>("search");
  query = signal("");
  results = signal<Stop[]>([]);
  loading = signal(false);
  error = signal("");

  removeRecent(stop: Stop): void {
    this.storage.deleteRecentStation(stop.id);
  }

  async search(): Promise<void> {
    const q = this.query().trim();
    if (!q) return;
    this.loading.set(true);
    this.error.set("");
    try {
      const stops = await this.efa.findStops(q);
      this.loading.set(false);
      if (stops.length === 0) {
        this.error.set(`No stops found for "${q}".`);
        return;
      }
      this.results.set(stops);
      this.step.set("select");
    } catch (err) {
      this.loading.set(false);
      this.error.set(String(err));
    }
  }
}
