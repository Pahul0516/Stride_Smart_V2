import {getDestination, hideOverview, showOverview} from "/projects/2/static/static/js/map_scripts/map.js";
import {reportMarkers} from "/projects/2/static/static/js/overlays/map.js";

const hazardState = {
    currentLocation: null,
    currentMarker: null,
    selectedPhotos: [],
    maxPhotos: 3
};

export function showHazardReportForm() {
    initializeHazardModal();
    hideOverview();

    if (!getDestination()) {
        showCustomAlert("No place selected to report a hazard.");
        return;
    }

    console.log(getDestination());
    hazardState.currentLocation = {
        lat: getDestination().lat,
        lng: getDestination().lng,
    };

    document.getElementById('hazard-modal').classList.remove('hidden');
    setupHazardFormListeners();
    checkFormValidity();
}

export function initializeHazardModal() {
    const modal = document.getElementById("hazard-modal");
    const form = document.getElementById("hazard-form");
    const uploadedPhotosContainer = document.getElementById("uploaded-photos-container");

    document.getElementById("modal-close-button").addEventListener("click", () => {
        closeHazardModal(modal, form, uploadedPhotosContainer);
    });
}

function closeHazardModal(modal, form, uploadedPhotosContainer) {
    modal.classList.add("hidden");
    form.reset();
    uploadedPhotosContainer.innerHTML = "";

    if (hazardState.currentMarker) {
        hazardState.currentMarker.setMap(null);
        hazardState.currentMarker = null;
    }

    hazardState.currentLocation = null;
    hazardState.selectedPhotos = [];
    showOverview();
}

function setupHazardFormListeners() {
    const hazardImageInput = document.getElementById("hazard-image");
    const uploadBtn = document.getElementById("upload-btn");

    uploadBtn.addEventListener("click", () => hazardImageInput.click());

    hazardImageInput.addEventListener("change", handleFileUpload);

    document.getElementById("hazard-type").addEventListener("input", checkFormValidity);
    document.getElementById("hazard-description").addEventListener("input", checkFormValidity);

    document.getElementById("hazard-form").addEventListener("submit", handleFormSubmit);
}

function handleFileUpload(event) {
    const uploadedPhotosContainer = document.getElementById("uploaded-photos-container");
    const fileUploadText = document.getElementById("file-upload-text");
    const files = Array.from(event.target.files);

    if (hazardState.selectedPhotos.length + files.length > hazardState.maxPhotos) {
        showCustomAlert("You can only upload up to 3 photos.");
        return;
    }

    files.forEach(file => {
        if (hazardState.selectedPhotos.length < hazardState.maxPhotos) {
            hazardState.selectedPhotos.push(file);
            displayPhoto(file, uploadedPhotosContainer);
        }
    });

    event.target.value = "";
    updateFileText(fileUploadText);
    checkFormValidity();
}

function displayPhoto(file, container) {
    const photoContainer = document.createElement("div");
    photoContainer.classList.add("uploaded-photo");

    const photo = document.createElement("img");
    photo.src = URL.createObjectURL(file);
    photo.classList.add("w-8", "object-cover", "rounded-md");

    const removeButton = document.createElement("button");
    removeButton.classList.add("remove-photo", "text-gray-600", "hover:text-red-600", "text-base", "font-bold");
    removeButton.innerHTML = "✕";

    removeButton.addEventListener("click", () => removePhoto(file, photoContainer));

    photoContainer.appendChild(removeButton);
    photoContainer.appendChild(photo);
    container.appendChild(photoContainer);
}

function removePhoto(file, photoContainer) {
    hazardState.selectedPhotos = hazardState.selectedPhotos.filter(photo => photo !== file);
    photoContainer.remove();
    updateFileText(document.getElementById("file-upload-text"));
    checkFormValidity();
}

function updateFileText(fileUploadText) {
    fileUploadText.textContent = hazardState.selectedPhotos.length > 0
        ? `${hazardState.selectedPhotos.length} file(s) selected`
        : "No file chosen";
}

export function checkFormValidity() {
    const hazardType = document.getElementById("hazard-type").value;
    const description = document.getElementById("hazard-description").value.trim();
    const isValid = hazardType !== "" && description !== "";

    document.getElementById("submit-button").disabled = !isValid;

    return isValid;
}

