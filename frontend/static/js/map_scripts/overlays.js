import {activeTouristCategories, markers, removeMarkers, setupTouristPopup} from "./tourist.js";
import {map, googleMap, initGooglePlacePicker} from "./map.js";
import {
    deactivateTouristButton,
    resetButtonStyle
} from "./menu.js";

export let activeLayer = [null, null];
export let circleLayers = [];
export let gmpxActive = true;

export function setupOverlays() {
    document.querySelectorAll('.overlay-option').forEach(button => {
        button.addEventListener('click', () => {
            const category = button.getAttribute('data-category');
            handleOverlayButton(button);

            if (activeLayer[0] === button) {
                clearAllOverlays();
                activeLayer = [null, null];
                return;
            }

            clearAllOverlays();

            switch (category) {
                case 'thermal-comfort-o':
                    toggleRasterOverlay(button, "thermal_comfort", getCurrentSeasonAndTime());
                    break;
                case 'clean-air-o':
                    toggleOverlay(button, "../data/air_quality.geojson", "air_quality");
                    break;
                case 'nature-path-o':
                    toggleOverlay(button, "../data/filtered_cluj_polygons.geojson", "green");
                    break;
                case 'accessible-o':
                    toggleRasterOverlay(button, "accessibility");
                    break;
                case 'safety-trail-o':
                    toggleOverlay(button, "../data/road_crash_density.geojson", "safety");
                    break;
                case 'discover-explore-o':
                    toggleOverlay(button, "../data/tourist_data.json", "tourist");
                    break;
                case 'reports-o':
                    toggleOverlay(button, "../data/reports.geojson", "reports");
                    break;
                default:
                    console.warn("Unknown category: " + category);
            }
        });
    });
}

export async function toggleOverlay(button, filepath, layerName) {
    await addOverlayLayer(button, filepath, layerName);
}
function toggleRasterOverlay(button, type, season = "none") {
    const googleMapsContainer = document.getElementById("google-maps-container");

    if (gmpxActive) {
        map.style.display = "none";
        googleMapsContainer.style.display = "block";
        gmpxActive = false;
    }

    if (!googleMap) {
        googleMap = new google.maps.Map(googleMapsContainer, {
            center: { lat: 46.770439, lng: 23.591423 },
            zoom: 15,
            disableDefaultUI: true,
            mapId: "563dd7b6a140b929",
            gestureHandling: "greedy",
            styles: []
        });

        initGooglePlacePicker();
    }

    const tileLayer = new google.maps.ImageMapType({
        getTileUrl: function (coord, zoom) {
            let y_flipped = (1 << zoom) - coord.y - 1;
            return `http://127.0.0.1:5000/tiles/${type}/${season}/${zoom}/${coord.x}/${y_flipped}.png`;
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: 0.6
    });

    googleMap.overlayMapTypes.push(tileLayer);
    activeLayer = [button, tileLayer];
}

export function handleOverlayButton(button) {
    if (activeLayer[0] !== null && activeLayer[0] !== button) {
        resetButtonStyle(activeLayer[0]);
    }

    if (activeLayer[0] === button) {
        resetButtonStyle(button);
    } else {
        button.classList.remove("bg-white");
        button.classList.add("bg-[#A5B68D]");
        button.classList.remove("text-gray-700");
        button.classList.add("text-white");
        button.classList.add("shadow-lg");
        button.classList.add("scale-105");
    }
}

async function addOverlayLayer(button, filepath, layerName) {
    try {
        if(layerName === "tourist"){
            activeLayer[0] = button;
            setupTouristPopup();
            return;
        }
        const response = await fetch(filepath);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        let geojsonData = await response.json();

        const dataLayer = new google.maps.Data();
        dataLayer.addGeoJson(geojsonData);

        dataLayer.setStyle(feature => {
            const geometry = feature.getGeometry();
            if (!geometry) {
                console.error("Feature missing geometry:", feature);
                return { visible: false };
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
                        center: { lat: coords.lat(), lng: coords.lng() },
                        radius: circleRadius,
                        clickable: false
                    });
                    circleLayers.push(circle);
                    return { visible: false };
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
                        center: { lat: coords.lat(), lng: coords.lng() },
                        radius: 125,
                        clickable: false
                    });

                    circleLayers.push(circle);
                    return { visible: false };
                }
            } else if (geometryType !== "Polygon" && geometryType !== "MultiPolygon") {
                console.error("Unexpected geometry type:", geometryType);
                return { visible: false };
            }

            if (layerName === "green") {
                if (!geojsonData.processed) {

                    geojsonData.features = geojsonData.features
                        .filter(feature => {
                            return feature.geometry && feature.geometry.type;
                        })
                        .map(feature => {
                            try {
                                const bufferDistance = 5;

                                let bufferedFeature = turf.buffer(feature, bufferDistance, { units: 'meters', steps: 10 });

                                const tolerance = 0.000000000001;
                                return turf.simplify(bufferedFeature, { tolerance, highQuality: false });

                            } catch (error) {
                                console.error("Error buffering feature:", feature, error);
                                return feature;
                            }
                        });

                    geojsonData.processed = true;
                }

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
        activeLayer = [button, dataLayer];

        console.log(`Overlay added: ${layerName}`);
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

export function clearAllOverlays() {
    if(activeLayer[0] && activeLayer[0] !== document.querySelector('[data-category="discover-explore-o"]')) {
        if (googleMap && googleMap.overlayMapTypes.getArray().includes(activeLayer[1])) {
            googleMap.overlayMapTypes.removeAt(0);
        } else
            activeLayer[1].setMap(null);
    }
    else{
        clearTouristOverlay();
    }

    circleLayers.forEach(circle => circle.setMap(null));
    circleLayers = [];

    const googleMapsContainer = document.getElementById("google-maps-container");

    if (!gmpxActive) {
        googleMapsContainer.style.display = "none";
        map.style.display = "block";
        gmpxActive = true;
    }
}

export function clearTouristOverlay(){
    const touristPopup = document.getElementById("touristPopup");

    if (touristPopup) {
        activeTouristCategories.forEach(category => {
            removeMarkers(category, markers);
        });
        activeTouristCategories.clear();
        document.querySelectorAll(".chip").forEach(chip => {
            chip.classList.remove("bg-[#A5B68D]", "text-white");
            chip.classList.add("bg-white", "text-gray-700");
        });
    }
    deactivateTouristButton();
}

function getCurrentSeasonAndTime() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const hour = now.getHours();
    let season, timeSlot;

    if ([12, 1, 2].includes(month)) {
        season = "win";
        if (hour >= 9 && hour < 12) timeSlot = "09";
        else if (hour >= 12 && hour < 15) timeSlot = "12";
        else timeSlot = "15";
    }
    else if ([3, 4, 5].includes(month)) {
        season = "spr";
        if (hour >= 8 && hour < 12) timeSlot = "08";
        else if (hour >= 12 && hour < 16) timeSlot = "12";
        else timeSlot = "16";
    }
    else if ([6, 7, 8].includes(month)) {
        season = "sum";
        if (hour >= 7 && hour < 13) timeSlot = "07";
        else if (hour >= 13 && hour < 17) timeSlot = "13";
        else timeSlot = "17";
    }
    else {
        season = "fall";
        if (hour >= 8 && hour < 12) timeSlot = "08";
        else if (hour >= 12 && hour < 16) timeSlot = "12";
        else timeSlot = "16";
    }

    return `${season}_${timeSlot}`;
}