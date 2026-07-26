import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { Icon } from "./icon";

@Component({
  selector: "app-spinner",
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="row" style="gap: var(--space-2)" role="status">
      <app-icon class="spinner" name="refresh-cw" [size]="16" />
      <span class="dim">{{ label() }}</span>
    </div>
  `,
})
export class Spinner {
  label = input("Loading…");
}
