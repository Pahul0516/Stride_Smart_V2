import {activeTouristCategories, markers, removeMarkers, setupTouristPopup} from "/projects/2/static/js/map_scripts/tourist.js";
import {map, googleMap, initGooglePlacePicker} from "/projects/2/static/js/map_scripts/map.js";
import {
    deactivateTouristButton,
    resetButtonStyle
} from "/projects/2/static/js/map_scripts/menu.js";
import {fetchReports, clearReportsFromMap} from "/projects/2/static/js/map_scripts/reports.js";

export let activeLayer = [null, null];
export let overlayLayers = {};
export let circleLayers = [];
export let reportMarkers = []
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
                    toggleOverlay(button, "/projects/2/static/data/air_quality.geojson", "air_quality");
                    break;
                case 'nature-path-o':
                    toggleOverlay(button, "/projects/2/static/data/filtered_cluj_polygons.geojson", "green");
                    break;
                case 'accessible-o':
                    toggleRasterOverlay(button, "accessibility");
                    break;
                case 'safety-trail-o':
                    toggleOverlay(button, "/projects/2/static/data/road_crash_density.geojson", "safety");
                    break;
                case 'discover-explore-o':
                    toggleOverlay(button, "/projects/2/static/data/tourist_data.json", "tourist");
                    break;
                case 'reports-o':
                    toggleOverlay(button, "", "reports");
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
            zoom: 0,
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
            return `/projects/2/static/tiles/${type}/${season}/${zoom}/${coord.x}/${y_flipped}.png`;
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: 0.6
    });

    googleMap.overlayMapTypes.push(tileLayer);
    activeLayer = [button, tileLayer];
}

export function handleOverlayButton(button) {
    if (activeLayer[0] !== null && activeLayer[0] !== button) {
        console.log(activeLayer[0]);
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
        if (layerName === "tourist") {
            activeLayer[0] = button;
            setupTouristPopup();
            return;
        }

        const dataLayer = new google.maps.Data();

        if (layerName === "air_quality") {
            await loadAirQualityData();
        }
        else if(layerName === "reports"){
            await fetchReports();
        }
        else {
            await loadGeoJsonLayer(dataLayer, filepath, layerName);
        }

        dataLayer.setMap(map.innerMap);
        activeLayer = [button, dataLayer];

        console.log(`Overlay added: ${layerName}`);
    } catch (error) {
        console.error(`Error loading overlay layer (${layerName}):, error`);
    }
}

async function loadAirQualityData() {
    try {
        const response = await fetch("/projects/2/get-air-quality-overlay");
        const data = await response.json();

        data.forEach(point => {
            if (isNaN(point.latitude) || isNaN(point.longitude)) {
                console.error("Invalid air quality data point:", point);
                return;
            }

            const circle = new google.maps.Circle({
                strokeColor: getAirQualityColorFromPM(point.pm25, point.pm10),
                strokeOpacity: 0.8,
                strokeWeight: 1,
                fillColor: getAirQualityColorFromPM(point.pm25, point.pm10),
                fillOpacity: 0.5,
                map: map.innerMap,
                center: { lat: parseFloat(point.latitude), lng: parseFloat(point.longitude) },
                radius: 250,
                clickable: false
            });
            circleLayers.push(circle);
        });

        console.log("Air quality data loaded.");
    } catch (error) {
        console.error("Error fetching air quality data:", error);
    }
}

async function loadGeoJsonLayer(dataLayer, filepath, layerName) {
    const response = await fetch(filepath);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    let geojsonData = await response.json();
    dataLayer.addGeoJson(geojsonData);
    dataLayer.setStyle(feature => styleGeoJsonFeature(feature, geojsonData, layerName));
}

function styleGeoJsonFeature(feature, geojsonData, layerName) {
    const geometry = feature.getGeometry();
    if (!geometry) {
        console.error("Feature missing geometry:", feature);
        return { visible: false };
    }

    const geometryType = geometry.getType();

    if (geometryType === "Point" && layerName === "safety") {
        return styleSafetyFeature(feature);
    }

    if (["Polygon", "MultiPolygon"].includes(geometryType)) {
        return layerName === "green" ? styleGreenFeature(geojsonData) : defaultStyle();
    }

    console.error("Unexpected geometry type:", geometryType);
    return { visible: false };
}

function styleSafetyFeature(feature) {
    const safetyLevel = feature.getProperty("grad");
    const fillColor = getSafetyColor(safetyLevel);
    const coords = feature.getGeometry().get();

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

function styleGreenFeature(geojsonData) {
    if (!geojsonData.processed) {
        geojsonData.features = geojsonData.features
            .filter(feature => feature.geometry && feature.geometry.type)
            .map(feature => processGreenFeature(feature));

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

function processGreenFeature(feature) {
    try {
        const bufferDistance = 5;
        let bufferedFeature = turf.buffer(feature, bufferDistance, { units: 'meters', steps: 10 });

        const tolerance = 0.000000000001;
        return turf.simplify(bufferedFeature, { tolerance, highQuality: false });
    } catch (error) {
        console.error("Error processing green feature:", feature, error);
        return feature;
    }
}

function defaultStyle() {
    return {
        fillColor: 'rgba(128, 128, 128, 0.4)',
        strokeColor: 'black',
        strokeWeight: 1,
        fillOpacity: 0.4,
        clickable: false
    };
}

function getAirQualityColorFromPM(pm25, pm10) {
    function getColorForPM25(value) {
        if (value >= 0 && value <= 15) return "#00A000";
        if (value > 15 && value <= 25) return "#554C00";
        if (value > 25 && value <= 50) return "#E07026";
        if (value > 50) return "#E0003C";
        return "#000000";
    }

    function getColorForPM10(value) {
        if (value >= 0 && value <= 30) return "#00A000";
        if (value > 30 && value <= 50) return "#554C00";
        if (value > 50 && value <= 100) return "#E07026";
        if (value > 100) return "#E0003C";
        return "#000000";
    }

    const pm25Color = getColorForPM25(pm25);
    const pm10Color = getColorForPM10(pm10);

    const colorPriority = ["#00A000", "#554C00", "#E07026", "#E0003C"];

    return colorPriority.includes(pm10Color) && colorPriority.indexOf(pm10Color) > colorPriority.indexOf(pm25Color)
        ? pm10Color
        : pm25Color;
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
    reportMarkers.forEach(marker => marker.setMap(null));
    reportMarkers = [];

    const googleMapsContainer = document.getElementById("google-maps-container");

    if (!gmpxActive) {
        googleMapsContainer.style.display = "none";
        map.style.display = "block";
        gmpxActive = true;
    }
    clearReportsFromMap();
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