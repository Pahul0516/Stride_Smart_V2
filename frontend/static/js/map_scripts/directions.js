import {
    map,
    overview,
    directionsService,
    directionsRenderer,
    userLocation,
    marker,
    googleMap,
    destination,
    resetPlacePicker, showOverview, updateTravelTime, getDestination, setDestination
} from "/projects/2/static/js/map_scripts/map.js";
import { bucketList } from "/projects/2/static/js/map_scripts/tourist.js";

import {gmpxActive} from "/projects/2/static/js/map_scripts/overlays.js";
import {activeFilters} from "/projects/2/static/js/map_scripts/menu.js";
import {setRouteLayer, routeLayer} from "/projects/2/static/js/map_scripts/overlays.js"
let hasAttachedSwapListener = false;
let marker2;

export function deleteMarker2()
{
    if(marker2)
        marker2.setPosition(null);
}

function isElementVisible(el) {
    return el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

async function getDirectionsFromAnotherLocation()
{
    setRouteLayer(null);

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
                    else
                    {
                        console.log('avem coordonate de inceput: ',fromCoords);
                        console.log('avem coordonate de sfarsit: ',toCoords);
                    }
                    addMarkers(fromCoords,toCoords);
                    getDirections(fromCoords,toCoords);
                });
      });
}

async function addMarkers(startCoords,endCoords)
{
    marker.gmpx.setPosition(startCoords);
    marker.google.setPosition(startCoords);
    if(!marker2)
    {
        marker2 = new google.maps.Marker({
            map: map.innerMap,
            title: location.name,
            category: location.category,
            icon: {
                url: "static/img/point.png",
                scaledSize: new google.maps.Size(40, 40),
            }        });

    }
    marker2.setPosition(endCoords);
}

export function showInitialDirections() {

    const fromInput = document.getElementById("from-location");
    const toInput = document.getElementById("to-location");

    if(isElementVisible(fromInput)&& isElementVisible(toInput))
    {
        getDirectionsFromAnotherLocation();
    }
    else {
        console.log('from input is not visible');
        if (userLocation && destination) {
            directionsService.route(
                {
                    origin: userLocation,
                    destination: destination,
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
                        } else {
                            console.log('in SHOW INITIAL endcOOOORDS: ', destination);
                            getDirections(userLocation, destination);
                        }
                    } else {
                        alert("Directions request failed due to " + status);
                    }
                }
            );
        } else {
            console.error("User location or destination is not set.");
        }
    }
}

