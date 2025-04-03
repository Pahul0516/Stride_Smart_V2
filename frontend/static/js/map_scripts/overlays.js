import {setupTouristPopup, removeMarkers, markers, activeTouristCategories, bucketList} from "http://127.0.0.1:5501/static/js/map_scripts/tourist.js";
import {map,googleMap} from "http://127.0.0.1:5501/static/js/map_scripts/map.js";
import {fetchReports,clearReportsFromMap} from "http://127.0.0.1:5501/static/js/map_scripts/reports.js"
import { activeFilters } from "http://127.0.0.1:5501/static/js/map_scripts/menu.js";

export let overlayLayers = {};
export let circleLayers = {};
export let activeLayer = [null, null];
export let gmpxActive = true;
let bucketList_markers=[];

export function setupOverlays(){
    document.querySelectorAll('.overlay-option').forEach(button => {
        button.addEventListener('click', () => {
            const category = button.getAttribute('data-category');

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
                     toggleOverlay(button, "http://127.0.0.1:5501/static/data/tourist_data.json", "tourist");
                     break;
                case 'reports-o':
                    //toggleOverlay("", "reports");
                    toggleReportsOverlay();
                    //fetchReports();
                    break;
                default:
                    console.warn("Unknown category: " + category);
            }
        });
    });
    const discoverExploreButton = document.querySelector('[data-category="discover-explore-f"]');
    discoverExploreButton.addEventListener('click', () => {
        if(activeFilters.has("discover-explore-f")){
            displayBucketList(bucketList);
        }
        else
        {
            removeBucketListMarkers();
        }
    });
}

function toggleRasterOverlay(button, type, season = "none") {
    const googleMapsContainer = document.getElementById("google-maps-container");

    if (gmpxActive) {
        map.style.display = "none";
        googleMapsContainer.style.display = "block";
        gmpxActive = false;
    }

    // if (!googleMap) {
    //     googleMap = new google.maps.Map(googleMapsContainer, {
    //         center: { lat: 46.770439, lng: 23.591423 },
    //         zoom: 15,
    //         disableDefaultUI: true,
    //         mapId: "563dd7b6a140b929",
    //         gestureHandling: "greedy",
    //         styles: []
    //     });

        initGooglePlacePicker();
        //}

    const tileLayer = new google.maps.ImageMapType({
        getTileUrl: function (coord, zoom) {
            let y_flipped = (1 << zoom) - coord.y - 1;
            return `http://127.0.0.1:5001/tiles/${type}/${season}/${zoom}/${coord.x}/${y_flipped}.png`;
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: 0.6
    });

    googleMap.overlayMapTypes.push(tileLayer);
    activeLayer = [button, tileLayer];
}

// export async function toggleOverlay(filepath, layerName) {
//     if (overlayLayers[layerName]) {
//         overlayLayers[layerName].setMap(null);
//         delete overlayLayers[layerName];
//         if (circleLayers[layerName]) {
//             circleLayers[layerName].forEach(circle => circle.setMap(null));
//             delete circleLayers[layerName];
//         }
//     } else {
//         await addOverlayLayer(filepath, layerName);
//     }
// }

export async function toggleOverlay(button, filepath, layerName) {
    await addOverlayLayer(button, filepath, layerName);
}

export async function toggleReportsOverlay() {
    if (overlayLayers["reports"]) {
        clearReportsFromMap();
        overlayLayers["reports"]=null;
    } else {
        overlayLayers["reports"]=1;
        await fetchReports();
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
        if(layerName==="reports")
        {
            clearReportsFromMap();
        }
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

async function displayBucketList(bucketList)
{
        console.log('adding markers...');
         bucketList.forEach(location => {
             const category=location.category;
             const iconUrl = `http://127.0.0.1:5501/static/img/${category}.png`;
     
             const marker = new google.maps.Marker({
                 position: { lat: location.latitude, lng: location.longitude },
                 map: map.innerMap,
                 title: location.name,
                 category: location.category,
                 icon: { url: iconUrl, scaledSize: new google.maps.Size(30, 30) }
             });
     
             bucketList_markers.push(marker);
         });
}

async function removeBucketListMarkers()
{
    bucketList_markers.forEach(marker => {
        marker.setMap(null);
    });
    bucketList_markers=[];
}