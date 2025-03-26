import { showHazardReportForm } from "./reports.js";
import { fetchWeatherData } from "./weather.js";
import {getLatLng, showDirections, showInitialDirections} from "./directions.js";
import {activeMenu, closeMenu} from "./menu.js";
import {gmpxActive} from "./overlays.js";

export let map, googleMap, googleAutocomplete, overview, directionsService, directionsRenderer, geocoder, userLocation, marker;
let destination;

export async function init() {
    await customElements.whenDefined('gmp-map');
    map = document.querySelector('gmp-map');

    if (!map.innerMap) {
        console.error("GMPX Map is not fully initialized.");
        return;
    }

    googleMap = new google.maps.Map(document.getElementById("google-maps-container"), {
        center: { lat: 46.770439, lng: 23.591423 },
        zoom: 15,
        mapTypeControl: false,
        mapId: "563dd7b6a140b929"
    });

    if (!googleMap) {
        console.error("Google Maps API Map is not fully initialized.");
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
    const gmpxMarker = new google.maps.Marker({
        map: map.innerMap,
        title: "Selected Location",
        icon: {
            url: "../icons/point.png",
            scaledSize: new google.maps.Size(40, 40),
        }
    });

    const googleMarker = new google.maps.Marker({
        map: googleMap,
        title: "Selected Location",
        icon: {
            url: "../icons/point.png",
            scaledSize: new google.maps.Size(40, 40),
        }
    });

    map.innerMap.setOptions({
        mapTypeControl: false,
        center: { lat: 46.770439, lng: 23.591423 },
        zoom: 15,
        mapId: "563dd7b6a140b929"
    });

    googleMap.setOptions({
        mapTypeControl: false,
        center: { lat: 46.770439, lng: 23.591423 },
        zoom: 15,
    });

    marker = {
        gmpx: gmpxMarker,
        google: googleMarker
    };

    directionsRenderer.setMap(gmpxActive ? map.innerMap : googleMap);
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
                googleMap.setCenter(userLocation);

                const gmpxUserMarker = new google.maps.Marker({
                    position: userLocation,
                    map: map.innerMap,
                    title: "You are here",
                    icon: {
                        url: "../icons/map_dot.svg",
                        scaledSize: new google.maps.Size(20, 20),
                    }
                });

                const googleUserMarker = new google.maps.Marker({
                    position: userLocation,
                    map: googleMap,
                    title: "You are here",
                    icon: {
                        url: "../icons/map_dot.svg",
                        scaledSize: new google.maps.Size(20, 20),
                    }
                });

                marker.user = {
                    gmpx: gmpxUserMarker,
                    google: googleUserMarker
                };

                fetchWeatherData(userLocation.lat, userLocation.lng);

                navigator.geolocation.watchPosition((position) => {
                        userLocation = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };

                        map.innerMap.setCenter(userLocation);
                        googleMap.setCenter(userLocation);

                        marker.user.gmpx.setPosition(userLocation);
                        marker.user.google.setPosition(userLocation);
                    },
                    (error) => {
                        console.error("Error watching position:", error);
                    });
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
    function handleMapClick(event, isGoogleMap) {
        directionsRenderer.setDirections({ routes: [] });
        destination = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
        };

        geocoder.geocode({ location: destination }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results[0]) {
                overview.place = results[0];

                const toLocationInput = document.getElementById('to-location');
                if (toLocationInput) {
                    toLocationInput.value = results[0].formatted_address;
                }

            } else {
                console.error("Geocoder failed:", status);
            }

            marker[isGoogleMap ? "google" : "gmpx"].setPosition(destination);
            if (isGoogleMap) {
                googleMap.setCenter(destination);
                googleMap.setZoom(15);
            } else {
                map.innerMap.setCenter(destination);
                map.innerMap.setZoom(15);
            }
        });

        showInitialTravelTime();
        fetchWeatherData(destination.lat, destination.lng);
        showOverview();
    }

    map.innerMap.addListener("click", (event) => handleMapClick(event, false));
    googleMap.addListener("click", (event) => handleMapClick(event, true));

    const placePicker = document.querySelector('gmpx-place-picker');
    placePicker.addEventListener('gmpx-placechange', () => {
        if (placePicker.value) {
            const placeId = placePicker.value.id;
            if (placeId) {
                const service = new google.maps.places.PlacesService(map.innerMap);
                service.getDetails({ placeId: placeId }, (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && place.geometry) {
                        overview.place = place;
                        destination = {
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng(),
                        };

                        marker.gmpx.setPosition(destination);
                        marker.google.setPosition(destination);
                        map.innerMap.setCenter(destination);
                        googleMap.setCenter(destination);
                        map.innerMap.setZoom(15);
                        googleMap.setZoom(15);

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

    marker.gmpx.setPosition(null);
    marker.google.setPosition(null);

    map.innerMap.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
    googleMap.setCenter({ lat: userLocation.lat, lng: userLocation.lng });

    map.innerMap.setZoom(15);
    googleMap.setZoom(15);

    directionsRenderer.setDirections({ routes: [] });

    hideOverview();

    fetchWeatherData(userLocation.lat, userLocation.lng);

    const placePicker = document.querySelector('gmpx-place-picker');
    if (placePicker) {
        const placePickerInput = placePicker.shadowRoot?.querySelector('.pac-target-input');
        if (placePickerInput) {
            placePickerInput.value = '';
        }
        placePicker.removeAttribute("value");
    }

    document.getElementById('from-location').value = '';
    document.getElementById('from-location').placeholder = 'Your location';
    document.getElementById('to-location').value = '';
}


export function initGooglePlacePicker() {
    const googlePlacePicker = document.getElementById("google-place-picker");

    if (!googlePlacePicker) {
        console.error("Google Place Picker input not found in DOM.");
        return;
    }

    googleAutocomplete = new google.maps.places.Autocomplete(googlePlacePicker);

    googleAutocomplete.addListener("place_changed", () => {
        const place = googleAutocomplete.getPlace();
        if (!place.geometry) {
            console.error("No geometry found for the selected place.");
            return;
        }

        destination = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
        };

        if (!marker.google) {
            marker.google = new google.maps.Marker({
                position: destination,
                map: googleMap,
                title: place.name,
                icon: {
                    url: "../icons/point.png",
                    scaledSize: new google.maps.Size(40, 40),
                }
            });
        } else {
            marker.google.setPosition(destination);
            marker.google.setMap(googleMap);
        }

        googleMap.setCenter(destination);
        googleMap.setZoom(15);

        fetchWeatherData(destination.lat, destination.lng);
        showInitialTravelTime();
        showOverview();
    });

    console.log("Google Place Picker initialized.");
}

export function setupPlaceOverview() {
    const exitButton = document.getElementById("exit-button");
    const reportButton = document.getElementById("report-picker-button");
    const slideHandle = document.getElementById("slide-handle");

    slideHandle.addEventListener("click", toggleMinimizedOverview);
    exitButton.addEventListener("click", hideOverview);

    map.innerMap.addListener("click", () => showOverview());
    googleMap.addListener("click", () => showOverview());

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
    placeOverviewContainer.classList.add("translate-y-10", "opacity-100");

    setTimeout(() => {
        placeOverviewContainer.classList.remove("translate-y-[94%]");
        placeOverviewContainer.classList.remove("translate-y-full");
    }, 300);
}

export function hideOverview() {
    const placeOverviewContainer = document.getElementById("place-overview-container");
    placeOverviewContainer.classList.add("translate-y-full", "opacity-0");
    placeOverviewContainer.classList.remove("translate-y-10", "opacity-100");
}

export function minimizeOverview() {
    const placeOverviewContainer = document.getElementById("place-overview-container");
    placeOverviewContainer.classList.add("translate-y-[94%]");
}

export function maximizeOverview(){
    const placeOverviewContainer = document.getElementById("place-overview-container");
    placeOverviewContainer.classList.remove("translate-y-[94%]");
}

export function toggleMinimizedOverview() {
    const placeOverviewContainer = document.getElementById("place-overview-container");

    if (placeOverviewContainer.classList.contains("translate-y-[94%]")) {
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

export function setDestination(newDest) {
    destination = newDest;
}

export function getDestination() {
    return destination;
}