import {
    map,
    destination,
    overview,
    directionsService,
    directionsRenderer,
    userLocation,
    marker,
    resetPlacePicker, showOverview, hideOverview, updateTravelTime,
} from "/projects/2/static/js/map_scripts/map.js";
import {activeFilters} from "/projects/2/static/js/map_scripts/menu.js";

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
                    if(activeFilters.size === 0) {
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
                    else{
                        console.log('in SHOW INITIAL endcOOOORDS: ',destination);
                        getDirections(userLocation, destination);
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

export let routeLayer;
let fromAutocomplete, toAutocomplete;
let fromLatLng, toLatLng;

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
    // console.log('fromCoords: ',fromCoords.lat(), fromCoords.lng());
    // console.log('toCoords: ',toCoords.lat(), toCoords.lng());
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

export function getDirections(startCoords,endCoords)
{
    console.log('in GETdIRECTIONS endcOOOORDS: ',endCoords);
    console.log('activeFilters: ',activeFilters);
    activeFilters.forEach((value) => {
        console.log('value: ',value);
    });
    if(activeFilters.has('nature-path-f'))
    {
        console.log('in nature path');
    }
    if(activeFilters.size === 1)
    {
        if(activeFilters.has('nature-path-f'))
            getNaturePath(startCoords, endCoords);
        else if(activeFilters.has('accessible-f'))
            getAccessiblePath(startCoords,endCoords)
        else if(activeFilters.has('safety-trail-f'))
            getSafePath(startCoords,endCoords)
    }
    else console.log('n avem ruta inca :(')
    
}

async function getNaturePath(startCoords,endCoords)
{
    fetch("/projects/2/get_greenest_path", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ startCoords, endCoords })
    })
    .then(response => response.json())
    .then(data => {
        console.log("Greenest path:", data);
        if (routeLayer) {
            routeLayer.setMap(null);
        }
        routeLayer = new google.maps.Data();
        routeLayer.addGeoJson(data);
        routeLayer.setStyle(function(feature) {
            return {
                strokeColor:"#2eb65d", 
                strokeWeight: 4
            };
        });
        routeLayer.setMap(map.innerMap);
        showInfo(data);
    })  
}

async function getAccessiblePath(startCoords,endCoords)
{
    fetch("/projects/2/get_accessible_path", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ startCoords, endCoords })
    })
    .then(response => response.json())
    .then(data => {
        console.log("Accessible path:", data);
        if (routeLayer) {
            routeLayer.setMap(null);
        }
        routeLayer = new google.maps.Data();
        routeLayer.addGeoJson(data);
        routeLayer.setStyle(function(feature) {
            return {
                strokeColor:"#6ca3f2", 
                strokeWeight: 4
            };
        });
        routeLayer.setMap(map.innerMap);
        showInfo(data);
    })  
}

async function getSafePath(startCoords,endCoords)
{

    fetch("/projects/2/get_safest_path", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ startCoords, endCoords })
    })
    .then(response => response.json())
    .then(data => {
        console.log("Safest path:", data);
        if (routeLayer) {
            routeLayer.setMap(null);
        }
        routeLayer = new google.maps.Data();
        routeLayer.addGeoJson(data);
        routeLayer.setStyle(function(feature) {
            return {
                strokeColor:"#c94f67", 
                strokeWeight: 4
            };
        });
        routeLayer.setMap(map.innerMap);
        showInfo(data);
    })  
}

//display estimated distance and time taken for a route
//different formula if accessibility is selected
function showInfo(data,accessible=false) {
    console.log('data: ',data);
    console.log('data.features: ',data.features)
    console.log('data.features[0]: ',data.features[0])
    console.log('data.features[0]?.properties?.length: ',data.features[0]?.properties?.length)
    let routeLength = Math.round(data.features[0]?.properties?.length || 0);
    let estimated_time; //estimated time in minutes, knowing avg walking speed = 5km/h
    if(accessible==true)
        estimated_time=Math.round(routeLength/83/5);
    else estimated_time=Math.round(routeLength/83);
    let info="Distance: "+routeLength+" meters \nTime: "+estimated_time+" min";
    alert(info);
}

export function initFromAutocomplete() {
    fromAutocomplete = new google.maps.places.Autocomplete(
        document.getElementById('from-location'),
        { types: ['geocode'] } // Restrict to addresses
    );

    fromAutocomplete.addListener('place_changed', () => {
        let place = fromAutocomplete.getPlace();

        if (!place.geometry) {
            console.error("No details available for input:", place);
            return;
        }

        fromLatLng = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
        };

        console.log("Selected location:", fromLatLng); // Check in console
        console.log('destionation: ',destination);
    });
}

function getStartLocation()
{
    let place = fromAutocomplete.getPlace();
    fromLatLng = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
    };
    console.log('selected location: ',fromLatLng);
    console.log('destination: ',destination);
}
