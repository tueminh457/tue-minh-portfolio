/* ============ CIRCULAR GALLERY ============ */

const gallery = document.querySelector('#circularGallery');
const track = document.querySelector('.gallery-track');

if (gallery && track && track.children.length) {

    // Clone the original set once before and once after,
    // so there's always a buffer to scroll into in both directions.
    const originalItems = Array.from(track.children);
    const itemsPerSet = originalItems.length;

    const beforeClones = originalItems.map(item => item.cloneNode(true));
    const afterClones = originalItems.map(item => item.cloneNode(true));

    beforeClones.reverse().forEach(clone => track.insertBefore(clone, track.firstChild));
    afterClones.forEach(clone => track.appendChild(clone));

    let position = 0;
    let targetPosition = 0;
    let isDragging = false;
    let startX = 0;
    let startPosition = 0;
    let setWidth = 0;

    function calculateSetWidth() {
        const children = track.children;
        if (children.length < itemsPerSet + 1) return 0;
        const first = children[0].getBoundingClientRect();
        const nextSetStart = children[itemsPerSet].getBoundingClientRect();
        return nextSetStart.left - first.left; // exact repeat period
    }

    function animate() {
    position += (targetPosition - position) * 0.08;

    // Seamless wrap
    if (setWidth > 0) {
        if (position <= -setWidth) {
            position += setWidth;
            targetPosition += setWidth;
        } else if (position >= setWidth) {
            position -= setWidth;
            targetPosition -= setWidth;
        }
    }

    track.style.transform = `translate(calc(-50% + ${position}px), -50%)`;

    // Scale items based on proximity to the gallery's center
    const galleryRect = gallery.getBoundingClientRect();
    const centerX = galleryRect.left + galleryRect.width / 2;

    Array.from(track.children).forEach((item) => {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.left + rect.width / 2;
        const distance = Math.abs(itemCenter - centerX);

        // Falloff: 1 at center, shrinking to minScale by maxDistance
        const maxDistance = galleryRect.width / 2;
        const proximity = Math.max(0, 1 - distance / maxDistance);

        const minScale = 0.7;
        const maxScale = 1.35;
        const scale = minScale + proximity * (maxScale - minScale);

        item.style.transform = `scale(${scale})`;
        item.style.zIndex = Math.round(scale * 100); // closer item renders on top
    });

    requestAnimationFrame(animate);
}

    function refreshSetWidth() {
        setWidth = calculateSetWidth();
    }

    window.addEventListener('load', refreshSetWidth);
    window.addEventListener('resize', refreshSetWidth);
    refreshSetWidth();

    gallery.addEventListener('wheel', (event) => {
        event.preventDefault();
        targetPosition -= event.deltaY * 0.7;
    }, { passive: false });

    gallery.addEventListener('mousedown', (event) => {
        isDragging = true;
        startX = event.clientX;
        startPosition = targetPosition;
    });

    window.addEventListener('mousemove', (event) => {
        if (!isDragging) return;
        const distance = event.clientX - startX;
        targetPosition = startPosition + distance;
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    gallery.addEventListener('touchstart', (event) => {
        isDragging = true;
        startX = event.touches[0].clientX;
        startPosition = targetPosition;
    });

    gallery.addEventListener('touchmove', (event) => {
        if (!isDragging) return;
        event.preventDefault();
        const distance = event.touches[0].clientX - startX;
        targetPosition = startPosition + distance;
    }, { passive: false });

    gallery.addEventListener('touchend', () => {
        isDragging = false;
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') {
            targetPosition -= 350;
        }
        if (event.key === 'ArrowLeft') {
            targetPosition += 350;
        }
    });

    animate();
}