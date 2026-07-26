import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { Home } from "./features/home/home";
import { Settings } from "./features/settings/settings";
import { StationBoard } from "./features/station-board/station-board";
import { TripSearch } from "./features/trip-search/trip-search";
import { Icon } from "./shared/icon";

type View = "home" | "stationBoard" | "tripSearch" | "settings";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [Home, StationBoard, TripSearch, Settings, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./app.html",
  styleUrl: "./app.css",
})
export class App {
  view = signal<View>("home");
}
