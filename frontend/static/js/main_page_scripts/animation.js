export function setupAnimation() {
    const animation = lottie.loadAnimation({
        container: document.getElementById("lottie-animation"),
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: "http://127.0.0.1:5501/static/animations/loading.json"
    });

    window.addEventListener("load", () => {
        setTimeout(() => {
            document.getElementById("lottie-animation").style.display = "none";
        }, 2500);

        document.body.style.opacity = "1";
    });
}

export function setupLazyAnimations() {
    document.addEventListener("DOMContentLoaded", () => {
        const fadeInElements = document.querySelectorAll(".fade-in");
        const revealElements = document.querySelectorAll(".reveal");

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                }
            });
        }, { threshold: 0.2 });

        fadeInElements.forEach(element => observer.observe(element));
        revealElements.forEach(element => observer.observe(element));
    });
}