export function showDirections() {
    setRouteLayer(null);
    if (!userLocation || !destination) {
        console.error("User location or destination is not set.");
        return;
    }
    const swapButton = document.getElementById("swap-locations");

    if (!hasAttachedSwapListener) {
        swapButton.addEventListener("click", () => {
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

        const directionsContainer = document.getElementById("directions-container");
        directionsContainer.classList.remove("hidden");

        hasAttachedSwapListener=true;
    }

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
        console.log('calculating route')

        const fromValue = fromInput.value.trim();
        const toValue = toInput.value.trim();

        if (!fromValue) {
            alert("Please enter a valid starting location.");
            return;
        }

        if (!toValue) {
            alert("Please enter a valid starting location.");
            return;
        }

        getLatLng(fromValue, (fromCoords) => {
            getLatLng(toValue, (toCoords) => {
                if (fromCoords && toCoords) {
                    console.log("From:", fromCoords, "To:", toCoords);
                    let startCoords={
                        lat: fromCoords.lat(),
                        lng: fromCoords.lng()
                    }
                    let endCoords={
                        lat:toCoords.lat(),
                        lng:toCoords.lng()
                    }
                    console.log('in DIRECTIONS endcOOOORDS: ',endCoords);
                    console.log('startCoords: ',startCoords);
                    console.log('endCoords: ',endCoords);
                    getDirections(startCoords, endCoords);
                    //calculateNewRoute(fromCoords, toCoords);
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
        if (routeLayer) {
            routeLayer.setMap(null);
        }
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

// export function getDirections(startCoords,endCoords)
// {
//     console.log('in GETdIRECTIONS endcOOOORDS: ',endCoords);
//     console.log('activeFilters: ',activeFilters);
//     activeFilters.forEach((value) => {
//         console.log('value: ',value);
//     });
//     if(activeFilters.size === 1)
//     {
//         if(activeFilters.has('discover-explore-f'))
//         {   console.log('inainte de functie');
//             getTouristPath(startCoords,endCoords,bucketList);
//             console.log('dupa functie');
//
//         }
//         if(activeFilters.has('nature-path-f'))
//             getNaturePath(startCoords, endCoords);
//         else if(activeFilters.has('accessible-f'))
//             getAccessiblePath(startCoords,endCoords);
//         else if(activeFilters.has('safety-trail-f'))
//             getSafePath(startCoords,endCoords);
//         else if(activeFilters.has('thermal-comfort-f'))
//             getThermalComfortPath(startCoords,endCoords);
//         else if(activeFilters.has('clean-air-f'))
//             getAirQualityPath(startCoords,endCoords);
//     }
//     else
//     {
//         let is_thermal_comfort=0, is_air_quality=0,is_green=0,is_safe=0,is_accessible=0;
//         if(activeFilters.has('nature-path-f'))
//             is_green=1;
//         if(activeFilters.has('accessible-f'))
//             is_accessible=1;
//         else if(activeFilters.has('safety-trail-f'))
//             is_safe=1;
//         else if(activeFilters.has('thermal-comfort-f'))
//             is_thermal_comfort=1;
//         else if(activeFilters.has('clean-air-f'))
//             is_air_quality=1;
//         let payload={
//             is_thermal_comfort:is_thermal_comfort,
//             is_air_quality: is_air_quality,
//             is_green: is_green,
//             is_safe: is_safe,
//             is_accessible: is_accessible,
//             startCoords: startCoords,
//             endCoords: endCoords,
//         }
//         getCombinedPath(payload);
//     }
//
// }

export function getDirections(startCoords,endCoords)
{
    console.log('in GETdIRECTIONS endcOOOORDS: ',endCoords);
    console.log('activeFilters: ',activeFilters);
    activeFilters.forEach((value) => {
        console.log('value: ',value);
    });
    if(activeFilters.size === 1)
    {
        if(activeFilters.has('discover-explore-f'))
            getTouristPath(startCoords,endCoords,bucketList);
        if(activeFilters.has('nature-path-f'))
            getNaturePath(startCoords, endCoords);
        else if(activeFilters.has('accessible-f'))
            getAccessiblePath(startCoords,endCoords);
        else if(activeFilters.has('safety-trail-f'))
            getSafePath(startCoords,endCoords);
        else if(activeFilters.has('thermal-comfort-f'))
            getThermalComfortPath(startCoords,endCoords);
        else if(activeFilters.has('clean-air-f'))
            getAirQualityPath(startCoords,endCoords);
    }
    else
    {
        if(activeFilters.has('discover-explore-f'))
        {
            getTouristPath(startCoords,endCoords,bucketList);
            return;
        }
        else{
            let is_thermal_comfort=0, is_air_quality=0,is_green=0,is_safe=0,is_accessible=0;
        if(activeFilters.has('nature-path-f'))
            is_green=1;
        if(activeFilters.has('accessible-f'))
            is_accessible=1;
        else if(activeFilters.has('safety-trail-f'))
            is_safe=1;
        else if(activeFilters.has('thermal-comfort-f'))
            is_thermal_comfort=1;
        else if(activeFilters.has('clean-air-f'))
            is_air_quality=1;
        let payload={
            is_thermal_comfort:is_thermal_comfort,
            is_air_quality: is_air_quality,
            is_green: is_green,
            is_safe: is_safe,
            is_accessible: is_accessible,
            startCoords: startCoords,
            endCoords: endCoords,
        }
        getCombinedPath(payload);
        }
    }
}

    async function getCombinedPath(payload) {
        fetch("/projects/2/get_combined_path", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        })
            .then(response => response.json())
            .then(data => {
                console.log("Combined path:", data);
                let layer = new google.maps.Data();
                layer.addGeoJson(data);
                layer.setStyle(function (feature) {
                    return {
                        strokeColor: "#26acf4",
                        strokeWeight: 4
                    };
                });
                setRouteLayer(layer);
                if (payload.is_accessible == 1)
                    showInfo(data, true);
                else showInfo(data);
            })
    }

    async function getNaturePath(startCoords, endCoords) {
        fetch("/projects/2/get_greenest_path", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({startCoords, endCoords})
        })
            .then(response => response.json())
            .then(data => {
                console.log("Greenest path:", data);
                let layer = new google.maps.Data();
                layer.addGeoJson(data);
                layer.setStyle(function (feature) {
                    return {
                        strokeColor: "#2eb65d",
                        strokeWeight: 4
                    };
                });
                setRouteLayer(layer);
                showInfo(data);
            })
    }

    async function getAccessiblePath(startCoords, endCoords) {
        fetch("/projects/2/get_accessible_path", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({startCoords, endCoords})
        })
            .then(response => response.json())
            .then(data => {
                console.log("Accessible path 6ca3f2:", data);
                let layer = new google.maps.Data();
                layer.addGeoJson(data);
                layer.setStyle(function (feature) {
                    return {
                        strokeColor: "#0a1115",
                        strokeWeight: 4
                    };
                });
                setRouteLayer(layer);
                showInfo(data, true);
            })
    }

    async function getSafePath(startCoords, endCoords) {
        fetch("/projects/2/get_safest_path", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({startCoords, endCoords})
        })
            .then(response => response.json())
            .then(data => {
                console.log("Safest path :", data);
                let layer = new google.maps.Data();
                layer.addGeoJson(data);
                layer.setStyle(function (feature) {
                    return {
                        strokeColor: "#4fc5c9",
                        strokeWeight: 4
                    };
                });
                setRouteLayer(layer);
                showInfo(data);
            })
    }

    async function getThermalComfortPath(startCoords, endCoords) {
        fetch("/projects/2/get_thermal_comfort_path", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({startCoords, endCoords})
        })
            .then(response => response.json())
            .then(data => {
                console.log("Thermal comfort path 4f941d:", data);
                let layer = new google.maps.Data();
                layer.addGeoJson(data);
                layer.setStyle(function (feature) {
                    return {
                        strokeColor: "#64b12e",
                        strokeWeight: 4
                    };
                });
                setRouteLayer(layer);
                showInfo(data);
            })
    }

    async function getAirQualityPath(startCoords, endCoords) {
        console.log('fetching...');
        fetch("/projects/2/get_air_quality_path", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({startCoords, endCoords})
        })
            .then(response => response.json())
            .then(data => {
                console.log("Air quality path ed5076:", data);
                let layer = new google.maps.Data();
                layer.addGeoJson(data);
                layer.setStyle(function (feature) {
                    return {
                        strokeColor: "#bc6277",
                        strokeWeight: 4
                    };
                });
                setRouteLayer(layer);
                showInfo(data);
            })
    }

//display estimated distance and time taken for a route
//different formula if accessibility is selected
    function showInfo(data, accessible = false) {
        const travelTimeElement = document.getElementById("travel-time");
        let routeLength = Math.round(data.features[0]?.properties?.length || 0);
        let estimated_time; //estimated time in minutes, knowing avg walking speed = 5km/h
        if (accessible == true)
            estimated_time = Math.round(routeLength / 83 * 5);
        else estimated_time = Math.round(routeLength / 83);
        travelTimeElement.innerText = `Distance: ${routeLength} meters | Approx. time: ${estimated_time}minutes`;
    }

    async function getTouristPath(startCoords, endCoords, bucketList) {
        console.log('bucket list: ', bucketList);
        let payload = {
            startCoords: startCoords,
            endCoords: endCoords,
            bucketList: bucketList,
        }
        fetch("/projects/2/get_tourist_path", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        })
            .then(response => response.json())
            .then(data => {
                console.log("Tourist path a371f4:", data);
                let layer = new google.maps.Data();
                layer.addGeoJson(data);
                layer.setStyle(function (feature) {
                    return {
                        strokeColor: "#aa8cd4",
                        strokeWeight: 4
                    };
                });
                setRouteLayer(layer);
            })
    }
