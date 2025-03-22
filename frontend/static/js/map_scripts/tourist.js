import { map } from "/projects/2/static/js/map_scripts/map.js";
import { activateTouristButton, deactivateTouristButton } from "/projects/2/static/js/map_scripts/menu.js";

export let markers = [];
export let activeTouristCategories = new Set();

export function setupTouristPopup() {
    const touristPopup = document.getElementById("touristPopup");
    const closeTouristPopup = document.getElementById("closeTouristPopup");
    const overlayMenu = document.getElementById("overlayMenu");
    const clearButton = document.getElementById("clearTouristButton");

    if (!touristPopup || !closeTouristPopup || !overlayMenu || !clearButton) {
        console.error("One or more elements not found.");
        return;
    }

    touristPopup.classList.remove("hidden", "translate-y-full");
    overlayMenu.classList.add("translate-y-full");

    updateButtonState();

    closeTouristPopup.addEventListener("click", () => {
        closeTouristPopupHandler();
    }, { once: true });

    attachChipListeners();
    setupClearButton();
}

function closeTouristPopupHandler() {
    const touristPopup = document.getElementById("touristPopup");
    const overlayMenu = document.getElementById("overlayMenu");

    touristPopup.classList.add("hidden", "translate-y-full");
    overlayMenu.classList.remove("translate-y-full");

    if(!activeTouristCategories){
        updateButtonState();
    }
}

function attachChipListeners() {
    document.querySelectorAll(".chip").forEach(button => {
        button.replaceWith(button.cloneNode(true));
    });

    document.querySelectorAll(".chip").forEach(button => {
        button.addEventListener("click", async () => {
            const category = button.textContent.trim().toLowerCase();
            const isActive = activeTouristCategories.has(category);

            if (isActive) {
                activeTouristCategories.delete(category);
                removeMarkers(category);
                button.classList.remove("bg-[#A5B68D]", "text-white");
                button.classList.add("bg-white", "text-gray-700");
            } else {
                activeTouristCategories.add(category);
                const locations = await fetchTouristData(category);
                addMarkers(category, locations);
                button.classList.add("bg-[#A5B68D]", "text-white");
                button.classList.remove("bg-white", "text-gray-700");
            }

            updateButtonState();
        });
    });
}


async function fetchTouristData(category) {
    try {
        const response = await fetch('../data/tourist_data.json');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data.filter(item => item.category === category);
    } catch (error) {
        console.error('Error fetching tourist data:', error);
        return [];
    }
}

function addMarkers(category, locations) {
    const iconUrl = `/projects/2/static/img//${category}.png`;
    locations.forEach(location => {
        const marker = new google.maps.Marker({
            position: { lat: location.latitude, lng: location.longitude },
            map: map.innerMap,
            title: location.name,
            category: category,
            icon: { url: iconUrl, scaledSize: new google.maps.Size(25, 25) }
        });
        markers.push(marker);
    });
}

export function removeMarkers(category) {
    markers = markers.filter(marker => {
        if (marker.category === category) {
            marker.setMap(null);
            return false;
        }
        return true;
    });

    updateButtonState();
}

function setupClearButton() {
    document.getElementById("clearTouristButton").addEventListener("click", () => {
        activeTouristCategories.forEach(category => removeMarkers(category));

        activeTouristCategories.forEach(category => {
            const chip = document.querySelector(`[data-category="${category}"]`);
            if (chip) {
                chip.classList.remove("bg-[#A5B68D]", "text-white");
                chip.classList.add("bg-white", "text-gray-700");
            }
        });

        activeTouristCategories.clear();

        markers.forEach(marker => marker.setMap(null));
        markers = [];

        updateButtonState();
    });
}


function updateButtonState() {
    const clearButtonContainer = document.getElementById("clearTouristContainer");
    clearButtonContainer.classList.toggle("hidden", activeTouristCategories.size === 0);

    if (activeTouristCategories.size === 0) {
        deactivateTouristButton();
    } else {
        activateTouristButton();
    }
}
