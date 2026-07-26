import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

@Component({
  selector: "app-status-pill",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="pill" [class]="pillClass()">
      {{ text() }}
    </span>
  `,
})
export class StatusPill {
  cancelled = input(false);
  delayMinutes = input(0);

  text = computed(() => {
    if (this.cancelled()) return "Cancelled";
    if (this.delayMinutes() >= 1) return `+${this.delayMinutes()} min`;
    return "On time";
  });

  pillClass = computed(() => {
    if (this.cancelled()) return "pill-destructive";
    if (this.delayMinutes() >= 1) return "pill-warning";
    return "pill-success";
  });
}
