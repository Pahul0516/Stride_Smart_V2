let userLocation;
let destination;
let directionsService;
let directionsRenderer;
let map;
let geocoder;
let overview;
let marker;
let overlayVisible = false;
let comfortOverlayData = null;
let attractionsData = null;
const categories = ["landmark", "museum", "caffe", "restaurant", "entertainment"];

async function init() {
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
    setupMenuControls();
    setupPlaceOverviewButtons();
    setupTouristDropdown();

    document.getElementById('temperature-button').addEventListener('click', () => {
        toggleComfortOverlay()
    });
}

function setupMap() {
    marker = new google.maps.Marker({map: map.innerMap});

    map.innerMap.setOptions({
        mapTypeControl: false,
        center: {lat: 46.770439, lng: 23.591423},
        zoom: 15,
        mapId: "563dd7b6a140b929"
    });

    directionsRenderer.setMap(map.innerMap);
}

function setupGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };

                map.innerMap.setCenter(userLocation);

                // Add a marker for the user's current position
                new google.maps.Marker({
                    position: userLocation,
                    map: map.innerMap,
                    title: "You are here",
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: "rgba(0,102,255,0.64)",
                        fillOpacity: 1,
                        strokeColor: "rgba(0,31,154,0.5)",
                        strokeWeight: 2,
                        scale: 8,
                    },
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

function setupEventListeners() {
    map.innerMap.addListener("click", (event) => {
        destination = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
        };

        geocoder.geocode({location: destination}, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results[0]) {
                overview.place = results[0];
            } else {
                console.error("Geocoder failed:", status);
            }

            marker.setPosition(destination);
            map.innerMap.setCenter(destination);
            map.innerMap.setZoom(15);
        });

        fetchWeatherData(destination.lat, destination.lng);
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
}

function resetPlacePicker() {
    overview.place = null;
    marker.setPosition(null);
    map.innerMap.setCenter({lat: 46.770439, lng: 23.591423});
    map.innerMap.setZoom(15);
    directionsRenderer.setDirections({routes: []});

    const placePickerInput = document.querySelector('gmpx-place-picker').shadowRoot.querySelector('.pac-target-input');
    if (placePickerInput && placePickerInput.value) {
        placePickerInput.value = '';
    }
}

async function fetchWeatherData(lat, lng) {
    const apiKey = "API_KEY";
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const weatherData = await response.json();
        updateWeatherDisplay(weatherData);
    } catch (error) {
        console.error("Error fetching weather data:", error.message);
    }
}

function updateWeatherDisplay(weatherData) {
    const {temp, feels_like, humidity} = weatherData.main;
    const {description, icon} = weatherData.weather[0];
    const windSpeed = (weatherData.wind.speed * 3.6).toFixed(1);

    document.getElementById('weather-condition').innerText = description;
    document.getElementById('temperature').innerHTML = `Temperature: <span>${temp}°C</span>`;
    document.getElementById('feels-like').innerHTML = `Feels like: <span>${feels_like}°C</span>`;
    document.getElementById('humidity').innerHTML = `Humidity: <span>${humidity}%</span>`;
    document.getElementById('wind-speed').innerHTML = `Wind speed: <span>${windSpeed} km/h</span>`;
    document.getElementById('weather-icon').src = `https://openweathermap.org/img/wn/${icon}@2x.png`;
    document.getElementById('weather-icon').alt = description;
}

function setupPlaceOverviewButtons() {
    const directionButton = document.getElementById('direction-button');
    const exitButton = document.getElementById('exit-button');

    if (directionButton) {
        directionButton.addEventListener('click', showDirections);
    }

    if (exitButton) {
        exitButton.addEventListener('click', closeDirectionsOverview);
    }
}

function setupMenuControls() {
    const sidePanel = document.getElementById("side-panel");
    const sidePanelCloseButton = document.getElementById("side-panel-close-button");
    const sidePanelOpenButton = document.getElementById("side-panel-open-button");

    sidePanelCloseButton.addEventListener("click", () => {
        sidePanel.classList.remove("open");
        setTimeout(() => {
            sidePanelOpenButton.style.display = 'block';
        }, 250);
    });

    sidePanelOpenButton.addEventListener("click", () => {
        sidePanel.classList.add("open");
        sidePanelOpenButton.style.display = "none";
    });
}

