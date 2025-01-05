let userLocation;
let destination;
let directionsService;
let directionsRenderer;
let map;
let geocoder;
let overview;
let marker;
let routeLayer=null;
let dataLayer;

const categories = ["landmark", "museum", "caffe", "restaurant", "entertainment"];
const legends = {
    comfort: [
        {color: 'rgba(25,161,25,0.84)', label: 'High Comfort'},
        {color: 'rgba(95,191,103,0.8)', label: 'Medium Comfort'},
        {color: 'rgba(197,227,124,0.8)', label: 'Low Comfort'},
    ],
    air_quality: [
        {color: 'rgba(0,255,0,0.7)', label: 'Clean air'},
        {color: 'rgba(255,213,0,0.7)', label: 'Moderately polluted air'},
        {color: 'rgba(236,131,45,0.7)', label: 'Polluted air'},
        {color: 'rgba(255,47,0,0.7)', label: 'Heavily polluted air'},
    ],
    safety: [
        {color: 'rgba(0,128,0,0.7)', label: 'Low'},
        {color: 'rgba(255,165,0,0.7)', label: 'Medium'},
        {color: 'rgba(255,0,0,0.7)', label: 'High'},
    ],
    accessibility: [
        {color: 'rgba(96,145,225,0.4)', label: 'Accessible Area'},
        {color: 'rgba(214,85,85,0.4)', label: 'Inaccessible Area'},
    ],
    inaccessibility: [
        {color: 'rgba(96,145,225,0.4)', label: 'Accessible Area'},
        {color: 'rgba(214,85,85,0.4)', label: 'Inaccessible Area'},
    ],
    tourist: [
        {icon: '../icons/landmark.png', label: 'Landmark'},
        {icon: '../icons/museum.png', label: 'Museum'},
        {icon: '../icons/coffee.png', label: 'Café'},
        {icon: '../icons/restaurant.png', label: 'Restaurant'},
        {icon: '../icons/entertainment.png', label: 'Entertainment'},
    ],
};

let overlayLayers = {};
let circleLayers = {};

const thermalComfortCheckbox = document.getElementById('thermalComfort');
const airQualityCheckbox = document.getElementById('airQuality');
const greenAreasCheckbox = document.getElementById('greenAreas');
const safetyCheckbox = document.getElementById('safety');
const accessibilityCheckbox = document.getElementById('accessibility');

const checkBoxes = [
    thermalComfortCheckbox,
    airQualityCheckbox,
    greenAreasCheckbox,
    safetyCheckbox,
    accessibilityCheckbox,
];


const checkboxStates = {
    thermalComfort: false,
    airQuality: false,
    greenAreas: false,
    safety: false,
    accessibility: false,
};

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
        toggleOverlay("../data/filtered_cluj_polygons.geojson", "comfort")
    });

    document.getElementById('air-quality-button').addEventListener('click', () =>
        toggleOverlay("../data/air_quality.geojson", "air_quality")
    )

    document.getElementById('green-button').addEventListener('click', () => {
        toggleOverlay("../data/filtered_cluj_polygons.geojson", "green")
    })

    document.getElementById('accessibility-button').addEventListener('click', () => {
        toggleOverlay("../data/zone_accesibile_reprojected.geojson", "accessibility")
        toggleOverlay("../data/zone_neaccesibile_reprojected.geojson", "inaccessibility");
    })

    document.getElementById('safety-button').addEventListener('click', () =>
        toggleOverlay("../data/road_crash_density.geojson", "safety")
    )

    document.getElementById("tourist-button").addEventListener('click', () => {
        fetch("http://127.0.0.1:5501/get_tourist_path", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ userLocation, destination })
            })
            .then(response => response.json())
            .then(data => {
                console.log("Tourist path:", data);
                if (routeLayer) {
                    routeLayer.setMap(null);
                }
                routeLayer = new google.maps.Data();
                routeLayer.addGeoJson(data);
                routeLayer.setStyle(function(feature) {
                    return {
                        strokeColor:"#e5e36a", //#028a0f
                        strokeWeight: 4
                    };
                });
                routeLayer.setMap(map.innerMap);
        })  
    }  
    )

    // Add event listeners for all checkboxes
    Object.keys(checkboxStates).forEach(id => {
        const checkbox = document.getElementById(id);
        checkbox.addEventListener('change', () => {
            checkboxStates[id] = checkbox.checked; // Update state
            evaluateCombination(); // Check combinations
        });
    });

    document.getElementById('report-button').addEventListener('click', () => {
        fetchReports();
    });
}

