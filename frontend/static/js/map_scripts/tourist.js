import { map } from "/projects/2/static/js/map_scripts/map.js";
import { activateTouristButton, deactivateTouristButton } from "/projects/2/static/js/map_scripts/menu.js";

export let markers = [];
export let bucketList = [];
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
    });

    attachChipListeners();
    setupClearButton();
    setupBucketListButton();

    document.getElementById("clear-bucket-list").addEventListener("click", ()=> {
        clearBucketList();
    });
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
        const response = await fetch('/projects/2/static/data/static-data/tourist_data.json');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data.filter(item => item.category === category);
    } catch (error) {
        console.error('Error fetching tourist data:', error);
        return [];
    }
}

function addMarkers(category, locations) {
    locations.forEach(location => {
        const isInBucketList = bucketList.some(item => item.latitude === location.latitude && item.longitude === location.longitude);
        const iconUrl = isInBucketList ? `/projects/2/static/img/${category}2.png` : `/projects/2/static/img/${category}.png`;

        const marker = new google.maps.Marker({
            position: { lat: location.latitude, lng: location.longitude },
            map: map.innerMap,
            title: location.name,
            category: category,
            icon: { url: iconUrl, scaledSize: new google.maps.Size(30, 30) }
        });

        marker.addListener("click", () => {
            setupAddToBucketListPopup(location);
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

function setupAddToBucketListPopup(location) {
    const popup = document.getElementById("add-to-bucket-list");
    const closeButton = document.getElementById("close-add-to-bucket-list");
    const questionElement = document.getElementById("popup-question");
    const yesButton = document.getElementById("yes-bucket-list-button");
    const noButton = document.getElementById("no-bucket-list-button");
    const touristPopup = document.getElementById("touristPopup");

    if (!popup || !closeButton || !yesButton || !noButton) {
        console.error("One or more elements for the Add to Bucket List popup are missing.");
        return;
    }

    popup.classList.remove("hidden");
    document.getElementById("popup-location-name").textContent = location.name;
    // touristPopup.classList.add("hidden", "translate-y-full");

    const isInBucketList = bucketList.some(item => item.name === location.name);
    const marker = markers.find(m => m.title === location.name);

    if (isInBucketList) {
        questionElement.textContent = "Cross this off the list?";
        yesButton.textContent = "Yes, off it goes!";
        noButton.textContent = "No, keeping it!";
        yesButton.onclick = () => {
            removeFromBucketList(location.name);
            if (marker) {
                marker.setIcon({
                    url: `/projects/2/static/img/${location.category}.png`,
                    scaledSize: new google.maps.Size(30, 30)
                });
            }
            closeAddToBucketListPopup();
            // touristPopup.classList.remove("hidden", "translate-y-full");
        };
        noButton.onclick = () => {
            closeAddToBucketListPopup();
            // touristPopup.classList.remove("hidden", "translate-y-full");
        }
    } else {
        questionElement.textContent = "Bucket list-worthy or not?";
        yesButton.textContent = "Yes, add it!";
        noButton.textContent = "No, I'll pass!";
        yesButton.onclick = () => {
            addToBucketList(location);
            addToBucketList(location);
            if (marker) {
                marker.setIcon({
                    url: `/projects/2/static/img/${location.category}2.png`,
                    scaledSize: new google.maps.Size(30, 30)
                });
            }
            closeAddToBucketListPopup();
            // touristPopup.classList.remove("hidden", "translate-y-full");
        };
        noButton.onclick = () => {
            closeAddToBucketListPopup();
            // touristPopup.classList.remove("hidden", "translate-y-full");
        }
    }

    closeButton.onclick = () => {
        closeAddToBucketListPopup();
        // touristPopup.classList.remove("hidden", "translate-y-full");
    };

    updateBucketListButtonVisibility();
}

function closeAddToBucketListPopup() {
    const popup = document.getElementById("add-to-bucket-list");
    if (popup) {
        popup.classList.add("hidden");
    }
}

function setupBucketListButton(){
    const bucketListButton = document.getElementById("bucket-list-btn");
    const closeBucketListButton = document.getElementById("close-buckets-list");

    bucketListButton.addEventListener("click", () => {
        showBucketList();
    })

    closeBucketListButton.addEventListener("click", () => {
        hideBucketList();
    })
}

function updateBucketListButtonVisibility() {
    const button = document.getElementById("bucket-list-btn");
    button.classList.toggle("hidden", bucketList.length === 0);
}

function showBucketList() {
    const popup = document.getElementById("bucket-list-popup");
    const touristPopup = document.getElementById("touristPopup");
    // touristPopup.classList.add("hidden", "translate-y-full");
    popup.classList.remove("hidden");
}

function hideBucketList() {
    const popup = document.getElementById("bucket-list-popup");
    const touristPopup = document.getElementById("touristPopup");
    // touristPopup.classList.remove("hidden", "translate-y-full");
    popup.classList.add("hidden");
}

function addToBucketList(location) {
    if (!bucketList.some(item => item.name === location.name)) {
        bucketList.push(location);
        updateBucketListUI();
        updateBucketListButtonVisibility();
    }
}

function updateBucketListUI() {
    const listContainer = document.getElementById("bucket-list");
    listContainer.innerHTML = "";

    bucketList.forEach((location, index) => {
        const listItem = document.createElement("li");
        listItem.classList.add(
            "flex", "items-center", "bg-white", "shadow-sm", "px-4", "py-3", "rounded-lg",
            "transition-all", "duration-200"
        );

        const iconUrl = `../icons/${location.category}.png`;

        const categorySpan = document.createElement("span");
        categorySpan.classList.add("w-12", "flex", "justify-center", "items-center");

        const categoryIcon = document.createElement("img");
        categoryIcon.src = iconUrl;
        categoryIcon.alt = location.category;
        categoryIcon.classList.add("w-6", "h-6", "object-contain");

        categorySpan.appendChild(categoryIcon);

        const locationSpan = document.createElement("span");
        locationSpan.classList.add("flex-grow", "font-semibold", "truncate", "text-center");
        locationSpan.textContent = location.name;

        const removeButton = document.createElement("button");
        removeButton.classList.add("w-12", "text-right", "text-[#DA8359]", "hover:text-red-600", "transition-all", "duration-200");
        removeButton.textContent = "X";
        removeButton.addEventListener("click", () => removeFromBucketList(location, index));

        listItem.appendChild(categorySpan);
        listItem.appendChild(locationSpan);
        listItem.appendChild(removeButton);

        listContainer.appendChild(listItem);
    });
}

function removeFromBucketList(location, index) {

    bucketList.splice(index, 1);
    updateBucketListUI();
    updateBucketListButtonVisibility();
    updateMarkers();
}

function clearBucketList() {
    bucketList = [];
    updateBucketListUI();
    updateBucketListButtonVisibility();
    updateMarkers();
}

function updateMarkers() {
    markers.forEach(marker => {
        const isInBucketList = bucketList.some(item =>
            item.latitude === marker.getPosition().lat() &&
            item.longitude === marker.getPosition().lng()
        );

        const iconUrl = isInBucketList
            ? `/projects/2/static/img/${marker.category}2.png`
            : `/projects/2/static/img/${marker.category}.png`;

        marker.setIcon({ url: iconUrl, scaledSize: new google.maps.Size(30, 30) });
    });
}
