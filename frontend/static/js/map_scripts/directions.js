import {
    map,
    destination,
    overview,
    directionsService,
    directionsRenderer,
    userLocation,
    marker,
    resetPlacePicker, showOverview, hideOverview, updateTravelTime
} from "/projects/2/static/js/map_scripts/map.js";

export function showInitialDirections() {
    if (userLocation && destination) {
        directionsService.route(
            {
                origin: userLocation,
                destination: destination,
                travelMode: google.maps.TravelMode.WALKING,
            },
            (response, status) => {
                if (status === "OK") {
                    directionsRenderer.setDirections(response);
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
    if (!userLocation || !destination) {
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

    getPlaceName(destination, (destination) => {
        toInput.value = destination || "";
    });

    addAutocomplete("from-location");
    addAutocomplete("to-location");

    document.getElementById("calculate-route").addEventListener("click", () => {
        const fromValue = fromInput.value.trim();
        const toValue = toInput.value.trim();

        if (!fromValue) {
            alert("Please enter a valid starting location.");
            return;
        }

        getLatLng(fromValue, (fromCoords) => {
            getLatLng(toValue, (toCoords) => {
                if (fromCoords && toCoords) {
                    calculateNewRoute(fromCoords, toCoords);
                } else {
                    alert("Invalid locations. Please enter a valid address.");
                }
            });
        });
    });

    document.getElementById("swap-locations").addEventListener("click", () => {
        const tempValue = fromInput.value;
        fromInput.value = toInput.value;
        toInput.value = tempValue;

        if (!fromInput.value.trim()) {
            fromInput.placeholder = "Choose starting point";
        } else {
            fromInput.placeholder = "";
        }
    });

    fromInput.addEventListener("focus", (event) => {
        event.target.select();
    });

    toInput.addEventListener("focus", (event) => {
        event.target.select();
    });

    document.getElementById("cancel-directions").addEventListener("click", () => {
        resetPlacePicker();
    });

    fromInput.addEventListener("change", (event) => {
        updatePlaceOverview(event.target.value.trim(), "from");
    });

    toInput.addEventListener("change", (event) => {
        updatePlaceOverview(event.target.value.trim(), "to");
    });

    yourLocationButton.addEventListener("click", () => {
        if (userLocation) {
            getPlaceName(userLocation, (placeName) => {
                fromInput.value = placeName || "Current Location";
                updatePlaceOverview(fromInput.value.trim(), "from");
            });
        } else {
            alert("Your location is not available.");
        }
    });
}

function getPlaceName(latLng, callback) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: latLng }, (results, status) => {
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
        componentRestrictions: { country: "ro" },
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
    geocoder.geocode({ address: placeName }, (results, status) => {
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

    directionsService.route(
        {
            origin: fromCoords,
            destination: toCoords,
            travelMode: google.maps.TravelMode.WALKING,
        },
        (response, status) => {
            if (status === "OK") {
                directionsRenderer.setDirections(response);
            } else {
                alert("Directions request failed: " + status);
            }
        }
    );
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
                        marker.setPosition(coords);
                    } else {
                        console.warn(`Invalid ${type} location:`, placeName);
                    }
                }
            );
        }
    });
}


