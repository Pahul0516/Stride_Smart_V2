const popupTitles = {
    thermalComfort: "Thermal Comfort",
    cleanAir: "Clean Air",
    naturePath: "Nature Path",
    safetyTrail: "Safety Trail",
    accessibleAdventure: "Accessible Adventure",
    discoverExplore: "Discover & Explore",
    reports: "Navigators' Reports"
};

const popupContents = {
    thermalComfort: "Thermal Comfort Info",
    cleanAir: "Clean Air Info",
    naturePath: "Nature Path Info",
    safetyTrail: "Safety Trail Info",
    accessibleAdventure: "Accessible Adventure Info",
    discoverExplore: "Discover & Explore Info",
    reports: "Navigators' Reports"
};

const popupIcons = {
    thermalComfort: "http://127.0.0.1:5001/static/img/global-warming.png",
    cleanAir: "http://127.0.0.1:5001/static/img/ventilation.png",
    naturePath: "http://127.0.0.1:5001/static/img/forest.png",
    safetyTrail: "http://127.0.0.1:5001/static/img/safe-zone.png",
    accessibleAdventure: "http://127.0.0.1:5001/static/img/elderly.png",
    discoverExplore: "http://127.0.0.1:5001/static/img/tour-guide.png",
    reports: "http://127.0.0.1:5001/static/img/complain.png"
};

export function openPopup(type) {
    document.getElementById("popupTitle").innerText = popupTitles[type];
    document.getElementById("popupContent").innerText = popupContents[type];

    const popupIcon = document.getElementById("popupIcon");
    popupIcon.src = popupIcons[type];
    popupIcon.alt = `${popupTitles[type]} Icon`;

    const popupContainer = document.getElementById("popupContainer");
    popupContainer.classList.remove("opacity-0", "scale-95", "pointer-events-none");
    popupContainer.classList.add("opacity-100", "scale-100");
}

export function closePopup() {
    const popupContainer = document.getElementById("popupContainer");
    popupContainer.classList.add("opacity-0", "scale-95", "pointer-events-none");
    popupContainer.classList.remove("opacity-100", "scale-100");
}
