import {init as initMap} from "/projects/2/static/js/map_scripts/map.js";
import { setupMenus } from "/projects/2/static/js/map_scripts/menu.js";
import { setupEventListeners } from "/projects/2/static/js/map_scripts/map.js";
import { setupPlaceOverviewButtons } from "/projects/2/static/js/map_scripts/map.js";
import { setupGeolocation } from "/projects/2/static/js/map_scripts/map.js";
import { setupOverlays } from "/projects/2/static/js/map_scripts/overlays.js";

document.addEventListener("DOMContentLoaded", async () => {
    await initMap();

    setupMenus();
    setupEventListeners();
    setupPlaceOverviewButtons();
    setupGeolocation();
    setupOverlays();
});