function setupMap() {
    marker = new google.maps.Marker({
        map: map.innerMap,
        title: location.name,
        category: location.category,
        icon: {
            url: "../icons/point.png",
            scaledSize: new google.maps.Size(40, 40),
        }
        });

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

                new google.maps.Marker({
                    position: userLocation,
                    map: map.innerMap,
                    title: "You are here",
                    icon: {
                        url: "../icons/compass_12527012.png",
                        scaledSize: new google.maps.Size(25, 25),
                        origin: new google.maps.Point(0, 0),
                        anchor: new google.maps.Point(20, 20),
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
        if(routeLayer)
        {
            routeLayer.setMap(null);
        }

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

        checkBoxes.forEach((checkbox) => {
            checkbox.addEventListener("change", () => {
                evaluateCombination(); // Call the function to update the route
            });
        });
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
    map.innerMap.setCenter({lat: userLocation.lat, lng: userLocation.lng});
    map.innerMap.setZoom(15);
    directionsRenderer.setDirections({routes: []});

    const placePickerInput = document.querySelector('gmpx-place-picker').shadowRoot.querySelector('.pac-target-input');
    if (placePickerInput && placePickerInput.value) {
        placePickerInput.value = '';
    }
}

async function fetchWeatherData(lat, lng) {
    const apiKey = "a9decdfd687ef46c99db100348758882";
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
    const reportButton = document.getElementById('report-picker-button');

    if (directionButton) {
        directionButton.addEventListener('click', showDirections);
    }

    if (exitButton) {
        exitButton.addEventListener('click', closeDirectionsOverview);
    }

    if(reportButton){
        reportButton.addEventListener('click', showHazardReportForm);
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

    document.getElementById('criteria-close-button').addEventListener('click', () => {
        const content = document.getElementById('criteria-content');
        const toggleButton = document.getElementById('criteria-close-button');

        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            toggleButton.textContent = '-';
        } else {
            content.classList.add('hidden');
            toggleButton.textContent = '+';
        }
    });

    document.getElementById('weather-close-button').addEventListener('click', () => {
        const content = document.getElementById('weather-details');
        const toggleButton = document.getElementById('weather-close-button');

        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            toggleButton.textContent = '-';
        } else {
            content.classList.add('hidden');
            toggleButton.textContent = '+';
        }
    });

    sidePanelOpenButton.addEventListener("click", () => {
        sidePanel.classList.add("open");
        sidePanelOpenButton.style.display = "none";
    });

    document.getElementById("modal-close-button").addEventListener("click", () => {
        document.getElementById("hazard-modal").classList.add("hidden");

        if (window.currentHazardMarker) {
            window.currentHazardMarker.setMap(null);
            window.currentHazardMarker = null;
        }

        window.currentHazardLocation = null;
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

function showHazardReportForm() {
    const placeOverview = document.getElementById('place-overview');
    const currentPlace = placeOverview.place;

    // Ensure a valid place is selected
    if (!currentPlace || !currentPlace.geometry || !currentPlace.geometry.location) {
        alert("No place selected to report a hazard.");
        return;
    }

    // Store the selected location globally
    const location = {
        lat: currentPlace.geometry.location.lat(),
        lng: currentPlace.geometry.location.lng(),
    };
    window.currentHazardLocation = location;

    // Show the hazard modal
    const modal = document.getElementById('hazard-modal');
    modal.classList.remove('hidden');

    // Set up the hazard form listeners
    setupHazardFormListeners();
}

// Setup listeners for the form inputs and file uploads
function setupHazardFormListeners() {
    const uploadedPhotosContainer = document.getElementById("uploaded-photos-container");
    const hazardImageInput = document.getElementById("hazard-image");
    const form = document.getElementById("hazard-form");
    const maxPhotos = 3;
    let selectedPhotos = []; // Store the selected photos

    // Add event listener for photo uploads
    hazardImageInput.addEventListener("change", function () {
        const files = Array.from(this.files);

        if (selectedPhotos.length + files.length > maxPhotos) {
            showCustomAlert("You can only upload up to 3 photos.");
            return;
        }

        // Add valid files to the selectedPhotos array and display them
        files.forEach((file) => {
            if (selectedPhotos.length < maxPhotos) {
                selectedPhotos.push(file);
                displayPhoto(file);
            }
        });

        // Clear the file input to allow re-selection of the same file
        hazardImageInput.value = "";
        checkFormValidity();
    });

    // Display the photo previews with remove functionality
    function displayPhoto(file) {
        const photoContainer = document.createElement("div");
        photoContainer.classList.add("uploaded-photo");

        const photo = document.createElement("img");
        photo.src = URL.createObjectURL(file);

        const removeButton = document.createElement("button");
        removeButton.classList.add("remove-photo");
        removeButton.innerHTML = "×";

        // Remove photo when the "X" button is clicked
        removeButton.addEventListener("click", () => {
            const index = selectedPhotos.indexOf(file);
            if (index > -1) {
                selectedPhotos.splice(index, 1);
            }
            photoContainer.remove();
            checkFormValidity(); // Revalidate the form
        });

        photoContainer.appendChild(photo);
        photoContainer.appendChild(removeButton);
        uploadedPhotosContainer.appendChild(photoContainer);
    }

    document.getElementById("hazard-type").addEventListener("input", checkFormValidity);
    document.getElementById("hazard-description").addEventListener("input", checkFormValidity);

    checkFormValidity();

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        if (!checkFormValidity()) {
            alert("Please fill out all fields before submitting the form.");
            return;
        }

        const hazardType = document.getElementById("hazard-type").value;
        const description = document.getElementById("hazard-description").value;

        const hazardData = {
            latitude: destination.lat,
            longitude: destination.lng,
            type: hazardType,
            description: description,
            photos: []
        };


        const photosToProcess = selectedPhotos.length; // Total number of photos to process
        let processedPhotos = 0; // Counter to track processed photos
        // Convert selected photos into binary data
        selectedPhotos.forEach((file) => {
            const reader = new FileReader();
        
            reader.onload = (event) => {
                // Convert ArrayBuffer to byte array
                const arrayBuffer = event.target.result;
                const byteArray = Array.from(new Uint8Array(arrayBuffer));
                
                // Add the byte array to hazardData.photos
                hazardData.photos.push(byteArray);
                processedPhotos++;
        
                console.log(`Uploaded ${processedPhotos}/${photosToProcess} photos`);
        
                // Check if all photos have been processed
                if (processedPhotos === photosToProcess) {
                    console.log("All photos uploaded, sending data:", hazardData);
        
                    // Send data to the backend
                    fetch('http://127.0.0.1:5501/load_new_report', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(hazardData),
                    })
                        .then((response) => response.json())
                        .then((data) => {
                            console.log('Report submitted successfully:', data);
                        })
                        .catch((error) => {
                            console.error('Error submitting report:', error);
                        });
                }
            };
        
            reader.onerror = (error) => {
                console.error("Error reading photo:", error);
            };
        
            reader.readAsArrayBuffer(file); // Read the file as an ArrayBuffer
        });

        fetch('http://127.0.0.1:5501/load_new_report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(hazardData), // Convert hazardData to JSON
        })
            .then((response) => response.json())
            .then((data) => {
                console.log('Report submitted successfully:', data);
            })
            .catch((error) => {
                console.error('Error submitting report:', error);
            });

        console.log("Hazard Report Submitted:", hazardData);

        selectedPhotos = [];
        uploadedPhotosContainer.innerHTML = "";
        form.reset();
        document.getElementById("hazard-modal").classList.add("hidden");

        showCustomAlert("Hazard report submitted successfully.");
    });
}

function checkFormValidity() {
    const hazardType = document.getElementById("hazard-type").value;
    const description = document.getElementById("hazard-description").value.trim();

    const isValid = hazardType !== "" && description !== "";
    const submitButton = document.getElementById("submit-button");
    submitButton.disabled = !isValid;

    return isValid;
}

function showCustomAlert(message) {
    const alertModal = document.getElementById("custom-alert");
    alertModal.querySelector(".alert-message").innerText = message;
    alertModal.classList.remove("hidden");

    document.getElementById("alert-close-button").addEventListener("click", hideCustomAlert);
    document.getElementById("alert-ok-button").addEventListener("click", hideCustomAlert);
}

function hideCustomAlert() {
    const alertModal = document.getElementById("custom-alert");
    alertModal.classList.add("hidden");
}

function closeDirectionsOverview() {
    resetPlacePicker();
    fetchWeatherData(userLocation.lat, userLocation.lng);
}

async function toggleOverlay(filepath, layerName) {
    if (overlayLayers[layerName]) {
        overlayLayers[layerName].setMap(null);
        delete overlayLayers[layerName];
        if (circleLayers[layerName]) {
            circleLayers[layerName].forEach(circle => circle.setMap(null));
            delete circleLayers[layerName];
        }
        updateLegend(layerName, false);
    } else {
        await addOverlayLayer(filepath, layerName);
        updateLegend(layerName, true);
        dataLayer.addListener("click", (event) => {
            if(routeLayer)
            {
                routeLayer.setMap(null);
            }
    
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
                        evaluateCombination();
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
}

function updateLegend(layerName, isVisible) {
    const legend = document.getElementById('map-legend');
    const legendItems = document.getElementById('legend-items');

    if (isVisible) {
        legendItems.innerHTML = legends[layerName]
            .map(item => {
                if (item.color) {
                    return `
                        <li>
                            <span class="legend-color" style="background-color: ${item.color};"></span>
                            ${item.label}
                        </li>
                    `;
                } else if (item.icon) {
                    return `
                        <li>
                            <img class="legend-icon" src="${item.icon}" alt="${item.label}" />
                            ${item.label}
                        </li>
                    `;
                }
            })
            .join('');

        legend.classList.add('active');
    } else {
        legend.classList.remove('active');
    }
}

async function addOverlayLayer(filepath, layerName) {
    try {
        const response = await fetch(filepath);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        let geojsonData = await response.json();

        if (layerName === "comfort" || layerName === "green") {
            geojsonData.features = geojsonData.features.map(feature => {
                try {
                    const bufferDistance = 5;
                    let bufferedFeature = turf.buffer(feature, bufferDistance, {units: 'meters'});

                    const tolerance = 0.0000000000001;
                    bufferedFeature = turf.simplify(bufferedFeature, {tolerance, highQuality: true});

                    return bufferedFeature;
                } catch (error) {
                    console.error("Error buffering or simplifying feature:", feature, error);
                    return feature;
                }
            });
        }

        if (layerName === "green") {
            geojsonData.features = geojsonData.features.filter(feature => {
                const geometry = feature.geometry;
                if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
                    return false;
                }
                const coordinates = extractCoordinates(geometry, geometry.type);
                if (!coordinates) return false;

                const comfortLevel = calculateComfortLevel(coordinates);
                return comfortLevel > 0.3;
            });
        }

        const dataLayer = new google.maps.Data();
        dataLayer.addGeoJson(geojsonData);

        dataLayer.setStyle(feature => {
            const geometry = feature.getGeometry();
            if (!geometry) {
                console.error("Feature missing geometry:", feature);
                return {visible: false};
            }

            const geometryType = geometry.getType();

            if (geometryType === "Point") {
                if (layerName === "air_quality") {
                    const airQuality = feature.getProperty("AirQuality");
                    const circleColor = getAirQualityColor(airQuality);
                    const circleRadius = airQuality * 25;
                    const coords = geometry.get();
                    const circle = new google.maps.Circle({
                        strokeColor: circleColor,
                        strokeOpacity: 0,
                        strokeWeight: 0,
                        fillColor: circleColor,
                        fillOpacity: 0.4,
                        map: map.innerMap,
                        center: {lat: coords.lat(), lng: coords.lng()},
                        radius: circleRadius,
                        clickable: false
                    });
                    console.log("Circle created at: ", coords.lat(), coords.lng());

                    if (!circleLayers[layerName]) circleLayers[layerName] = [];
                    circleLayers[layerName].push(circle);
                    return {visible: false};
                } else if (layerName === "safety") {
                    const safetyLevel = feature.getProperty("grad");
                    const fillColor = getSafetyColor(safetyLevel);
                    const coords = geometry.get();
                    const circle = new google.maps.Circle({
                        strokeColor: fillColor,
                        strokeOpacity: 1,
                        strokeWeight: 1.2,
                        fillColor: fillColor,
                        fillOpacity: 0.4,
                        map: map.innerMap,
                        center: {lat: coords.lat(), lng: coords.lng()},
                        radius: 125,
                        clickable: false
                    });

                    if (!circleLayers[layerName]) circleLayers[layerName] = [];
                    circleLayers[layerName].push(circle);
                    return {visible: false};
                }
            } else if (geometryType !== "Polygon" && geometryType !== "MultiPolygon") {
                console.error("Unexpected geometry type:", geometryType);
                return {visible: false};
            }

            if (layerName === "comfort") {
                const coordinates = extractCoordinates(geometry, geometryType);
                if (!coordinates) return {visible: false};

                const comfortLevel = calculateComfortLevel(coordinates);
                const fillColor = getComfortColor(comfortLevel);
                return {
                    fillColor: fillColor,
                    strokeColor: 'black',
                    strokeWeight: 0,
                    fillOpacity: 0.4,
                    clickable: false
                };
            } else if (layerName === "accessibility" || layerName === "inaccessibility") {
                const fillColor = layerName === "accessibility" ? 'rgba(96,145,225,0.4)' : 'rgba(214,85,85,0.4)';
                return {
                    fillColor: fillColor,
                    strokeColor: 'black',
                    strokeWeight: 0.1,
                    fillOpacity: 0.4,
                    clickable: false
                };
            } else if (layerName === "green") {
                const coordinates = extractCoordinates(geometry, geometryType);
                if (!coordinates) return {visible: false};

                return {
                    fillColor: 'rgba(25,161,25,0.84)',
                    strokeColor: 'black',
                    strokeWeight: 0,
                    fillOpacity: 0.4,
                    clickable: false
                };
            }
            return {
                fillColor: 'rgba(128, 128, 128, 0.4)',
                strokeColor: 'black',
                strokeWeight: 1,
                fillOpacity: 0.4,
                clickable: false
            };
        });

        dataLayer.setMap(map.innerMap);
        overlayLayers[layerName] = dataLayer;
    } catch (error) {
        console.error(`Error loading overlay layer (${layerName}):`, error);
    }
}

function extractCoordinates(geometry, geometryType) {
    try {
        if (geometryType === "Polygon") {
            if (geometry.coordinates) {
                return geometry.coordinates[0];
            }
        } else if (geometryType === "MultiPolygon") {
            if (geometry.coordinates) {
                return geometry.coordinates[0][0];
            }
        }

        if (geometry.getType && geometry.getType() === "Polygon") {
            const path = geometry.getAt(0);
            const coordinates = [];
            for (let i = 0; i < path.getLength(); i++) {
                const latLng = path.getAt(i);
                coordinates.push([latLng.lng(), latLng.lat()]);
            }
            return coordinates;
        } else if (geometry.getType && geometry.getType() === "MultiPolygon") {
            console.error("MultiPolygon extraction is not implemented for Google Maps geometries.");
            return null;
        }

        console.error("Unsupported geometry type:", geometryType);
        return null;
    } catch (error) {
        console.error("Error extracting coordinates:", error);
        return null;
    }
}

function calculateComfortLevel(coordinates) {
    if (!areCoordinatesEqual(coordinates[0], coordinates[coordinates.length - 1])) {
        coordinates.push(coordinates[0]);
    }
    try {
        const turfPolygon = turf.polygon([coordinates]);
        const area = turf.area(turfPolygon);

        return Math.min(area / 50000, 1);
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
        fillColor = 'rgba(25,161,25,0.84)';
    } else if (comfortLevel > 0.8) {
        fillColor = 'rgba(64,200,64,0.92)';
    } else if (comfortLevel > 0.7) {
        fillColor = '#59bc59';
    } else if (comfortLevel > 0.6) {
        fillColor = '#4baa54';
    } else if (comfortLevel > 0.5) {
        fillColor = '#44bc51';
    } else if (comfortLevel > 0.4) {
        fillColor = '#5fbf67';
    } else if (comfortLevel > 0.3) {
        fillColor = '#8ae15d';
    } else if (comfortLevel > 0.2) {
        fillColor = '#aaec67';
    } else if (comfortLevel > 0.1) {
        fillColor = '#c9e66f';
    } else {
        fillColor = '#c5e37c';
    }

    return fillColor;
}

function getAirQualityColor(airQuality) {
    if (airQuality === 1) return 'rgba(0,255,0,0.8)'; //Clean air
    if (airQuality === 2) return 'rgba(255,213,0,0.8)'; //Moderately polluted air
    if (airQuality === 3) return 'rgba(236,131,45,0.8)'; //Polluted air
    if (airQuality === 4) return 'rgba(255,47,0,0.8)'; //Very polluted air
    return 'rgba(128,128,128,0.6)';
}

function getSafetyColor(safetyLevel) {
    if (safetyLevel === 1) return 'rgba(0,128,0,0.7)';
    if (safetyLevel === 2) return 'rgba(255,165,0,0.7)';
    if (safetyLevel === 3) return 'rgba(255,0,0,0.7)';
    return 'rgba(128,128,128,0.5)';
}

function setupTouristDropdown() {
    const touristRouteButton = document.getElementById("tourist-button");
    const dropdownMenu = document.createElement("div");
    dropdownMenu.id = "dropdown-menu";
    dropdownMenu.classList.add("dropdown-menu");

    let isDropdownVisible = false;
    let markers = [];
    let touristLayerVisible = false;

    categories.forEach((category) => {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = category;
        label.classList.add("dropdown-label");
        label.appendChild(checkbox);
        label.appendChild(
            document.createTextNode(category.charAt(0).toUpperCase() + category.slice(1))
        );
        dropdownMenu.appendChild(label);
        dropdownMenu.appendChild(document.createElement("br"));

        checkbox.addEventListener("change", async () => {
            if (checkbox.checked) {
                const locations = await fetchTouristData(category);
                addMarkers(category, locations);

                touristLayerVisible = true;
                updateLegend("tourist", true);
            } else {
                removeMarkers(category);

                markers = markers.filter(marker => marker.category !== category);
                if (markers.length === 0) {
                    touristLayerVisible = false;
                    updateLegend("tourist", false);
                }
            }
        });
    });

    touristRouteButton.parentNode.appendChild(dropdownMenu);

    touristRouteButton.addEventListener("click", (event) => {
        event.stopPropagation();
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

    document.addEventListener("click", (event) => {
        if (event.target !== touristRouteButton && !dropdownMenu.contains(event.target)) {
            dropdownMenu.classList.remove("show");
            isDropdownVisible = false;
        }
    });

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

    function addMarkers(category, locations) {
        const iconUrl = getCategoryIcon(category);
        const infoWindow = new google.maps.InfoWindow();

        locations.forEach(location => {
            const marker = new google.maps.Marker({
                position: {lat: location.latitude, lng: location.longitude},
                map: map.innerMap,
                title: location.name,
                category: location.category,
                icon: {
                    url: iconUrl,
                    scaledSize: new google.maps.Size(25, 25),
                }
            });

            marker.addListener("click", (event) => {
                destination = {
                    lat: event.latLng.lat(),
                    lng: event.latLng.lng(),
                };

                geocoder.geocode({location: destination}, (results, status) => {
                    if (status === google.maps.GeocoderStatus.OK && results[0]) {
                        overview.place = results[0];
                        overview.description = results[0].description;
                    } else {
                        console.error("Geocoder failed:", status);
                    }

                    marker.setPosition(destination);
                    map.innerMap.setCenter(destination);
                    map.innerMap.setZoom(15);
                });

                infoWindow.setContent(`
                <div class="info-window" style="padding: 0.5rem;">
                    <h3 style="width: 100%; font-size: 1em; margin-bottom: 0.3rem;">${location.name}</h3>
                    <p style="margin: 0; font-size: 0.9em;">
                        <b>Category:</b> ${location.category.charAt(0).toUpperCase() + location.category.slice(1)}
                    </p>
                </div>
            `);
                infoWindow.open(map.innerMap, marker);

                const closeButton = document.getElementById("exit-button");
                if (closeButton) {
                    closeButton.addEventListener("click", () => {
                        infoWindow.close();
                    });
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
}

async function fetchReports()
{
    try {
        const response = await fetch('http://127.0.0.1:5501/get_all_reports');
        const reports = await response.json();
        // Pass the reports data to a function that displays them on the map
        displayReportsOnMap(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
    }
}

async function displayReportsOnMap(reports)
{
        reports.forEach((report) => {
            console.log(report);
            // Add a marker for each report
            let icon_id;
            if(report.type==='pothole') icon_id=1;
            else if(report.type==='construction') icon_id=2;
            else if(report.type==='sidewalk') icon_id=3;
            else icon_id=4;
            console.log(`icon id: ${icon_id}`);
            const icon = {
                url: `http://127.0.0.1:5501/image/${icon_id}`, // URL of the custom icon -> see backend function
                scaledSize: new google.maps.Size(40, 60), // Specify the size (width, height)
              };

            const marker = new google.maps.Marker({
                position: { lat: report.latitude, lng: report.longitude }, // Replace with your location data
                map: map.innerMap,
                title: report.type,
                icon: icon
            });

            // Parse the created_at timestamp and reformat it
            const formatDate = (isoString) => {
                const date = new Date(isoString);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
                const year = date.getFullYear();
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                return `${day}-${month}-${year}, ${hours}:${minutes}:${seconds}`;
            };
            // Create an info window for the marker
            const infoWindowContent = `
                <div>
                    <h3>${report.type}</h3>
                    <p>${report.description}</p>
                    ${report.photos.map(photo => `<img src="data:image/jpeg;base64,${photo}" width="100">`).join('')}
                    <p style="color: green;">Reported on: ${formatDate(report.created_at)}</p>
                </div>
            `;
            const infoWindow = new google.maps.InfoWindow({
                content: infoWindowContent
            });

            // Show info window on marker click
            marker.addListener('click', () => {
                infoWindow.open(map, marker);
            });
        });
}

function handleOneCheckbox()
{
    if (thermalComfortCheckbox.checked) {
        console.log('Thermal Comfort is selected');
        handleThermalComfort();
    } else {
         console.log('Thermal Comfort is deselected');
        }

        if (airQualityCheckbox.checked) {
            console.log('Air Quality is selected');
            handleAirQuality();
        } else {
            console.log('Air Quality is deselected');
        }

        if (safetyCheckbox.checked) {
            console.log('Safety is selected');
            handleSafety();
        } else {
            console.log('Safety is deselected');
        }
        if (accessibilityCheckbox.checked) {
            console.log('Accessibility is selected');
            handleAccessibility();
        } else {
            console.log('Accessibility is deselected');
        }

        if (greenAreasCheckbox.checked) {
            console.log('Green Areas is selected');
            handleGreenAreas();
        } else {
            console.log('Green Areas is deselected');
        }
}

function handleSafety()
{
    fetch("http://127.0.0.1:5501/get_safest_path", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ userLocation, destination })
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
    })  
    if(!safetyCheckbox.checked)
    {
        routeLayer.setMap(null);
    }
}

function handleAirQuality()
{
    fetch("http://127.0.0.1:5501/get_air_quality_path", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ userLocation, destination })
        })
        .then(response => response.json())
        .then(data => {
            console.log("air quality path:", data);
            if (routeLayer) {
                routeLayer.setMap(null);
            }
            routeLayer = new google.maps.Data();
            routeLayer.addGeoJson(data);
            routeLayer.setStyle(function(feature) {
                return {
                    strokeColor:"#ed5076", 
                    strokeWeight: 4
                };
            });
            routeLayer.setMap(map.innerMap);
    })
}

function handleAccessibility()
{
    fetch("http://127.0.0.1:5501/get_accessible_path", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ userLocation, destination })
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
    }) 
}

function handleGreenAreas()
{
    fetch("http://127.0.0.1:5501/get_greenest_path", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ userLocation, destination })
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
    })  
}

