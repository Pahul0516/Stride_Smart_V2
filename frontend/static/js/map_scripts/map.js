import { showHazardReportForm } from "http://127.0.0.1:5501/static/js/map_scripts/reports.js";
import { fetchWeatherData } from "http://127.0.0.1:5501/static/js/map_scripts/weather.js";
import {getLatLng, showDirections, showInitialDirections} from "http://127.0.0.1:5501/static/js/map_scripts/directions.js";
import {activeMenu, closeMenu} from "http://127.0.0.1:5501/static/js/map_scripts/menu.js";

export let map, destination, overview, directionsService, directionsRenderer, geocoder, userLocation, marker;

export async function init() {
    await customElements.whenDefined('gmp-map');
    map = document.querySelector('gmp-map');
    if (!map.innerMap) {
        console.error("Map is not fully initialized.");
        return;
    }

    overview = document.getElementById('place-overview');
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    geocoder = new google.maps.Geocoder();

    setupMap();
    setupGeolocation();
    setupEventListeners();
    setupPlaceOverviewButtons();
    setupPlaceOverview();
}

export function setupMap() {
    marker = new google.maps.Marker({
        map: map.innerMap,
        title: location.name,
        category: location.category,
        icon: {
            url: "http://127.0.0.1:5501/static/img/point.png",
            scaledSize: new google.maps.Size(40, 40),
        }
        });

    map.innerMap.setOptions({
        mapTypeControl: false,
        center: { lat: 46.770439, lng: 23.591423 },
        zoom: 15,
        mapId: "563dd7b6a140b929"
    });

    directionsRenderer.setMap(map.innerMap);
}

export function setupGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };

                map.innerMap.setCenter(userLocation);

                new google.maps.Marker({
                    position: userLocation,
                    map: map.innerMap,
                    title: "You are here",
                    icon: {
                        url: "http://127.0.0.1:5501/static/img/map_dot.svg",
                        scaledSize: new google.maps.Size(20, 20),
                    }
                });

                fetchWeatherData(userLocation.lat, userLocation.lng);
            },
            () => {
                console.error("Geolocation permission denied or unavailable.");
            }
        );
    } else {
        console.error("Geolocation is not supported by this browser.");
    }
}

export function setupEventListeners() {
    map.innerMap.addListener("click", (event) => {
        destination = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
        };

        geocoder.geocode({location: destination}, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results[0]) {
                overview.place = results[0];

                const toLocationInput = document.getElementById('to-location');
                if (toLocationInput) {
                    toLocationInput.value = results[0].formatted_address;
                }

            } else {
                console.error("Geocoder failed:", status);
            }

            marker.setPosition(destination);
            map.innerMap.setCenter(destination);
            map.innerMap.setZoom(15);
        });

        showInitialTravelTime();
        fetchWeatherData(destination.lat, destination.lng);
        showOverview();
    });

    const placePicker = document.querySelector('gmpx-place-picker');
    placePicker.addEventListener('gmpx-placechange', () => {
        if (placePicker.value) {
            const placeId = placePicker.value.id;
            if (placeId) {
                const service = new google.maps.places.PlacesService(map.innerMap);
                service.getDetails({placeId: placeId}, (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && place.geometry) {
                        overview.place = place;
                        destination = {
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng(),
                        };

                        marker.setPosition(destination);
                        map.innerMap.setCenter(destination);
                        map.innerMap.setZoom(15);

                        fetchWeatherData(destination.lat, destination.lng);
                        showInitialTravelTime();
                        showOverview();
                    } else {
                        console.error("Failed to get place details:", status);
                    }
                });
            } else {
                console.error("Could not extract placeId from placePicker.value");
            }
        } else {
            resetPlacePicker();
        }
    });

    document.getElementById("centralizeButton").addEventListener("click", resetPlacePicker);
}

export function resetPlacePicker() {
    document.getElementById("directions-container").classList.add("hidden");

    overview.place = null;
    marker.setPosition(null);
    map.innerMap.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
    map.innerMap.setZoom(15);
    directionsRenderer.setDirections({ routes: [] });

    hideOverview();
    fetchWeatherData(userLocation.lat, userLocation.lng);
    const placePickerInput = document.querySelector('gmpx-place-picker').shadowRoot.querySelector('.pac-target-input');
    if (placePickerInput && placePickerInput.value) {
        placePickerInput.value = '';
    }

    const fromLocationInput = document.getElementById('from-location')
    fromLocationInput.value = '';
    fromLocationInput.placeholder = 'Your location';
    document.getElementById('to-location').value = '';
}

