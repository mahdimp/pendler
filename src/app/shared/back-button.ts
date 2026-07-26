import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { Icon } from "./icon";

@Component({
  selector: "app-back-button",
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button class="btn-ghost" (click)="pressed.emit()">
      <app-icon name="chevron-left" [size]="20" />
      {{ label() }}
    </button>
  `,
})
export class BackButton {
  label = input("Back");
  pressed = output<void>();
}
