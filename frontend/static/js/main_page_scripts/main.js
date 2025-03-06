import { setupAnimation, setupLazyAnimations } from "http://127.0.0.1:5001/static/js/main_page_scripts/animation.js";
import { setupScrollFeatures } from "http://127.0.0.1:5001/static/js/main_page_scripts/scroll.js";
import { setupMenu } from "http://127.0.0.1:5001/static/js/main_page_scripts/menu_toggle.js";
import { openPopup, closePopup } from "http://127.0.0.1:5001/static/js/main_page_scripts/info_popups.js";

setupAnimation();
setupScrollFeatures();
setupMenu();
setupLazyAnimations();

window.openPopup = openPopup;
window.closePopup = closePopup;