export function setupPlaceOverview() {
    const exitButton = document.getElementById("exit-button");
    const map = document.getElementById("map");
    const reportButton = document.getElementById("report-picker-button");
    const slideHandle = document.getElementById("slide-handle");

    slideHandle.addEventListener("click", toggleMinimizedOverview);

    exitButton.addEventListener("click", () => {
        hideOverview();
    });

    map.addEventListener("click", () => {
        showOverview();
    });

    document.getElementById("direction-button")?.addEventListener("click", showDirections);

    if (reportButton) {
        reportButton.addEventListener("click", showHazardReportForm);
    }
}

export function showOverview() {

    if(activeMenu){
        closeMenu(activeMenu);
    }

    const placeOverviewContainer = document.getElementById("place-overview-container");

    placeOverviewContainer.classList.add("opacity-0");
    placeOverviewContainer.classList.add("translate-y-0", "opacity-100");

    setTimeout(() => {
        placeOverviewContainer.classList.remove("translate-y-[90%]");
        placeOverviewContainer.classList.remove("translate-y-full");
    }, 300);
}


export function hideOverview() {
    const placeOverviewContainer = document.getElementById("place-overview-container");
    placeOverviewContainer.classList.add("translate-y-full", "opacity-0");
    placeOverviewContainer.classList.remove("translate-y-0", "opacity-100");
}

export function minimizeOverview() {
    const placeOverviewContainer = document.getElementById("place-overview-container");
    placeOverviewContainer.classList.add("translate-y-[90%]");
}

export function maximizeOverview(){
    const placeOverviewContainer = document.getElementById("place-overview-container");
    placeOverviewContainer.classList.remove("translate-y-[90%]");
}

export function toggleMinimizedOverview() {
    const placeOverviewContainer = document.getElementById("place-overview-container");

    if (placeOverviewContainer.classList.contains("translate-y-[90%]")) {
        maximizeOverview();
    } else {
        minimizeOverview();
    }
}

export function setupPlaceOverviewButtons() {
    const directionButton = document.getElementById('direction-button');
    const exitButton = document.getElementById('exit-button');
    const reportButton = document.getElementById('report-picker-button');

    if (directionButton) {
        directionButton.addEventListener('click', showInitialDirections);
    }

    if (exitButton) {
        exitButton.addEventListener('click', resetPlacePicker);
    }

    if (reportButton) {
        reportButton.addEventListener('click', showHazardReportForm);
    }
}

export function showInitialTravelTime() {

    const travelTimeElement = document.getElementById("travel-time");

    if (!userLocation) {
        travelTimeElement.innerText = "Could not calculate travel details.";
        return;
    }

    directionsService.route(
        {
            origin: userLocation,
            destination,
            travelMode: google.maps.TravelMode.WALKING,
        },
        (response, status) => {
            if (status === "OK" && response.routes[0]) {
                const leg = response.routes[0].legs[0];
                const duration = leg.duration.text;
                const distance = leg.distance.text;

                travelTimeElement.innerText = `Distance: ${distance} | Approx. time: ${duration}`;
            } else {
                travelTimeElement.innerText = "Could not fetch travel details.";
            }
        }
    );
}

export function updateTravelTime() {
    const travelTimeElement = document.getElementById("travel-time");
    const fromInput = document.getElementById("from-location").value.trim();
    const toInput = document.getElementById("to-location").value.trim();

    if (!toInput) {
        travelTimeElement.innerText = "Please enter a destination.";
        return;
    }

    getLatLng(fromInput || userLocation, (fromCoords) => {
        getLatLng(toInput, (toCoords) => {
            if (!fromCoords || !toCoords) {
                travelTimeElement.innerText = "Could not calculate travel details.";
                return;
            }

            directionsService.route(
                {
                    origin: fromCoords,
                    destination: toCoords,
                    travelMode: google.maps.TravelMode.WALKING,
                },
                (response, status) => {
                    if (status === "OK" && response.routes[0]) {
                        const leg = response.routes[0].legs[0];
                        const duration = leg.duration.text;
                        const distance = leg.distance.text;

                        travelTimeElement.innerText = `Distance: ${distance} | Approx. time: ${duration}`;
                    } else {
                        travelTimeElement.innerText = "Could not fetch travel details.";
                    }
                }
            );
        });
    });
}



