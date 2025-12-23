const popupTitles = {
    thermalComfort: "Thermal Comfort",
    cleanAir: "Clean Air",
    naturePath: "Nature Path",
    safetyTrail: "Safety Trail",
    accessibleAdventure: "Accessible Adventure",
    discoverExplore: "Discover & Explore",
    reports: "Navigators' Reports"
};

const popupContents = {
    thermalComfort: "Solar radiation for each DEM point in Cluj-Napoca was calculated using a structured method for spatial and seasonal accuracy.<br><br>" +

        "The raster was reprojected from Stereo 70 to WGS 84 using <em>Project Raster</em> for proper alignment.<br><br>" +

        "Three key hours were selected per season—morning, noon, and afternoon—to capture sun exposure changes throughout the day:<br><br>" +

        "<strong>Seasonal Time Slots:</strong><br>" +
        "<table style='border-collapse: collapse; font-size: 0.75rem; width: 100%; text-align: center; font-family: Merriweather, sans-serif;'>" +
        "<tr style='font-weight: bold;'>" +
        "<th>Season</th><th>Morning</th><th>Noon</th><th>Afternoon</th></tr>" +
        "<tr><td>Spring</td><td>08:00</td><td>12:00</td><td>16:00</td></tr>" +
        "<tr><td>Summer</td><td>07:00</td><td>13:00</td><td>17:00</td></tr>" +
        "<tr><td>Autumn</td><td>08:00</td><td>12:00</td><td>16:00</td></tr>" +
        "<tr><td>Winter</td><td>09:00</td><td>12:00</td><td>15:00</td></tr>" +
        "</table><br>" +

        "Radiation was calculated with the <em>Area Solar Radiation</em> tool using:<br>" +
        "• <strong>Hourly Interval:</strong> 1<br>" +
        "• <strong>Sky Size:</strong> 200<br>" +
        "• <strong>Z-Factor:</strong> 0.000013<br><br>" +

        "This allowed accurate modeling of seasonal solar exposure over the city.<br><br>" +

        "<div style='font-size: 0.55rem; text-align: left; color: #777; margin-top: 5px'>Author: Maria-Julia Petre</div>",
    cleanAir:
        "The Clean Air path is based on two methods: traffic-related air quality marks and real-time sensor data.<br><br>" +

        "In Cluj-Napoca, traffic is the main pollution source, especially nitrogen oxides (NOx) and particulate matter (PM).<br>" +
        "We rated traffic zones from 1 (clean) to 4 (polluted).<br><br>" +

        "Real-time data comes from:<br>" +
        "• <a href='https://www.stropdeaer.ro/' target='_blank' style='text-decoration: underline; color: rgba(50,99,37,0.82); font-weight: 500;'>Strop de Aer</a> – open-source monitoring<br>" +
        "• <a href='https://www.calitateaer.ro/' target='_blank' style='text-decoration: underline; color: rgba(50,99,37,0.82); font-weight: 500;'>Calitate Aer</a> – national network<br><br>" +

        "Each map point has an air quality index based on PM10 and PM2.5 (the worse of the two), shown using color-coded marks.<br><br>" +

        "<strong>Air Quality Marking Table:</strong><br><br>" +
        "<table style='border-collapse: collapse; font-size: 0.75rem; width: 100%; text-align: center; font-family: Merriweather, sans-serif;'>" +
        "<tr style='background-color: transparent; font-weight: bold;'>" +
        "<th style='padding: 6px;'>Concentration<br>(µg/m³) PM10</th>" +
        "<th style='padding: 6px;'>Concentration<br>(µg/m³) PM2.5</th>" +
        "<th style='padding: 6px;'>Mark</th>" +
        "<th style='padding: 6px;'>Name</th>" +
        "</tr>" +
        "<tr style='background-color: rgba(0,160,0,0.8); color: white;'>" +
        "<td style='padding: 4px;'>0–30</td><td>0–15</td><td>1</td><td>Very good</td>" +
        "</tr>" +
        "<tr style='background-color: rgba(85,76,0,0.8); color: white;'>" +
        "<td style='padding: 4px;'>30–50</td><td>15–25</td><td>2</td><td>Good</td>" +
        "</tr>" +
        "<tr style='background-color: rgba(224,112,38,0.8); color: white;'>" +
        "<td style='padding: 4px;'>50–100</td><td>25–50</td><td>3</td><td>Bad</td>" +
        "</tr>" +
        "<tr style='background-color: rgba(224,0,60,0.8); color: white;'>" +
        "<td style='padding: 4px;'>&gt;100</td><td>&gt;50</td><td>4</td><td>Very bad</td>" +
        "</tr>" +
        "</table>" +
        "<div style='font-size: 0.55rem; text-align: left; color: #777; margin-top: 15px'>Author: Camelia Gînscă – ginscacamelia@gmail.com</div>",
    naturePath: "The Green Route calculation is based on road proximity to green areas.<br><br>" +

        "To determine which roads benefit from nearby greenery, the following steps were applied in Cluj-Napoca:<br><br>" +

        "• A 10 m buffer was created around the road network using <code>stereo_70_drumuri.shp</code>.<br>" +
        "• This buffer identified roads close to green spaces.<br>" +
        "• The <code>Clip</code> function extracted green areas (<code>stereo70_green_areas.shp</code>) inside this buffer.<br>" +
        "• The <code>Intersect</code> function created <code>intersect_green_drum.shp</code> with road segments near greenery.<br><br>" +

        "In the attribute table, fields were added to quantify 'green roads':<br>" +
        "• <code>lungime</code> – total road segment length<br>" +
        "• <code>lungime_dr</code> – length of segments within 10 m of green areas<br>" +
        "• <code>drum_verde</code> – percentage of each segment near greenery, using:<br><br>" +

        "<code>drum_verde = (lungime_dr / lungime) × 100</code><br><br>" +

        "This helped visualize and measure which roads offer a greener environment – useful for urban planning and sustainable mobility." +
        "<div style='font-size: 0.55rem; text-align: left; color: #777; margin-top: 15px'>Authors: Maria-Julia Petre, Sara Craciun, Camelia Gînscă</div>",
    safetyTrail: "The safety-related data is based on a 2016 study by Benedek J., Ciobanu S. M., and Man T., which analyzed traffic crash hotspots and their social background in Cluj-Napoca.<br><br>" +

        "Using the <code>Network Kernel Density Estimation</code> method (PKDE), the study identified areas with higher occurrences of traffic crashes.<br><br>" +

        "These hotspots were classified into three density levels:<br>" +
        "• <span style='color: rgba(0,128,0,1)'><code>1</code> – low density</span><br>" +
        "• <span style='color: rgba(255,165,0,1)'><code>2</code> – medium density</span><br>" +
        "• <span style='color: rgba(255,0,0,1)'><code>3</code> – high density</span><br><br>" +

        "Each hotspot was marked as a point on the map, representing locations of both pedestrian and vehicle-related crashes.<br><br>" +

        "This classification helps highlight areas where safety concerns are higher and supports urban safety planning." +
        "<div style='font-size: 0.55rem; text-align: left; color: #777; margin-top: 15px'>Author: Florin-Silviu Ungurean</div>"
    ,
    accessibleAdventure:
        "The slope analysis was based on the Cluj-Napoca DEM, using percentage-based slope calculation in ArcMap.<br><br>" +

        "The slope values were reclassified into accessibility categories based on international guidelines (e.g., ADA).<br><br>" +

        "After classification, the raster was converted to vector format. Color schemes were applied to each category to visually emphasize terrain inclination.<br><br>" +

        "<table style='border-collapse: collapse; width: 100%; text-align: center; font-family: Merriweather, sans-serif;'>" +

        "<tr style='background-color: transparent; font-size: 0.75rem; font-weight: bold;'>" +
        "<th style='padding: 6px;'>Slope (%)</th>" +
        "<th style='padding: 6px;'>Slope (°)</th>" +
        "<th style='padding: 6px;'>Accessibility</th>" +
        "</tr>" +

        "<tr style='background-color: rgba(57,166,0,0.7); color: rgba(0,0,0,0.8); font-size: 0.65rem;'>" +
        "<td style='padding: 4px;'>0 – 2%</td>" +
        "<td>0 – 1.15°</td>" +
        "<td><div style='font-weight: 600;'>Fully accessible</div><div style='font-size: 0.6rem;'>Equivalent to flat terrain</div></td>" +
        "</tr>" +

        "<tr style='background-color: rgba(137,208,0,0.7); color: rgba(0,0,0,0.8); font-size: 0.65rem;'>" +
        "<td style='padding: 4px;'>2 – 5%</td>" +
        "<td>1.15 – 2.86°</td>" +
        "<td><div style='font-weight: 600;'>Acceptable for short ramps</div><div style='font-size: 0.6rem;'>Max. 10–15 m</div></td>" +
        "</tr>" +

        "<tr style='background-color: rgba(252,253,2,0.7); color: rgba(0,0,0,0.8); font-size: 0.65rem;'>" +
        "<td style='padding: 4px;'>5 – 8.3%</td>" +
        "<td>2.86 – 4.76°</td>" +
        "<td><div style='font-weight: 600;'>ADA maximum</div><div style='font-size: 0.6rem;'>Accessible ramp length: max. 9 m</div></td>" +
        "</tr>" +

        "<tr style='background-color: rgba(253,119,0,0.7); color: rgba(0,0,0,0.8); font-size: 0.65rem;'>" +
        "<td style='padding: 4px;'>8.3 – 10%</td>" +
        "<td>4.76 – 5.71°</td>" +
        "<td><div style='font-weight: 600;'>Very difficult</div><div style='font-size: 0.6rem;'>Requires intermediate stops</div></td>" +
        "</tr>" +

        "<tr style='background-color: rgba(249,2,1,0.7); color: rgba(0,0,0,0.8); font-size: 0.65rem;'>" +
        "<td style='padding: 4px;'>&gt;10%</td>" +
        "<td>&gt;5.71°</td>" +
        "<td><div style='font-weight: 600;'>Inaccessible</div><div style='font-size: 0.6rem;'>Not usable without assistance</div></td>" +
        "</tr>" +

        "</table><br><br>" +

        "<div style='font-size: 0.55rem; text-align: left; color: #777;'>Author: Sara Crăciun</div>",
    discoverExplore: "The Discover & Explore feature is designed for tourists and travelers visiting Cluj-Napoca.<br><br>" +

        "It helps users explore the city by highlighting key points of interest across several categories:<br>" +
        "<div style='margin-bottom: 10px; margin-top: 20px'><img src='/projects/2/static/img/landmark.png' style='height: 30px; vertical-align: middle; margin-right: 8px; display: inline'/>Landmarks</div>" +
        "<div style='margin-bottom: 10px;'><img src='/projects/2/static/img/cafe.png' style='height: 30px; vertical-align: middle; margin-right: 8px; display: inline'/>Cafes</div>" +
        "<div style='margin-bottom: 10px;'><img src='/projects/2/static/img/restaurant.png' style='height: 30px; vertical-align: middle; margin-right: 8px; display: inline'/>Restaurants</div>" +
        "<div style='margin-bottom: 10px;'><img src='/projects/2/static/img/museum.png' style='height: 30px; vertical-align: middle; margin-right: 8px; display: inline'/>Museums</div>" +
        "<div style='margin-bottom: 10px;'><img src='/projects/2/static/img/entertainment.png' style='height: 30px; vertical-align: middle; margin-right: 8px; display: inline'/>Entertainment</div><br>" +

        "Users can click on map markers to:<br>" +
        "• Add the location to their personal bucket list for later visits<br>" +
        "• Access fun facts and interesting info using the <strong>information</strong> button (available for selected places)<br><br>" +

        "This feature makes it easier to plan a visit, discover hidden gems, and enjoy Cluj-Napoca like a local.",
    reports: "Navigator Reports allow users to actively contribute by reporting road issues they notice while walking.<br><br>" +

        "This feature promotes community involvement, helps maintain safer paths, and strengthens the sense of unity among users.<br><br>" +

        "Each user can mark a specific location and tag it under one of the following categories:<br>" +
        "• Pothole<br>" +
        "• Construction<br>" +
        "• Broken sidewalk<br>" +
        "• Other – with the option to specify the issue<br><br>" +

        "These reports are visible to all users, helping walkers stay informed and avoid hazards in real time.",
};

