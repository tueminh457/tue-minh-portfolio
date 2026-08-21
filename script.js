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

    window.addEventListener('load', () => {
        // ... all the same code that's currently inside
        // document.addEventListener('DOMContentLoaded', () => { ... })
    });
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


/* ============ TITLE POP-OUT ANIMATION ============ */

document.addEventListener('DOMContentLoaded', () => {
    const cassette = document.querySelector('.title-cassette');
    const blurLayer = document.querySelector('.title-blur-layer');
    const continueText = document.querySelector('.click-to-continue');
    const blinkStars = Array.from(document.querySelectorAll('.title-star2-blink'));

    const popSelectors = [
        '.title-cassette',
        '.title-portfolio',
        '.title-apple',
        '.title-circle',
        '.title-star1',
        '.title-star2',
        '.button-logo'
    ];

    const elements = popSelectors
        .map(sel => document.querySelector(sel))
        .filter(Boolean);

    if (!cassette || !elements.length) return;

    const others = elements.filter(el => el !== cassette);
    const logo = document.querySelector('.button-logo');
    const apple = document.querySelector('.title-apple');
    // button-logo pops in on its own, later and separately from the rest —
    // apple also gets its own left-to-right bounce — so both are excluded
    // from the shared "others" stagger/settle groups below.
    const othersWithoutLogo = others.filter(el => el !== logo && el !== apple);

    const cassetteRect = cassette.getBoundingClientRect();
    const cassetteCenter = {
        x: cassetteRect.left + cassetteRect.width / 2,
        y: cassetteRect.top + cassetteRect.height / 2
    };

    const offsets = elements.map(el => {
        const rect = el.getBoundingClientRect();
        const elCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        return {
            el,
            dx: cassetteCenter.x - elCenter.x,
            dy: cassetteCenter.y - elCenter.y
        };
    });

    // Precompute each blink star's inward starting offset BEFORE we touch
    // any styles/transforms, so getBoundingClientRect() reads natural layout
    // positions and nothing here can throw and abort the rest of the script.
    const blinkOffsets = blinkStars.map(el => {
        const rect = el.getBoundingClientRect();
        const elCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        return {
            el,
            dx: (cassetteCenter.x - elCenter.x) * 0.6,
            dy: (cassetteCenter.y - elCenter.y) * 0.6
        };
    });

    gsap.set(elements, { xPercent: -50, yPercent: -50, opacity: 0, scale: 0 });
    if (blurLayer) gsap.set(blurLayer, { opacity: 0 });
    if (continueText) gsap.set(continueText, { opacity: 0, y: 10 });

    if (blinkOffsets.length) {
        blinkOffsets.forEach(({ el, dx, dy }) => {
            gsap.set(el, { x: dx, y: dy, opacity: 0, scale: 0.5 });
        });
    }

    offsets.forEach(({ el, dx, dy }) => {
        const randomSpin = gsap.utils.random(-45, 45);
        if (el === cassette) {
            gsap.set(el, { rotation: randomSpin });
        } else if (el !== logo && el !== apple) {
            gsap.set(el, { x: dx, y: dy, rotation: randomSpin });
        }
    });

    // Logo gets its own simple state: no scatter/spin, just parked
    // slightly below its resting spot so it can fade in upward.
    if (logo) {
        gsap.set(logo, { x: 0, y: 40, rotation: 0, scale: 1, opacity: 0 });
    }

    // Apple gets parked off to the left so it can slide in horizontally.
    if (apple) {
        gsap.set(apple, { x: -300, y: 0, rotation: 0, scale: 1, opacity: 0 });
    }

    const tl = gsap.timeline({ defaults: { ease: 'back.out(1.7)' } });

    if (blurLayer) {
        tl.to(blurLayer, { opacity: 1, duration: 0.8, ease: 'power2.out' }, 0);
    }

    tl.to(cassette, { opacity: 1, scale: 1, rotation: 0, duration: 0.6 }, 0);

    const popStart = 0.4;

    tl.to(
        othersWithoutLogo,
        {
            opacity: 1,
            scale: 1,
            x: 0,
            y: 0,
            rotation: 0,
            duration: 0.9,
            stagger: 0.12
        },
        popStart
    );

    tl.to(
        cassette,
        { rotation: gsap.utils.random(-6, 6), duration: 0.5, ease: 'power2.out' },
        0.6
    );

    othersWithoutLogo.forEach((el, i) => {
        const landTime = popStart + 0.9 + i * 0.12;
        tl.to(
            el,
            { rotation: gsap.utils.random(-6, 6), duration: 0.5, ease: 'power2.out' },
            landTime
        );
    });

    // Apple slides in from the left with a bit of bounce/overshoot,
    // starting alongside the rest of the pop but landing well before
    // the logo comes in.
    const appleStartTime = popStart + 0.15;

    if (apple) {
        tl.to(
            apple,
            {
                x: 0,
                opacity: 1,
                duration: 0.65,
                ease: 'back.out(2.5)'
            },
            appleStartTime
        );
    }

    // Everything else has landed by roughly this point — logo comes in
    // last, fading in while sliding upward into place.
    const logoStartTime = popStart + 0.9 + othersWithoutLogo.length * 0.12 + 0.35;

    if (logo) {
        tl.to(
            logo,
            {
                y: 0,
                opacity: 1,
                duration: 0.7,
                ease: 'power2.out'
            },
            logoStartTime
        );
    }

    // Blink stars pop on/off one after another, moving outward from the
    // title center, timed to start once .title-portfolio has popped in
    // (it's the 2nd item in "others").
    if (blinkOffsets.length) {
        const portfolioIndex = others.findIndex(el => el.classList.contains('title-portfolio'));
        const portfolioLandTime = popStart + (portfolioIndex >= 0 ? portfolioIndex * 0.12 : 0);

        blinkOffsets.forEach(({ el }, i) => {
            // wider gap between each star's appearance, and a buffer so
            // they clearly land after the portfolio title has popped in
            const blinkTime = portfolioLandTime + 0.3 + i * 0.28;

            tl.to(
                el,
                {
                    x: 0,
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    duration: 0.35,
                    ease: 'power2.out'
                },
                blinkTime
            ).to(
                el,
                {
                    opacity: 0,
                    duration: 0.45,
                    ease: 'power2.inOut'
                },
                blinkTime + 0.35
            );
        });
    }

    tl.eventCallback('onComplete', () => {
        if (continueText) {
            gsap.to(continueText, {
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: 'power2.out',
                pointerEvents: 'auto'
            });
        }

        const dismissOnClick = () => {
            if (blurLayer) {
                gsap.to(blurLayer, { opacity: 0, duration: 0.8, ease: 'power2.out' });
            }
            if (continueText) {
                gsap.to(continueText, {
                    opacity: 0,
                    duration: 0.6,
                    ease: 'power2.out',
                    pointerEvents: 'none'
                });
            }
        };

        document.addEventListener('click', dismissOnClick, { once: true });
    });
});