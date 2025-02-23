import {setupTouristPopup, removeMarkers, markers, activeTouristCategories} from "http://127.0.0.1:5501/static/js/map_scripts/tourist.js";
import {map} from "http://127.0.0.1:5501/static/js/map_scripts/map.js";


export let overlayLayers = {};
export let circleLayers = {};

export function setupOverlays(){
    document.querySelectorAll('.overlay-option').forEach(button => {
        button.addEventListener('click', () => {
            const category = button.getAttribute('data-category');

            switch (category) {
                case 'thermal-comfort-o':
                    toggleOverlay("../data/filtered_cluj_polygons.geojson", "comfort");
                    break;
                case 'clean-air-o':
                    toggleOverlay("../data/air_quality.geojson", "air_quality");
                    break;
                case 'nature-path-o':
                    toggleOverlay("../data/filtered_cluj_polygons.geojson", "green");
                    break;
                case 'accessible-o':
                    toggleOverlay("../data/zone_accesibile_reprojected.geojson", "accessibility");
                    toggleOverlay("../data/zone_neaccesibile_reprojected.geojson", "inaccessibility");
                    break;
                case 'safety-trail-o':
                    toggleOverlay("../data/road_crash_density.geojson", "safety");
                    break;
                case 'discover-explore-o':
                    setupTouristPopup("../data/tourist_data.json", "tourist");
                    break;
                case 'reports-o':
                    toggleOverlay("../data/reports.geojson", "reports");
                    break;
                default:
                    console.warn("Unknown category: " + category);
            }
        });
    });
}

export async function toggleOverlay(filepath, layerName) {
    if (overlayLayers[layerName]) {
        overlayLayers[layerName].setMap(null);
        delete overlayLayers[layerName];
        if (circleLayers[layerName]) {
            circleLayers[layerName].forEach(circle => circle.setMap(null));
            delete circleLayers[layerName];
        }
    } else {
        await addOverlayLayer(filepath, layerName);
    }
}

async function addOverlayLayer(filepath, layerName) {
    try {
        if(layerName === "tourist") {
            setupTouristPopup();
            return;
        }
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

export function clearAllOverlays() {
    Object.keys(overlayLayers).forEach(layerName => {
        overlayLayers[layerName].setMap(null);
        delete overlayLayers[layerName];

        if (circleLayers[layerName]) {
            circleLayers[layerName].forEach(circle => circle.setMap(null));
            delete circleLayers[layerName];
        }
    });

    overlayLayers = {};
    circleLayers = {};

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
}