document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('mapButton').addEventListener('click', () => {
        window.location.href = 'map.html';
    });

    window.addEventListener('scroll', function() {
        const header = document.getElementById('main-header');
        if (window.scrollY > 0) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    document.addEventListener('scroll', function() {
        const photos = document.querySelectorAll('.section-icons');
        photos.forEach(photo => {
            const rect = photo.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom >= 0) {
                photo.classList.add('in-view');
            } else {
                photo.classList.remove('in-view');
            }
        });
    });

});