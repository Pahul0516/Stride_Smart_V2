export function setupMenu() {
    const menuButton = document.getElementById("menuButton");
    const menuOverlay = document.getElementById("menuOverlay");
    const closeMenu = document.getElementById("closeMenu");

    menuButton.addEventListener("click", () => {
        menuOverlay.classList.remove("-translate-y-full");
    });

    closeMenu.addEventListener("click", () => {
        menuOverlay.classList.add("-translate-y-full");
    });

    document.addEventListener("click", (event) => {
        if (!menuOverlay.contains(event.target) && !menuButton.contains(event.target)) {
            menuOverlay.classList.add("-translate-y-full");
        }
    });
}