function handleThermalComfort()
{
    fetch("http://127.0.0.1:5501/get_thermal_comfort_path", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ userLocation, destination })
    })
    .then(response => response.json())
    .then(data => {
        console.log("Thermal comfort:", data);
        if (routeLayer) {
            routeLayer.setMap(null);
        }
        routeLayer = new google.maps.Data();
        routeLayer.addGeoJson(data);
        routeLayer.setStyle(function(feature) {
            return {
                strokeColor:"#4f941d", 
                strokeWeight: 4
            };
        });
        routeLayer.setMap(map.innerMap);
    })  
}

// Evaluate combinations of checkboxes 
async function evaluateCombination() {
    try {
        // Gather checkbox states: 1 if checked, 0 if not
        const is_thermal_comfort=document.getElementById("thermalComfort").checked ? 1 : 0;
        const is_air_quality = document.getElementById("airQuality").checked ? 1 : 0;
        const is_green = document.getElementById("greenAreas").checked ? 1 : 0;
        const is_safe = document.getElementById("safety").checked ? 1 : 0;
        const is_accessible = document.getElementById("accessibility").checked ? 1 : 0;

        // Count the number of selected options
        const selectedCount = is_thermal_comfort + is_air_quality + is_green + is_safe + is_accessible;

        if (selectedCount === 0) {
            // Delete current route if no checkboxes are selected
            if (typeof routeLayer !== "undefined" && routeLayer) {
                routeLayer.setMap(null);
                routeLayer = undefined;
            }
            return;
        }

        if (selectedCount === 1) {
            // Determine which checkbox is selected and call the corresponding function
            if(is_thermal_comfort===1)
            {
                handleThermalComfort(); 
            }
            else if (is_air_quality === 1) {
                handleAirQuality();
            } else if (is_green === 1) {
                handleGreenAreas();
            } else if (is_safe === 1) {
                handleSafety();
            } else if (is_accessible === 1) {
                handleAccessibility();
            }
            return;
        }

        // If more than one checkbox is selected, send the payload to the backend
        const payload = {
            is_thermal_comfort:is_thermal_comfort,
            is_air_quality: is_air_quality,
            is_green: is_green,
            is_safe: is_safe,
            is_accessible: is_accessible,
            userLocation: userLocation,
            destination: destination,
        };

        console.log(`Sending payload: ${JSON.stringify(payload)}`);

        const response = await fetch("http://127.0.0.1:5501/get_combined_path", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Combined path:", data);

        if (typeof routeLayer !== "undefined" && routeLayer) {
            routeLayer.setMap(null);
        }

        routeLayer = new google.maps.Data();
        routeLayer.addGeoJson(data);
        routeLayer.setStyle(function (feature) {
            return {
                strokeColor: "#26acf4",
                strokeWeight: 4
            };
        });
        routeLayer.setMap(map.innerMap);

    } catch (error) {
        console.error("Error in evaluateCombination:", error);
    }
}

document.addEventListener('DOMContentLoaded', init);
