import {init as initMap} from "./map.js";
import {setupMenus} from "./menu.js";
import { setupEventListeners } from "./map.js";
import { setupPlaceOverviewButtons } from "./map.js";
import { setupGeolocation } from "./map.js";
import { setupOverlays} from "./overlays.js";

document.addEventListener("DOMContentLoaded", async () => {
    await initMap();

    setupMenus();
    setupEventListeners();
    setupPlaceOverviewButtons();
    setupGeolocation();
    setupOverlays();
});
