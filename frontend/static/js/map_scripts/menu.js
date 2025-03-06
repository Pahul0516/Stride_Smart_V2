import {clearAllOverlays} from "http://127.0.0.1:5001/static/js/map_scripts/overlays.js";

const menus = [
    { buttonId: "filtersButton", menuId: "filterMenu", closeId: "closeFilterMenu", badgeId: "filterBadge", activeSet: new Set() },
    { buttonId: "overlaysButton", menuId: "overlayMenu", closeId: "closeOverlayMenu", badgeId: "overlayBadge", activeSet: new Set() },
    { buttonId: "weatherButton", menuId: "weatherMenu", closeId: "closeWeatherMenu", badgeId: null, activeSet: null },
    { buttonId: "profileButton", menuId: "profileMenu", closeId: "closeProfileMenu", badgeId: null, activeSet: null }
];

export let activeMenu = null;

export function setupMenus() {
    menus.forEach(setupMenu);
    setupToggleButtons(
        ".filter-option",
        menus[0].activeSet,
        menus[0].badgeId,
        document.querySelector("#clearFiltersContainer"),
        document.querySelector("#clearFiltersButton")
    );

    setupToggleButtons(
        ".overlay-option",
        menus[1].activeSet,
        menus[1].badgeId,
        document.querySelector("#clearOverlaysContainer"),
        document.querySelector("#clearOverlaysButton")
    );
}

function setupMenu({ buttonId, menuId, closeId, badgeId, activeSet }) {
    const button = document.querySelector(`#${buttonId}`);
    const menu = document.querySelector(`#${menuId}`);
    const closeButton = document.querySelector(`#${closeId}`);

    if (!button || !menu || !closeButton) return;

    toggleMenu(menu, button, closeButton, badgeId, activeSet);
}

function toggleMenu(menu, button, closeButton, badgeId, activeSet) {
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

        if (badgeId && activeSet) {
            updateActiveNumber(badgeId, activeSet, null);
        }
    }

    button.addEventListener("click", handleToggle);
    closeButton.addEventListener("click", () => closeMenu(menu, badgeId, activeSet));
}

function openMenu(menu) {
    menu.classList.remove("translate-y-full");
    activeMenu = menu;
}

export function closeMenu(menu, badgeId = null, activeSet = null) {
    menu.classList.add("translate-y-full");
    if (activeMenu === menu) {
        activeMenu = null;
    }

    if (badgeId && activeSet) {
        updateActiveNumber(badgeId, activeSet, null);
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

function updateActiveNumber(badgeId, activeSet, container) {
    if (badgeId) {
        const badge = document.querySelector(`#${badgeId}`);
        if (badge) {
            badge.textContent = activeSet.size;
            badge.classList.toggle("hidden", activeSet.size === 0);
        }
    }

    if (container) {
        container.classList.toggle("hidden", activeSet.size === 0);
    }
}

function setupToggleButtons(buttonClass, activeSet, badgeId, clearButtonContainer, clearButton) {
    const buttons = document.querySelectorAll(buttonClass);

    buttons.forEach(button => {
        button.addEventListener("click", () => handleToggleButton(button, activeSet, badgeId, clearButtonContainer));
    });

    clearButton.addEventListener("click", () => handleClearButton(activeSet, badgeId, clearButtonContainer, buttons));
}

function handleToggleButton(button, activeSet, badgeId, clearButtonContainer) {
    const category = button.dataset.category;
    if (!category) return;

    if (!(category === "discover-explore-o" && activeSet.has(category))) {
        toggleCategory(button, category, activeSet);
        updateActiveNumber(badgeId, activeSet, clearButtonContainer);
    }
}

function toggleCategory(button, category, activeSet) {
    if (activeSet.has(category)) {
        if(!(category === "discover-explore-o" && activeSet.has(category)))
            activeSet.delete(category);
    } else {
        activeSet.add(category);
    }

    button.classList.toggle("bg-white", !activeSet.has(category));
    button.classList.toggle("bg-[#A5B68D]", activeSet.has(category));
    button.classList.toggle("text-gray-700", !activeSet.has(category));
    button.classList.toggle("text-white", activeSet.has(category));
    button.classList.toggle("shadow-lg", activeSet.has(category));
    button.classList.toggle("scale-105", activeSet.has(category));
}

function handleClearButton(activeSet, badgeId, clearButtonContainer, buttons) {
    clearAllOverlays();
    activeSet.clear();

    buttons.forEach(button => resetButtonStyle(button));

    updateActiveNumber(badgeId, activeSet, clearButtonContainer);
}

function resetButtonStyle(button) {
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

    menus[1].activeSet.delete("discover-explore-o");

    resetButtonStyle(touristButton);
    touristButton.classList.remove("active");

    updateActiveNumber(menus[1].badgeId, menus[1].activeSet, document.querySelector("#clearOverlaysContainer"));
}

export function activateTouristButton() {
    const touristButton = document.querySelector('[data-category="discover-explore-o"]');
    if (!touristButton) return;

    menus[1].activeSet.add("discover-explore-o");
    toggleCategory(touristButton, "discover-explore-o", menus[1].activeSet);
    updateActiveNumber(menus[1].badgeId, menus[1].activeSet, document.querySelector("#clearOverlaysContainer"));
}
