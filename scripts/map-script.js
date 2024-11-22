let userLocation;
let destination;
let directionsService;
let directionsRenderer;
let map;
let placePicker;
let geocoder;
let overview;

async function init() {
    await customElements.whenDefined('gmp-map');
    await customElements.whenDefined('gmpx-api-loader');
    await customElements.whenDefined('gmpx-place-picker');
    await customElements.whenDefined('gmpx-place-overview');
    await customElements.whenDefined('gmpx-icon-button');
    map = document.querySelector('gmp-map');
    placePicker = document.querySelector('gmpx-place-picker');
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    geocoder = new google.maps.Geocoder();
    overview = document.getElementById('place-overview');
    let marker = new google.maps.Marker({map: map.innerMap});

    map.innerMap.setOptions({
        mapTypeControl: false,
        center: {lat: 46.770439, lng: 23.591423},
        zoom: 15
    });

    directionsRenderer.setMap(map.innerMap);

    // Here we get the user's current position on the map and place a marker there, using geolocation
    // We store the user's location in a global variable userLocation, and we center the map in this point
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
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: "rgba(0,102,255,0.64)",
                        fillOpacity: 1,
                        strokeColor: "rgba(0,31,154,0.5)",
                        strokeWeight: 2,
                        scale: 8,
                    }
                });
            },
            () => {
                console.error("Geolocation permission denied or unavailable.");
            }
        );
    } else {
        console.error("Geolocation is not supported by this browser.");
    }


    // Here we make the map place a marker on the location clicked by the user, and keep the location in the destination variable
    // We also have an overview of the clicked locations with a button to show the directions, which is a function created below
    map.innerMap.addListener("click", (event) => {
        destination = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
        };
        geocoder.geocode({location: destination}, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results[0]) {
                overview.place = results[0];
            } else {
                console.error("Geocoder failed due to: " + status);
                document.getElementById("overview-display").innerText = "No place details available for this location.";
            }

            marker.setPosition(destination);
            map.innerMap.setCenter(destination);
            map.innerMap.setZoom(15);
            document.getElementById('direction-button').addEventListener('click', showDirections);
            document.getElementById('exit-button').addEventListener('click', closeDirectionsOverview);
        });
    })


    // This is the function that controls the place picker (the input box in which the user types an address)
    // It takes the input, and uses the PlaceService to convert it into a Place object, from which it can extract the lat
    // and the lng, and then places a marker in the searched place
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
                        document.getElementById('direction-button').addEventListener('click', showDirections);
                        document.getElementById('exit-button').addEventListener('click', closeDirectionsOverview);
                    } else {
                        console.error('Failed to get full place details:', status);
                    }
                });
            } else {
                console.error('Could not extract placeId from placePicker.value');
            }
        } else {
            overview.place = null;
            marker.setPosition(null);
            map.innerMap.setCenter({lat: 46.770439, lng: 23.591423});
            map.innerMap.setZoom(15);
            if(placePicker && placePicker.value && placePicker.shadowRoot.querySelector('.pac-target-input').value) {
                placePicker.shadowRoot.querySelector('.pac-target-input').value = '';
            }
            directionsRenderer.setDirections({routes: []});
        }
    });


    // This section takes care of the opening and closing of the menu
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



    // This is the function that shows the route from the userLocation to the destination point
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


    // This is a function that closes the overview, and sets all the map components to null
    function closeDirectionsOverview() {
        if(placePicker && placePicker.value && placePicker.shadowRoot.querySelector('.pac-target-input').value) {
            placePicker.shadowRoot.querySelector('.pac-target-input').value = '';
        }
        destination = undefined;
        map.innerMap.setZoom(15);
        marker.setPosition(null);
        overview.place = null;
        directionsRenderer.setDirections({routes: []});
    }

    //function to build heatmap with data from given file
    async function addHeatmap(geojsonFile) {
        const response = await fetch(geojsonFile);
        console.log("heatmap fetched");
        const geojsonData = await response.json();
        console.log("heatmap fetched");

        map.innerMap.data.addGeoJson(geojsonData);
        console.log('data loaded');

        map.innerMap.data.setStyle({
           fillColor: "green",
           strokeColor: "black",
           strokeWeight: 1,
           fillOpacity: 0.6,
        });
}

async function loadOSMGeoJson(osmGeoJsonPath) {
    const response=await fetch(osmGeoJsonPath);
    console.log("fetched");
    const geojsonData = await response.json();
    console.log("OSM data fetched");

    // Add the GeoJSON data to the map
    map.innerMap.data.addGeoJson(geojsonData);

    // Style the data (optional)
    map.innerMap.data.setStyle({
        strokeColor: "blue",  // Set edge color
        strokeWeight: 2,      // Set edge width
        fillOpacity: 0,       // No fill for roads
    });
}

document.querySelector('gmp-map').addEventListener('map-ready', (event) => {
    map = event.detail.map; // Get the Google Maps API map instance
});

document.getElementById("green-button").addEventListener("click",()=>{
    //loadOSMGeoJson("osm_edges.geojson");
    addHeatmap("fixed_polygons.geojson");
});
}

document.addEventListener('DOMContentLoaded', init);
