import {init as initMap} from "http://127.0.0.1:5501/static/js/map_scripts/map.js";
import { setupMenus } from "http://127.0.0.1:5501/static/js/map_scripts/menu.js";
import { setupEventListeners } from "http://127.0.0.1:5501/static/js/map_scripts/map.js";
import { setupPlaceOverviewButtons } from "http://127.0.0.1:5501/static/js/map_scripts/map.js";
import { setupGeolocation } from "http://127.0.0.1:5501/static/js/map_scripts/map.js";
import { setupOverlays } from "http://127.0.0.1:5501/static/js/map_scripts/overlays.js";

document.addEventListener("DOMContentLoaded", async () => {
    await initMap();

    setupMenus();
    setupEventListeners();
    setupPlaceOverviewButtons();
    setupGeolocation();
    setupOverlays();
});