const popupIcons = {
    thermalComfort: "/projects/2/static/img/global-warming.png",
    cleanAir: "/projects/2/static/img/ventilation.png",
    naturePath: "/projects/2/static/img/forest.png",
    safetyTrail: "/projects/2/static/img/safe-zone.png",
    accessibleAdventure: "/projects/2/static/img/elderly.png",
    discoverExplore: "/projects/2/static/img/tour-guide.png",
    reports: "/projects/2/static/img/complain.png"
};

export function openPopup(type) {
    document.getElementById("popupTitle").innerText = popupTitles[type];
    document.getElementById("popupContent").innerHTML = popupContents[type];

    const popupIcon = document.getElementById("popupIcon");
    popupIcon.src = popupIcons[type];
    popupIcon.alt = `${popupTitles[type]} Icon`;

    const popupContainer = document.getElementById("popupContainer");
    popupContainer.style.fontFamily = "Merriweather,sans-serif";
    popupContainer.style.fontSize = "0.8rem";
    popupContainer.classList.remove("opacity-0", "scale-95", "pointer-events-none");
    popupContainer.classList.add("opacity-100", "scale-100");
}

export function closePopup() {
    const popupContainer = document.getElementById("popupContainer");
    popupContainer.classList.add("opacity-0", "scale-95", "pointer-events-none");
    popupContainer.classList.remove("opacity-100", "scale-100");
}