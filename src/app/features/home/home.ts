import { ChangeDetectionStrategy, Component, output } from "@angular/core";
import type { IconName } from "../../shared/icon";
import { Icon } from "../../shared/icon";

type View = "stationBoard" | "tripSearch";

interface MenuItem {
  view: View;
  icon: IconName;
  badgeClass: string;
  title: string;
  subtitle: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    view: "stationBoard",
    icon: "clock",
    badgeClass: "icon-badge-primary",
    title: "Station board",
    subtitle: "Live departures for any stop",
  },
  {
    view: "tripSearch",
    icon: "arrow-right",
    badgeClass: "icon-badge-secondary",
    title: "Trip search",
    subtitle: "Find a connection between two stops",
  },
];

@Component({
  selector: "app-home",
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack">
      <p class="dim">VVS &amp; SSB lookups — no account, no server, everything stays on this device.</p>

      @for (item of menuItems; track item.view; let i = $index) {
        <button class="card-button stagger-item" [style.--stagger-index]="i" (click)="select.emit(item.view)">
          <div class="row">
            <span class="icon-badge" [class]="item.badgeClass">
              <app-icon [name]="item.icon" [size]="24" />
            </span>
            <div>
              <div class="title">{{ item.title }}</div>
              <div class="dim">{{ item.subtitle }}</div>
            </div>
          </div>
        </button>
      }
    </div>
  `,
})
export class Home {
  select = output<View>();
  readonly menuItems = MENU_ITEMS;
}
