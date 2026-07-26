import { ChangeDetectionStrategy, Component, inject, input, signal } from "@angular/core";
import type { DisruptionInfo } from "../core/efa.types";
import { StorageService } from "../core/storage.service";
import { TranslateService } from "../core/translate.service";
import { Icon } from "./icon";

interface TranslationState {
  status: "idle" | "loading" | "done" | "error";
  title?: string;
  content?: string;
}

const IDLE: TranslationState = { status: "idle" };

@Component({
  selector: "app-disruption-list",
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (infos().length > 0) {
      <h2 class="section-heading">Disruptions</h2>
      <div class="stack">
        @for (info of infos(); track info.id; let i = $index) {
          @let state = stateFor(info.id);
          <div class="card stagger-item" [style.--stagger-index]="i">
            <div class="row-between">
              <div style="display:flex; align-items:center; gap: var(--space-2); color: var(--warning); font-weight: 600">
                <app-icon name="triangle-alert" [size]="16" />
                {{ state.status === "done" ? state.title : info.title }}
              </div>
              <button
                class="btn"
                style="padding: 0 var(--space-3)"
                [disabled]="state.status === 'loading'"
                (click)="toggleTranslate(info)"
              >
                <app-icon [class.spinner]="state.status === 'loading'" name="languages" [size]="16" />
                {{ translateLabel(state) }}
              </button>
            </div>
            <p
              class="dim"
              style="margin-top: var(--space-2)"
              [attr.aria-live]="state.status === 'done' ? 'polite' : null"
            >
              {{ state.status === "done" ? state.content : info.content.slice(0, 400) }}
            </p>
            @if (state.status === "error") {
              <p class="micro" style="color: var(--destructive)" role="alert">Translation unavailable right now.</p>
            }
          </div>
        }
      </div>
    }
  `,
})
export class DisruptionList {
  private readonly translateService = inject(TranslateService);
  private readonly storage = inject(StorageService);

  infos = input<DisruptionInfo[]>([]);

  private readonly translations = signal<Record<string, TranslationState>>({});

  stateFor(id: string): TranslationState {
    return this.translations()[id] ?? IDLE;
  }

  translateLabel(state: TranslationState): string {
    switch (state.status) {
      case "loading":
        return "Translating…";
      case "done":
        return "Show original";
      default:
        return "Translate";
    }
  }

  async toggleTranslate(info: DisruptionInfo): Promise<void> {
    if (this.stateFor(info.id).status === "done") {
      this.setState(info.id, IDLE);
      return;
    }
    this.setState(info.id, { status: "loading" });
    try {
      const target = this.storage.translationLanguage() ?? this.translateService.preferredTargetLanguage();
      const [title, content] = await Promise.all([
        this.translateService.translate(info.title, target),
        this.translateService.translate(info.content, target),
      ]);
      this.setState(info.id, { status: "done", title, content });
    } catch {
      this.setState(info.id, { status: "error" });
    }
  }

  private setState(id: string, state: TranslationState): void {
    this.translations.update((m) => ({ ...m, [id]: state }));
  }
}