function showDirections() {
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

function closeDirectionsOverview() {
    resetPlacePicker();
    fetchWeatherData(userLocation.lat, userLocation.lng);
}

async function toggleComfortOverlay() {
    if (overlayVisible) {
        // If the overlay is visible, remove it
        map.innerMap.data.forEach(feature => {
            map.innerMap.data.remove(feature);
        });
        overlayVisible = false; // Update the state to indicate overlay is not visible
    } else {
        // If the overlay is not visible, add it
        await addComfortOverlay();
        overlayVisible = true; // Update the state to indicate overlay is visible
    }
}

async function addComfortOverlay() {
    try {
        const geojsonFile = "../data/filtered_cluj_polygons.geojson";
        const response = await fetch(geojsonFile);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        let geojsonData = await response.json();

        geojsonData.features = geojsonData.features.map(feature => {
            try {
                const bufferDistance = 0.0075;
                let bufferedFeature = turf.buffer(feature, bufferDistance, {units: 'kilometers'});

                const tolerance = 0.000000000000001;
                bufferedFeature = turf.simplify(bufferedFeature, {tolerance, highQuality: true});

                return bufferedFeature;
            } catch (error) {
                console.error("Error buffering or simplifying feature:", feature, error);
                return feature;
            }
        });

        map.innerMap.data.addGeoJson(geojsonData);

        map.innerMap.data.setStyle(feature => {
            const geometry = feature.getGeometry();
            if (!geometry) {
                console.error("Feature missing geometry:", feature);
                return {
                    visible: false
                };
            }

            const geometryType = geometry.getType();
            if (geometryType !== "Polygon" && geometryType !== "MultiPolygon") {
                console.error("Unexpected geometry type:", geometryType);
                return {
                    visible: false
                };
            }

            let coordinates;
            if (geometryType === "Polygon") {
                coordinates = geometry.getAt(0).getArray();
            } else if (geometryType === "MultiPolygon") {
                coordinates = geometry.getAt(0).getAt(0).getArray();
            }

            if (!Array.isArray(coordinates) || coordinates.length === 0) {
                console.error("Invalid or missing coordinates for feature:", feature);
                return {
                    visible: false
                };
            }

            const formattedCoordinates = coordinates.map(vertex => {
                if (Array.isArray(vertex) && vertex.length >= 2) {
                    return [vertex[0], vertex[1]];
                } else if (vertex.lat && vertex.lng) {
                    return [vertex.lng(), vertex.lat()];
                } else {
                    console.error("Invalid vertex format:", vertex);
                    return null;
                }
            }).filter(vertex => vertex !== null);

            if (formattedCoordinates.length === 0) {
                console.error("Formatted coordinates are empty or invalid:", formattedCoordinates);
                return {
                    visible: false
                };
            }

            const comfortLevel = calculateComfortLevel(formattedCoordinates);
            const fillColor = getComfortColor(comfortLevel);
            return {
                fillColor: fillColor,
                strokeColor: 'black',
                strokeWeight: 0,
                fillOpacity: 0.4,
            };
        });

    } catch (error) {
        console.error("Error fetching or processing GeoJSON data:", error);
    }
}

function calculateComfortLevel(coordinates) {
    if (!areCoordinatesEqual(coordinates[0], coordinates[coordinates.length - 1])) {
        coordinates.push(coordinates[0]);
    }

    try {
        const turfPolygon = turf.polygon([coordinates]);
        const area = turf.area(turfPolygon);

        return Math.min(area / 50000, 1); // Normalize comfort level between 0 and 1
    } catch (error) {
        console.error("Error creating Turf polygon:", error);
        return 0;
    }
}

function areCoordinatesEqual(coord1, coord2) {
    if (!coord1 || !coord2 || coord1.length < 2 || coord2.length < 2) {
        return false;
    }
    return coord1[0] === coord2[0] && coord1[1] === coord2[1];
}

function getComfortColor(comfortLevel) {
    let fillColor;

    if (comfortLevel > 0.9) {
        fillColor = 'rgba(25,161,25,0.84)'; // Dark green
    } else if (comfortLevel > 0.8) {
        fillColor = 'rgba(64,200,64,0.92)'; // Forest green
    } else if (comfortLevel > 0.7) {
        fillColor = '#59bc59'; // Standard green
    } else if (comfortLevel > 0.6) {
        fillColor = '#4baa54'; // Sea green
    } else if (comfortLevel > 0.5) {
        fillColor = '#44bc51'; // Medium sea green
    } else if (comfortLevel > 0.4) {
        fillColor = '#5fbf67'; // Light green
    } else if (comfortLevel > 0.3) {
        fillColor = '#8ae15d'; // Light green
    } else if (comfortLevel > 0.2) {
        fillColor = '#aaec67'; // Pale green
    } else if (comfortLevel > 0.1) {
        fillColor = '#c9e66f'; // Light mint green
    } else {
        fillColor = '#c5e37c'; // Very light green
    }

    return fillColor;
}

function setupTouristDropdown() {
    const touristRouteButton = document.getElementById("tourist-button");
    const dropdownMenu = document.createElement("div");
    dropdownMenu.id = "dropdown-menu";
    dropdownMenu.classList.add("dropdown-menu");

    // Keep track of dropdown visibility state
    let isDropdownVisible = false;
    let markers = [];

    categories.forEach((category) => {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = category;
        label.classList.add("dropdown-label");
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(category.charAt(0).toUpperCase() + category.slice(1)));
        dropdownMenu.appendChild(label);
        dropdownMenu.appendChild(document.createElement("br"));

        // Add event listener for checkbox change
        checkbox.addEventListener("change", async () => {
            if (checkbox.checked) {
                // Fetch locations from JSON and add markers for the selected category
                const locations = await fetchTouristData(category);
                addMarkers(category, locations);
            } else {
                // Remove markers for the unchecked category
                removeMarkers(category);
            }
        });
    });

    // Append the dropdown menu to the button container
    touristRouteButton.parentNode.appendChild(dropdownMenu);

    // Toggle dropdown menu visibility on button click
    touristRouteButton.addEventListener("click", (event) => {
        event.stopPropagation(); // Prevent the click from propagating to the document
        const rect = touristRouteButton.getBoundingClientRect();
        dropdownMenu.style.top = `${rect.bottom + window.scrollY}px`;
        dropdownMenu.style.left = `${rect.left + window.scrollX}px`;

        if (!isDropdownVisible) {
            dropdownMenu.classList.add("show");
            isDropdownVisible = true;
        } else {
            dropdownMenu.classList.remove("show");
            isDropdownVisible = false;
        }
    });

    // Optionally, hide the dropdown if clicking outside of it
    document.addEventListener("click", (event) => {
        if (event.target !== touristRouteButton && !dropdownMenu.contains(event.target)) {
            dropdownMenu.classList.remove("show");
            isDropdownVisible = false;
        }
    });

    // Fetch tourist data from JSON
    async function fetchTouristData(category) {
        try {
            const response = await fetch('../data/tourist_data.json');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            return data.filter(item => item.category === category);
        } catch (error) {
            console.error('Error fetching tourist data:', error);
            return [];
        }
    }

    function getCategoryIcon(category) {
        switch (category) {
            case 'landmark':
                return '../icons/landmark.png';
            case 'museum':
                return '../icons/museum.png';
            case 'caffe':
                return '../icons/coffee.png';
            case 'restaurant':
                return '../icons/restaurant.png';
            case 'entertainment':
                return '../icons/entertainment.png';
        }
    }

    function addMarkers(category, locations) {
        const iconUrl = getCategoryIcon(category);
        locations.forEach(location => {
            const marker = new google.maps.Marker({
                position: { lat: location.latitude, lng: location.longitude },
                map: map.innerMap,
                title: location.name,
                category: location.category,
                icon: {
                    url: iconUrl,
                    scaledSize: new google.maps.Size(25, 25), // Set custom icon size to be very small (e.g., 16x16 pixels)
                    origin: new google.maps.Point(0, 0),     // Origin point of the image
                    anchor: new google.maps.Point(8, 8)      // Anchor point of the image (adjusts how it's centered on the map)
                }
            });
            markers.push(marker);
        });
    }

    function removeMarkers(category) {
        markers = markers.filter(marker => {
            if (marker.category === category) {
                marker.setMap(null);
                return false;
            }
            return true;
        });
    }
}

document.addEventListener('DOMContentLoaded', init);
