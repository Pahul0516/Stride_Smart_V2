import {clearAllOverlays, activeLayer} from "./overlays.js";

const menus = [
    { buttonId: "filtersButton", menuId: "filterMenu", closeId: "closeFilterMenu", badgeId: "filterBadge" },
    { buttonId: "overlaysButton", menuId: "overlayMenu", closeId: "closeOverlayMenu", badgeId: null },
    { buttonId: "weatherButton", menuId: "weatherMenu", closeId: "closeWeatherMenu", badgeId: null },
    { buttonId: "profileButton", menuId: "profileMenu", closeId: "closeProfileMenu", badgeId: null }
];

export let activeMenu = null;
export const activeFilters = new Set();

export function setupMenus() {

    menus.forEach(setupMenu);

    setupToggleButtons(
        ".filter-option",
        menus[0].badgeId,
        document.querySelector("#clearFiltersContainer"),
        document.querySelector("#clearFiltersButton")
    );
}

function setupMenu({ buttonId, menuId, closeId, badgeId }) {
    const button = document.querySelector(`#${buttonId}`);
    const menu = document.querySelector(`#${menuId}`);
    const closeButton = document.querySelector(`#${closeId}`);

    if (!button || !menu || !closeButton) return;

    toggleMenu(menu, button, closeButton, badgeId);
}

function toggleMenu(menu, button, closeButton, badgeId) {
    function handleToggle() {
        if (activeMenu === menu) {
            closeMenu(menu);
        } else {
            if (activeMenu) {
                closeMenu(activeMenu);
            }
            openMenu(menu);
        }

        if (menu.id === "overlayMenu") {
            hideTouristPopup();
        }

        if (badgeId && activeFilters) {
            updateActiveNumber(badgeId, null);
        }
    }

    button.addEventListener("click", handleToggle);
    closeButton.addEventListener("click", () => closeMenu(menu, badgeId));
}

export function openMenu(menu) {
    menu.classList.remove("translate-y-full");
    activeMenu = menu;
}

export function closeMenu(menu, badgeId = null) {
    menu.classList.add("translate-y-full");
    if (activeMenu === menu) {
        activeMenu = null;
    }

    if (badgeId && activeFilters) {
        updateActiveNumber(badgeId, null);
    }
}

function hideTouristPopup() {
    const touristPopup = document.getElementById("touristPopup");

    if (touristPopup && !touristPopup.classList.contains("hidden")) {
        touristPopup.classList.add("translate-y-full");
        setTimeout(() => {
            touristPopup.classList.add("hidden");
        }, 100);

        const checkedCheckboxes = touristPopup.querySelectorAll("input[type='checkbox']:checked");
        if (checkedCheckboxes.length === 0) {
            deactivateTouristButton();
        }
    }
}

function updateActiveNumber(badgeId, container) {
    if (badgeId) {
        const badge = document.getElementById("filterBadge");
        if (badge) {
            badge.textContent = activeFilters.size.toString();
            badge.classList.toggle("hidden", activeFilters.size === 0);
        }
    }

    if (container) {
        container.classList.toggle("hidden", activeFilters.size === 0);
    }
}

function setupToggleButtons(buttonClass, badgeId, clearButtonContainer, clearButton) {
    const buttons = document.querySelectorAll(buttonClass);

    buttons.forEach(button => {
        button.addEventListener("click", () => handleToggleButton(button, badgeId, clearButtonContainer));
    });

    clearButton.addEventListener("click", () => handleClearButton(badgeId, clearButtonContainer, buttons));
}

function handleToggleButton(button, badgeId, clearButtonContainer) {
    const category = button.dataset.category;
    if (!category) return;

    if (!(category === "discover-explore-o" && activeFilters.has(category))) {
        toggleCategory(button, category);
        updateActiveNumber(badgeId, clearButtonContainer);
    }
}

function toggleCategory(button, category) {
    if (activeFilters.has(category)) {
        if(!(category === "discover-explore-o" && activeFilters.has(category)))
            activeFilters.delete(category);
    } else {
        activeFilters.add(category);
    }

    button.classList.toggle("bg-white", !activeFilters.has(category));
    button.classList.toggle("bg-[#A5B68D]", activeFilters.has(category));
    button.classList.toggle("text-gray-700", !activeFilters.has(category));
    button.classList.toggle("text-white", activeFilters.has(category));
    button.classList.toggle("shadow-lg", activeFilters.has(category));
    button.classList.toggle("scale-105", activeFilters.has(category));
}

function handleClearButton(badgeId, clearButtonContainer, buttons) {
    activeFilters.clear();
    buttons.forEach(button => resetButtonStyle(button));
    updateActiveNumber(badgeId, clearButtonContainer);
}

export function resetButtonStyle(button) {
    button.classList.add("bg-white");
    button.classList.remove("bg-[#A5B68D]");
    button.classList.add("text-gray-700");
    button.classList.remove("text-white");
    button.classList.remove("shadow-lg");
    button.classList.remove("scale-105");
}

export function deactivateTouristButton() {
    const touristButton = document.querySelector('[data-category="discover-explore-o"]');
    if (!touristButton) return;

    resetButtonStyle(touristButton);
    activeLayer[0] = null;
    touristButton.classList.remove("active");

    updateActiveNumber(menus[1].badgeId, document.querySelector("#clearOverlaysContainer"));
}

export function activateTouristButton() {
    const touristButton = document.querySelector('[data-category="discover-explore-o"]');
    if (!touristButton) return;

    activeLayer[0] = touristButton;
    toggleCategory(touristButton, "discover-explore-o");
    updateActiveNumber(menus[1].badgeId, document.querySelector("#clearOverlaysContainer"));
}
