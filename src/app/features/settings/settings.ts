import { ChangeDetectionStrategy, Component, inject, output } from "@angular/core";
import { LANGUAGE_OPTIONS } from "../../core/languages";
import { StorageService } from "../../core/storage.service";
import { BackButton } from "../../shared/back-button";
import { Icon } from "../../shared/icon";

@Component({
  selector: "app-settings",
  standalone: true,
  imports: [BackButton, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack">
      <app-back-button label="Back to menu" (pressed)="back.emit()" />
      <h1>Settings</h1>
      <p class="dim">Language for translated disruption text</p>
      <div class="stack" role="radiogroup" aria-label="Translation language">
        <button
          class="card-button"
          role="radio"
          [class.selected]="isSelected(null)"
          [attr.aria-checked]="isSelected(null)"
          (click)="select(null)"
        >
          <div class="row-between">
            <span>Auto (detected from your browser)</span>
            @if (isSelected(null)) {
              <app-icon name="circle-check" [size]="16" />
            }
          </div>
        </button>
        @for (lang of languages; track lang.code; let i = $index) {
          <button
            class="card-button stagger-item"
            role="radio"
            [style.--stagger-index]="i"
            [class.selected]="isSelected(lang.code)"
            [attr.aria-checked]="isSelected(lang.code)"
            (click)="select(lang.code)"
          >
            <div class="row-between">
              <span>{{ lang.label }}</span>
              @if (isSelected(lang.code)) {
                <app-icon name="circle-check" [size]="16" />
              }
            </div>
          </button>
        }
      </div>
    </div>
  `,
})
export class Settings {
  readonly storage = inject(StorageService);
  readonly languages = LANGUAGE_OPTIONS;

  back = output<void>();

  isSelected(code: string | null): boolean {
    return this.storage.translationLanguage() === code;
  }

  select(code: string | null): void {
    this.storage.setTranslationLanguage(code);
  }
}
