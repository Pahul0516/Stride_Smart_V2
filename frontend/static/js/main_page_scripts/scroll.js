export function setupScrollFeatures() {
    const scrollArrow = document.getElementById("scrollArrow");
    const backToTop = document.getElementById("backToTop");

    window.addEventListener("scroll", () => {
        if (window.scrollY > 150) {
            scrollArrow.classList.add("opacity-0");
        } else {
            scrollArrow.classList.remove("opacity-0");
        }
    });

    backToTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}
