import {
    map,
    overview,
    directionsService,
    directionsRenderer,
    userLocation,
    marker,
    googleMap,
    resetPlacePicker, showOverview, updateTravelTime, getDestination, setDestination
} from "/projects/2/static/js/map_scripts/map.js";

import {gmpxActive} from "/projects/2/static/js/map_scripts/overlays.js";
import {activeFilters} from "/projects/2/static/js/map_scripts/menu.js";

let hasAttachedSwapListener = false;

export function showInitialDirections() {
    if (userLocation && getDestination()) {
        directionsService.route(
            {
                origin: userLocation,
                destination: getDestination(),
                travelMode: google.maps.TravelMode.WALKING,
            },
            (response, status) => {
                if (status === "OK") {
                    directionsRenderer.setMap(gmpxActive ? map.innerMap : googleMap);
                    marker.gmpx.setPosition(getDestination());
                    if (activeFilters.size === 0) {
                        directionsRenderer.setDirections(response);
                        directionsRenderer.setOptions({
                            polylineOptions: {
                                strokeColor: "#083708",
                                strokeOpacity: 0.7,
                                strokeWeight: 5,
                                zIndex: 1000
                            },
                            suppressMarkers: true,
                            preserveViewport: true
                        });
                    }
                } else {
                    alert("Directions request failed due to " + status);
                }
            }
        );
    } else {
        console.error("User location or destination is not set.");
    }
}

export function showDirections() {
    if (!userLocation || !getDestination()) {
        console.error("User location or destination is not set.");
        return;
    }

    const directionsContainer = document.getElementById("directions-container");
    directionsContainer.classList.remove("hidden");

    const fromInput = document.getElementById("from-location");
    const toInput = document.getElementById("to-location");
    const yourLocationButton = document.getElementById("your-location-button");

    if (userLocation) {
        getPlaceName(userLocation, (placeName) => {
            fromInput.value = placeName || "Current Location";
        });
    }

    getPlaceName(getDestination(), (destination) => {
        toInput.value = destination || "";
    });

    addAutocomplete("from-location");
    addAutocomplete("to-location");

    const swapButton = document.getElementById("swap-locations");

    if (!hasAttachedSwapListener) {
        swapButton.addEventListener("click", () => {
            console.log("Clicked!");
            const tempValue = fromInput.value;
            fromInput.value = toInput.value;
            toInput.value = tempValue;

            if (!fromInput.value.trim()) {
                fromInput.placeholder = "Choose starting point";
            } else {
                fromInput.placeholder = "";
            }

            getLatLng(toInput.value, (toCoords) => {
                marker.gmpx.setPosition(toCoords);
                setDestination(toCoords);
            });
        });

        hasAttachedSwapListener = true;
    }

    fromInput.addEventListener("focus", (event) => {
        event.target.select();
    });

    toInput.addEventListener("focus", (event) => {
        event.target.select();
    });

    document.getElementById("exit-button").addEventListener("click", () => {
        resetPlacePicker();
    });

    fromInput.addEventListener("change", (event) => {
        const from = event.target.value.trim();
        updatePlaceOverview(from, "from");
        calculateNewRoute(from, toInput.value.trim());
    });

    toInput.addEventListener("change", (event) => {
        const to = event.target.value.trim();
        getLatLng(to, (toCoords)=> {setDestination(toCoords);}) ;
        updatePlaceOverview(to, "to");
        calculateNewRoute(fromInput.value.trim(), to);
    });

    yourLocationButton.addEventListener("click", () => {
        if (userLocation) {
            getPlaceName(userLocation, (placeName) => {
                fromInput.value = placeName || "Current Location";
                updatePlaceOverview(fromInput.value.trim(), "from");
                calculateNewRoute(userLocation, toInput.value.trim());
            });
        } else {
            alert("Your location is not available.");
        }
    });
}

function getPlaceName(latLng, callback) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({location: latLng}, (results, status) => {
        if (status === "OK" && results[0]) {
            callback(results[0].formatted_address);
        } else {
            callback(null);
        }
    });
}

function addAutocomplete(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const autocomplete = new google.maps.places.Autocomplete(input, {
        componentRestrictions: {country: "ro"},
        fields: ["geometry", "name", "formatted_address"],
    });

    if (userLocation) {
        const circle = new google.maps.Circle({
            center: userLocation,
            radius: 20000,
        });
        autocomplete.setBounds(circle.getBounds());
    }

    return autocomplete;
}

export function getLatLng(placeName, callback) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({address: placeName}, (results, status) => {
        if (status === "OK" && results.length > 0) {
            callback(results[0].geometry.location);
        } else {
            callback(null);
        }
    });
}

function calculateNewRoute(fromCoords, toCoords) {
    if (!toCoords) {
        alert("Please enter a valid destination.");
        return;
    }

    if (activeFilters.size === 0) {
        directionsService.route(
            {
                origin: fromCoords,
                destination: toCoords,
                travelMode: google.maps.TravelMode.WALKING,
            },
            (response, status) => {
                if (status === "OK") {
                    directionsRenderer.setDirections(response);
                    const bounds = new google.maps.LatLngBounds();
                    const leg = response.routes[0].legs[0];
                    bounds.extend(leg.start_location);
                    bounds.extend(leg.end_location);
                    map.innerMap.fitBounds(bounds);
                } else {
                    alert("Directions request failed: " + status);
                }
            }
        );
    }
}

function updatePlaceOverview(placeName, type) {
    if (!placeName) return;

    getLatLng(placeName, (coords) => {
        if (coords) {
            const placesService = new google.maps.places.PlacesService(map.innerMap);
            placesService.findPlaceFromQuery(
                {
                    query: placeName,
                    fields: ["place_id"],
                },
                (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results[0]) {
                        overview.place = results[0];
                        updateTravelTime();
                        showOverview();
                        map.innerMap.setCenter(coords);
                        map.innerMap.setZoom(15);
                        if (type === "to") {
                            marker.gmpx.setPosition(coords);
                        }

                    } else {
                        console.warn(`Invalid ${type} location:`, placeName);
                    }
                }
            );
        }
    });
}