function handleFormSubmit(event) {
    event.preventDefault();

    if (!checkFormValidity()) {
        showCustomAlert("Please fill out all fields before submitting the form.");
        return;
    }

    const hazardData = {
        latitude: destination.lat,
        longitude: destination.lng,
        type: document.getElementById("hazard-type").value,
        description: document.getElementById("hazard-description").value,
        //photos: hazardState.selectedPhotos.map(file => URL.createObjectURL(file)),
        photos: [],
        user_id:sessionStorage.getItem('account_id')
    };

    loadHazardPhotos(hazardData);
    loadReport(hazardData);
    console.log("Report Submitted:", hazardData);

    hazardState.selectedPhotos = [];
    document.getElementById("uploaded-photos-container").innerHTML = "";
    updateFileText(document.getElementById("file-upload-text"));
    document.getElementById("hazard-form").reset();
    document.getElementById("hazard-modal").classList.add("hidden");

    showCustomAlert("Not all heroes wear capes. Some just report hazards!", "success");
}

function loadReport(hazardData)
{
    fetch('/projects/2/load_new_report', {
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

function loadHazardPhotos(hazardData)
{
    const photosToProcess = hazardState.selectedPhotos.length;
    let processedPhotos = 0;
    hazardState.selectedPhotos.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const arrayBuffer = event.target.result;
            const byteArray = Array.from(new Uint8Array(arrayBuffer));
            hazardData.photos.push(byteArray);
            processedPhotos++;

            console.log(`Uploaded ${processedPhotos}/${photosToProcess} photos`);

            if (processedPhotos === photosToProcess) {
                console.log("All photos uploaded, sending data:", hazardData);
            }
        };
        reader.onerror = (error) => {
            console.error("Error reading photo:", error);
        };
        reader.readAsArrayBuffer(file);
    });
}

export function showCustomAlert(message, type = "error") {
    const alertModal = document.getElementById("custom-alert");
    const alertMessage = document.getElementById("alert-message");
    const alertIcon = document.getElementById("alert-icon");

    if (!alertModal || !alertMessage || !alertIcon) {
        console.error("Custom alert elements not found.");
        return;
    }

    alertMessage.textContent = message;

    if (type === "success") {
        document.getElementById("alert-heading").textContent = "Report submitted successfully!";
        alertIcon.src = "/projects/2/static/static/img/check.png";
    } else {
        document.getElementById("alert-heading").textContent = "Error";
        alertIcon.src = "/projects/2/static/img/error.png";
    }

    alertIcon.classList.remove("hidden");
    alertModal.classList.remove("hidden");

    document.getElementById("alert-close-button").addEventListener("click", hideCustomAlert);
    document.getElementById("alert-ok-button").addEventListener("click", hideCustomAlert);
}

function hideCustomAlert() {
    const alertModal = document.getElementById("custom-alert");
    const alertIcon = document.getElementById("alert-icon");
    alertModal.classList.add("hidden");
    alertIcon.classList.add("hidden");
    if(document.getElementById("alert-heading").innerText !== "Error")
        showOverview();
}

export async function fetchReports()
{
    try {
        const response = await fetch('/projects/2/view_reports');
        const reports = await response.json();
        await displayReportsOnMap(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
    }
}

async function displayReportsOnMap(reports)
{
    reports.forEach((report) => {
        console.log(report);
        let icon_id;
        let url;
        if(report.type==='pothole') url='/projects/2/static/img/report-pothole.png';
        else if(report.type==='construction') url='/projects/2/static/img/report-construction.png';
        else if(report.type==='broken-sidewalk'|| report.type==='sidewalk') url='/projects/2/static/img/report-sidewalk.png';
        else url='/projects/2/static/img/report-other.png';
        console.log(`icon id: ${icon_id}`);
        const icon = {
            url: url,
            scaledSize: new google.maps.Size(40, 60),
        };

        const marker = new google.maps.Marker({
            position: { lat: report.latitude, lng: report.longitude },
            map: map.innerMap,
            title: report.type,
            icon: icon
        });

        reportMarkers.push(marker);

        const formatDate = (isoString) => {
            const date = new Date(isoString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${day}-${month}-${year}, ${hours}:${minutes}:${seconds}`;
        };
        const infoWindowContent = `
                <div>
                    <h3>${report.type}</h3>
                    <p>${report.description}</p>
                    ${report.photos.map(photo => `<img src="data:image/jpeg;base64,${photo}" width="100" alt="report-image">`).join('')}
                    <p style="color: #A2B38B;">Reported on: ${formatDate(report.created_at)}</p>
                    <p>Reported by:  ${report.username}</p>
                </div>
            `;
        const infoWindow = new google.maps.InfoWindow({
            content: infoWindowContent
        });

        marker.addListener('click', () => {
            infoWindow.open(map, marker);
        });
    });
}
