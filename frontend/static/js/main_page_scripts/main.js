import { setupAnimation, setupLazyAnimations } from "/projects/2/static/js/main_page_scripts/animation.js";
import { setupScrollFeatures } from "/projects/2/static/js/main_page_scripts/scroll.js";
import { setupMenu } from "/projects/2/static/js/main_page_scripts/menu_toggle.js";
import { openPopup, closePopup } from "/projects/2/static/js/main_page_scripts/info_popups.js";

setupAnimation();
setupScrollFeatures();
setupMenu();
setupLazyAnimations();

window.openPopup = openPopup;
window.closePopup = closePopup;
