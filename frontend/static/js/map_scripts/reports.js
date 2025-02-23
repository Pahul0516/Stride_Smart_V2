import {hideOverview, showOverview} from "http://127.0.0.1:5501/static/js/map_scripts/map.js";

const hazardState = {
    currentLocation: null,
    currentMarker: null,
    selectedPhotos: [],
    maxPhotos: 3
};

export function showHazardReportForm() {
    initializeHazardModal();
    const placeOverview = document.getElementById('place-overview');
    const currentPlace = placeOverview?.place;
    hideOverview();

    if (!currentPlace || !currentPlace.geometry || !currentPlace.geometry.location) {
        showCustomAlert("No place selected to report a hazard.");
        return;
    }

    hazardState.currentLocation = {
        lat: currentPlace.geometry.location.lat(),
        lng: currentPlace.geometry.location.lng(),
    };

    document.getElementById('hazard-modal').classList.remove('hidden');
    setupHazardFormListeners();
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
        type: document.getElementById("hazard-type").value,
        description: document.getElementById("hazard-description").value,
        photos: hazardState.selectedPhotos.map(file => URL.createObjectURL(file)),
    };

    console.log("Report Submitted:", hazardData);

    hazardState.selectedPhotos = [];
    document.getElementById("uploaded-photos-container").innerHTML = "";
    updateFileText(document.getElementById("file-upload-text"));
    document.getElementById("hazard-form").reset();
    document.getElementById("hazard-modal").classList.add("hidden");

    showCustomAlert("Not all heroes wear capes. Some just report hazards!", "success");
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
        document.getElementById("alert-heading").textContent = "Report submitted successfully";
        alertIcon.src = "../icons/check.png";
    } else {
        document.getElementById("alert-heading").textContent = "Error";
        alertIcon.src = "../icons/error.png";
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

