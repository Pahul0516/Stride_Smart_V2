document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('mapButton').addEventListener('click', () => {
        window.location.href = 'map.html';
    });

    // Add the scroll listener and trigger the scroll event handler on load.
    const applyScrollStyles = () => {
        const button = document.querySelector('.menu-button');
        const menu = document.getElementById('menu');
        const section2 = document.getElementById('description-section');
        const section2Top = section2.getBoundingClientRect().top;
        const menuLinks = document.querySelectorAll('.menu a');

        if (section2Top >= window.innerHeight / 2 - 450) {
            button.style.color = '#FEFAE0';
            button.style.backgroundColor = 'transparent';
            menu.style.backgroundColor = '#FEFAE0';
            menuLinks.forEach(link => {
                link.style.color = '#A6B37D';
            });
        } else {
            button.style.color = '#A6B37D';
            button.style.backgroundColor = 'transparent';
            menu.style.backgroundColor = '#A6B37D';
            menuLinks.forEach(link => {
                link.style.color = '#FEFAE0';
            });
        }
    };

    window.addEventListener('scroll', applyScrollStyles);

    // Trigger the initial style setup on load.
    applyScrollStyles();

    document.addEventListener('click', (event) => {
        const menu = document.getElementById('menu');
        const button = document.querySelector('.menu-button');
        if (!menu.contains(event.target) && event.target !== button) {
            menu.classList.remove('show');
            button.classList.remove('active');
        }
    });

    document.addEventListener('scroll', function() {
        const photos = document.querySelectorAll('.cat-girl');
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
