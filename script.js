/* ============ CIRCULAR GALLERY ============ */

const gallery = document.querySelector('#circularGallery');
const track = document.querySelector('.gallery-track');

// Shared with the cassette open/close block below: true while a cassette
// is open (or a transition clone is mid-flight), so the gallery ignores
// drag/wheel/keyboard input during that time.
let galleryLocked = false;

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
    let dragMoved = false;
    const DRAG_THRESHOLD = 6; // px
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
        if (galleryLocked) return;
        event.preventDefault();
        targetPosition -= event.deltaY * 0.7;
    }, { passive: false });

    gallery.addEventListener('mousedown', (event) => {
        if (galleryLocked) return;
        isDragging = true;
        dragMoved = false;
        startX = event.clientX;
        startPosition = targetPosition;
    });

    window.addEventListener('mousemove', (event) => {
        if (!isDragging) return;
        const distance = event.clientX - startX;
        if (Math.abs(distance) > DRAG_THRESHOLD) dragMoved = true;
        targetPosition = startPosition + distance;
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    gallery.addEventListener('touchstart', (event) => {
        if (galleryLocked) return;
        isDragging = true;
        dragMoved = false;
        startX = event.touches[0].clientX;
        startPosition = targetPosition;
    });

    gallery.addEventListener('touchmove', (event) => {
        if (!isDragging) return;
        event.preventDefault();
        const distance = event.touches[0].clientX - startX;
        if (Math.abs(distance) > DRAG_THRESHOLD) dragMoved = true;
        targetPosition = startPosition + distance;
    }, { passive: false });

    gallery.addEventListener('touchend', () => {
        isDragging = false;
    });

    window.addEventListener('keydown', (event) => {
        if (galleryLocked) return;
        if (event.key === 'ArrowRight') {
            targetPosition -= 350;
        }
        if (event.key === 'ArrowLeft') {
            targetPosition += 350;
        }
    });

    animate();

    /* ============ CASSETTE 1 OPEN/CLOSE ============ */

    (() => {
        const display1 = document.querySelector('.cassette1-display');
        if (!display1) return;

        // Read the open-state target position/scale from CSS custom
        // properties instead of hardcoding them, so they track whatever
        // the current breakpoint's --cassette-target-left/top/open-scale
        // vars say (define these in :root and override per media query).
        function getCassetteTargetLeftPct() {
            const raw = getComputedStyle(document.documentElement)
                .getPropertyValue('--cassette-target-left');
            const val = parseFloat(raw);
            return Number.isFinite(val) ? val : 0.35;
        }
        // Computed directly in JS, same reasoning as getCassetteOpenScale
        // above — lets the open-state vertical target shift gradually
        // with screen width instead of only jumping at breakpoints.
        function getCassetteTargetTopPct() {
            const MIN_TOP = 0.43;   // top % at 360px wide and narrower
            const MAX_TOP = 0.25;   // top % at 1920px wide and wider
            const MIN_WIDTH = 360;
            const MAX_WIDTH = 1920;

            const width = window.innerWidth;
            const progress = (width - MIN_WIDTH) / (MAX_WIDTH - MIN_WIDTH);
            const clampedProgress = Math.min(Math.max(progress, 0), 1);

            return MIN_TOP + clampedProgress * (MAX_TOP - MIN_TOP);
        }
        // Computed directly in JS rather than read from a CSS custom
        // property: getComputedStyle() does NOT evaluate calc()/clamp()
        // inside an unused custom property — it returns the literal
        // specified text (e.g. "clamp(1.0, calc(...), 2.0)"), which
        // parseFloat can't parse, so it always silently fell back to a
        // fixed default. Mirroring the same clamp formula here guarantees
        // a real, live, resolved number on every resize.
        function getCassetteOpenScale() {
            const MIN_SCALE = 0.6;   // scale at 360px wide and narrower
            const MAX_SCALE = 2.0;   // scale at 1920px wide and wider
            const MIN_WIDTH = 360;
            const MAX_WIDTH = 1920;

            const width = window.innerWidth;
            const progress = (width - MIN_WIDTH) / (MAX_WIDTH - MIN_WIDTH);
            const clampedProgress = Math.min(Math.max(progress, 0), 1);

            return MIN_SCALE + clampedProgress * (MAX_SCALE - MIN_SCALE);
        }

        let isOpen = false;
        let currentSourceImg = null;
        let activeClone = null;

        function makeFixedClone(sourceImg) {
            const clone = sourceImg.cloneNode(true);
            clone.style.position = 'fixed';
            clone.style.margin = '0';
            clone.style.zIndex = 1200;
            clone.style.pointerEvents = 'none';
            // Outside .gallery-item, the img no longer matches `.gallery-item img`
            // styles. Re-apply fit rules so width/height boxes do not distort it.
            clone.style.display = 'block';
            clone.style.objectFit = 'contain';
            clone.style.transform = 'none';
            // cloneNode(true) copies the source's current inline style too —
            // and the source is hidden (opacity: 0) both right before this
            // runs on open, and still hidden from the open when this runs
            // again on close. Force the clone visible regardless.
            clone.style.opacity = '1';
            document.body.appendChild(clone);
            return clone;
        }

        function openCassette(sourceImg) {
            if (isOpen || activeClone) return;
            isOpen = true;
            galleryLocked = true;
            currentSourceImg = sourceImg;

            const startRect = sourceImg.getBoundingClientRect();
            const baseWidth = sourceImg.offsetWidth;
            const baseHeight = sourceImg.offsetHeight;
            sourceImg.style.opacity = '0';

            const clone = makeFixedClone(sourceImg);
            clone.style.top = startRect.top + 'px';
            clone.style.left = startRect.left + 'px';
            clone.style.width = startRect.width + 'px';
            clone.style.height = startRect.height + 'px';
            gsap.set(clone, { transformOrigin: '50% 50%', rotation: 0, scaleX: 1, scaleY: 1 });
            activeClone = clone;

            // Rotation is purely visual and never changes the box's own
            // width/height — those stay exactly as the source thumbnail's.
            // We only need the box's center (using its ORIGINAL, un-rotated
            // dimensions) to land on the target point; the 90deg spin then
            // makes it read as horizontal without ever resizing the box.
            const openScale = getCassetteOpenScale();
            const targetCenterX = window.innerWidth * getCassetteTargetLeftPct();
            const targetCenterY = window.innerHeight * getCassetteTargetTopPct();
            const targetTop = targetCenterY - baseHeight / 2;
            const targetLeft = targetCenterX - baseWidth / 2;

            gsap.to(clone, {
                top: targetTop,
                left: targetLeft,
                width: baseWidth,
                height: baseHeight,
                rotation: -90,
                scaleX: openScale,
                scaleY: openScale,
                duration: 0.7,
                ease: 'power3.inOut',
                onComplete: () => {
                    // Keep the rotated clone visible above the display layer
                    // while the cassette detail UI is open.
                    display1.classList.add('active');
                    gsap.fromTo(display1, { opacity: 0 }, { opacity: 1, duration: 0.3 });
                }
            });
        }

        function closeCassette() {
            if (!isOpen) return;
            isOpen = false;
            if (window.__resetFace1Carousel) window.__resetFace1Carousel();

            reverseCloneBack();

            gsap.to(display1, {
                opacity: 0,
                duration: 0.6,
                ease: 'power3.inOut',
                onComplete: () => {
                    display1.classList.remove('active');
                }
            });
        }

        function reverseCloneBack() {
            const sourceImg = currentSourceImg;
            if (!sourceImg) {
                galleryLocked = false;
                return;
            }

            // Recompute the thumbnail's *current* position/size — the
            // gallery may have kept easing after input stopped, so this
            // is where it actually settled, not where it was on open.
            const endRect = sourceImg.getBoundingClientRect();
            const baseWidth = sourceImg.offsetWidth;
            const baseHeight = sourceImg.offsetHeight;

            const openScale = getCassetteOpenScale();

            let clone = activeClone;
            if (!clone) {
                // Fallback: recreate the open-state clone if needed.
                const targetCenterX = window.innerWidth * getCassetteTargetLeftPct();
                const targetCenterY = window.innerHeight * getCassetteTargetTopPct();
                const openTop = targetCenterY - baseHeight / 2;
                const openLeft = targetCenterX - baseWidth / 2;

                clone = makeFixedClone(sourceImg);
                clone.style.top = openTop + 'px';
                clone.style.left = openLeft + 'px';
                clone.style.width = baseWidth + 'px';
                clone.style.height = baseHeight + 'px';
                gsap.set(clone, { transformOrigin: '50% 50%', rotation: -90, scaleX: 1, scaleY: 1 });
                activeClone = clone;
            }

            gsap.set(clone, { scaleX: openScale, scaleY: openScale });

            gsap.to(clone, {
                top: endRect.top,
                left: endRect.left,
                width: endRect.width,
                height: endRect.height,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                duration: 0.6,
                ease: 'power3.inOut',
                onComplete: () => {
                    clone.remove();
                    activeClone = null;
                    sourceImg.style.opacity = '1';
                    currentSourceImg = null;
                    galleryLocked = false;
                }
            });
        }

        // ★ FIX: keep the open clone synced while the window resizes.
        // GSAP never touches the clone again after openCassette()'s tween
        // finishes — without this, resizing the browser after opening left
        // the clone stranded at its old fixed-pixel spot while the CSS
        // layout reflowed underneath it, reading as "sliding right,
        // not scaling down." This snaps it (no animation) to the correct
        // live target on every resize while a cassette is open.
        function repositionOpenClone() {
            if (!isOpen || !activeClone || !currentSourceImg) return;

            const baseWidth = currentSourceImg.offsetWidth;
            const baseHeight = currentSourceImg.offsetHeight;
            const openScale = getCassetteOpenScale();
            const targetCenterX = window.innerWidth * getCassetteTargetLeftPct();
            const targetCenterY = window.innerHeight * getCassetteTargetTopPct();
            const targetTop = targetCenterY - baseHeight / 2;
            const targetLeft = targetCenterX - baseWidth / 2;

            // gsap.set, not .to — instant snap so it doesn't visibly slide
            // mid-resize, it just tracks the layout continuously.
            gsap.set(activeClone, {
                top: targetTop,
                left: targetLeft,
                width: baseWidth,
                height: baseHeight,
                scaleX: openScale,
                scaleY: openScale
            });
        }

        window.addEventListener('resize', repositionOpenClone);

        // Delegate on the gallery: catches the original AND every cloned
        // .cassette1 thumbnail from the before/after infinite-scroll sets.
        gallery.addEventListener('click', (event) => {
            if (dragMoved) return; // was a drag, not a tap
            if (galleryLocked) return;
            // .cassette1's img has pointer-events:none (so it doesn't
            // interfere with dragging), so event.target lands on the
            // .gallery-item wrapper, never the img itself — look it up
            // from there instead of via closest() on the target.
            const item = event.target.closest('.gallery-item');
            if (!item) return;
            const img = item.querySelector('.cassette1');
            if (!img) return;
            openCassette(img);
        });

        const exitBtn = document.querySelector('.button1-exit');
        if (exitBtn) {
            exitBtn.addEventListener('click', closeCassette);
        }
    })();
}

/* ============ CASSETTE 1: FACE CAROUSEL ============ */

(() => {
    const track = document.querySelector('#face1Track');
    if (!track) return;

    const realSlides = Array.from(track.children);
    if (!realSlides.length) return;

    const prevBtn = document.querySelector('.button1-previous');
    const nextBtn = document.querySelector('.button1-next');

    // Clone the first/last slide onto the opposite ends so there's always
    // a buffer slide to scroll into before we snap back — this is what
    // makes last -> first feel instant instead of reversing through all.
    let slides = realSlides;
    if (realSlides.length > 1) {
        const firstClone = realSlides[0].cloneNode(true);
        const lastClone = realSlides[realSlides.length - 1].cloneNode(true);
        track.insertBefore(lastClone, track.firstChild);
        track.appendChild(firstClone);
        slides = Array.from(track.children);
    }

    const hasBuffers = realSlides.length > 1;
    const firstRealIndex = hasBuffers ? 1 : 0;
    const lastRealIndex = hasBuffers ? slides.length - 2 : 0;

    let index = firstRealIndex;

    function loadVideo(slide) {
        if (!slide || slide.dataset.type !== 'video') return;
        if (slide.querySelector('iframe')) return; // already loaded

        const iframe = document.createElement('iframe');
        iframe.src = slide.dataset.src;
        iframe.title = 'Project video';
        iframe.frameBorder = '0';
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        slide.appendChild(iframe);
    }

    function unloadVideo(slide) {
        if (!slide || slide.dataset.type !== 'video') return;
        const iframe = slide.querySelector('iframe');
        if (iframe) iframe.remove(); // fully stops playback, not just pauses
    }

    function setTransform(instant) {
        track.style.transition = instant ? 'none' : 'transform 0.5s ease';
        track.style.transform = `translateX(-${index * 100}%)`;
    }

    function goTo(newIndex) {
        unloadVideo(slides[index]);
        index = newIndex;
        setTransform(false);

        // Don't preload video on a buffer slide — it's about to get
        // swapped out instantly by the transitionend snap-back below.
        const onBuffer = hasBuffers && (index === 0 || index === slides.length - 1);
        if (!onBuffer) loadVideo(slides[index]);
    }

    if (prevBtn) prevBtn.addEventListener('click', () => goTo(index - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goTo(index + 1));

    // After sliding onto a buffer clone, snap invisibly to the real slide
    // it's a copy of — no transition, so it reads as a seamless wrap.
    track.addEventListener('transitionend', () => {
        if (!hasBuffers) return;

        if (index === slides.length - 1) {
            index = firstRealIndex;
            setTransform(true);
            void track.offsetHeight; // force reflow so 'none' actually applies
            track.style.transition = 'transform 0.5s ease';
            loadVideo(slides[index]);
        } else if (index === 0) {
            index = lastRealIndex;
            setTransform(true);
            void track.offsetHeight;
            track.style.transition = 'transform 0.5s ease';
            loadVideo(slides[index]);
        }
    });

    setTransform(true);
    loadVideo(slides[index]);

    window.__resetFace1Carousel = () => {
        unloadVideo(slides[index]);
        index = firstRealIndex;
        setTransform(true);
        void track.offsetHeight;
        track.style.transition = 'transform 0.5s ease';
    };
})();


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



/* ============ DITHERED WAVE BACKGROUND ============ */

const container = document.querySelector("#dither-container");

if (container) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  container.appendChild(renderer.domElement);

  const settings = {
    waveSpeed: 0.02,
    waveFrequency: 3.0,
    waveAmplitude: 0.3,
    waveColor: new THREE.Color(0.5, 0.5, 0.5),
    colorNum: 4,
    pixelSize: 2,
    enableMouseInteraction: true,
    mouseRadius: 0.25,
  };

  const waveVertexShader = `
    precision highp float;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  const waveFragmentShader = `
    precision highp float;
    uniform vec2 resolution;
    uniform float time;
    uniform float waveSpeed;
    uniform float waveFrequency;
    uniform float waveAmplitude;
    uniform vec3 waveColor;
    uniform vec2 mousePos;
    uniform int enableMouseInteraction;
    uniform float mouseRadius;

    vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    vec2 fade(vec2 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

    float cnoise(vec2 P) {
      vec4 Pi = floor(P.xyxy) + vec4(0.0,0.0,1.0,1.0);
      vec4 Pf = fract(P.xyxy) - vec4(0.0,0.0,1.0,1.0);
      Pi = mod289(Pi);
      vec4 ix = Pi.xzxz;
      vec4 iy = Pi.yyww;
      vec4 fx = Pf.xzxz;
      vec4 fy = Pf.yyww;
      vec4 i = permute(permute(ix) + iy);
      vec4 gx = fract(i * (1.0/41.0)) * 2.0 - 1.0;
      vec4 gy = abs(gx) - 0.5;
      vec4 tx = floor(gx + 0.5);
      gx = gx - tx;
      vec2 g00 = vec2(gx.x, gy.x);
      vec2 g10 = vec2(gx.y, gy.y);
      vec2 g01 = vec2(gx.z, gy.z);
      vec2 g11 = vec2(gx.w, gy.w);
      vec4 norm = taylorInvSqrt(vec4(dot(g00,g00), dot(g01,g01), dot(g10,g10), dot(g11,g11)));
      g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
      float n00 = dot(g00, vec2(fx.x, fy.x));
      float n10 = dot(g10, vec2(fx.y, fy.y));
      float n01 = dot(g01, vec2(fx.z, fy.z));
      float n11 = dot(g11, vec2(fx.w, fy.w));
      vec2 fade_xy = fade(Pf.xy);
      vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
      return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
    }

    const int OCTAVES = 4;
    float fbm(vec2 p) {
      float value = 0.0;
      float amp = 1.0;
      float freq = waveFrequency;
      for (int i = 0; i < OCTAVES; i++) {
        value += amp * abs(cnoise(p));
        p *= freq;
        amp *= waveAmplitude;
      }
      return value;
    }

    float pattern(vec2 p) {
      vec2 p2 = p - time * waveSpeed;
      return fbm(p + fbm(p2));
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      uv -= 0.5;
      uv.x *= resolution.x / resolution.y;
      float f = pattern(uv);
      if (enableMouseInteraction == 1) {
        vec2 mouseNDC = (mousePos / resolution - 0.5);
        mouseNDC.x *= resolution.x / resolution.y;
        float dist = length(uv - mouseNDC);
        float effect = 1.0 - smoothstep(0.0, mouseRadius, dist);
        f -= 0.5 * effect;
      }
      vec3 col = mix(vec3(0.0), waveColor, f);
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const waveUniforms = {
    time: { value: 0 },
    resolution: { value: new THREE.Vector2() },
    waveSpeed: { value: settings.waveSpeed },
    waveFrequency: { value: settings.waveFrequency },
    waveAmplitude: { value: settings.waveAmplitude },
    waveColor: { value: settings.waveColor },
    mousePos: { value: new THREE.Vector2() },
    enableMouseInteraction: { value: settings.enableMouseInteraction ? 1 : 0 },
    mouseRadius: { value: settings.mouseRadius }
  };

  const waveMaterial = new THREE.ShaderMaterial({
    vertexShader: waveVertexShader,
    fragmentShader: waveFragmentShader,
    uniforms: waveUniforms
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const waveMesh = new THREE.Mesh(geometry, waveMaterial);
  scene.add(waveMesh);

  // Bayer matrix passed in as a uniform array (legal in GLSL ES 1.00),
  // instead of a float[64](...) array-constructor (GLSL ES 3.00 only —
  // that's why this silently failed to compile before).
  const bayerMatrixValues = [
    0.0, 48.0, 12.0, 60.0, 3.0, 51.0, 15.0, 63.0,
    32.0, 16.0, 44.0, 28.0, 35.0, 19.0, 47.0, 31.0,
    8.0, 56.0, 4.0, 52.0, 11.0, 59.0, 7.0, 55.0,
    40.0, 24.0, 36.0, 20.0, 43.0, 27.0, 39.0, 23.0,
    2.0, 50.0, 14.0, 62.0, 1.0, 49.0, 13.0, 61.0,
    34.0, 18.0, 46.0, 30.0, 33.0, 17.0, 45.0, 29.0,
    10.0, 58.0, 6.0, 54.0, 9.0, 57.0, 5.0, 53.0,
    42.0, 26.0, 38.0, 22.0, 41.0, 25.0, 37.0, 21.0
  ];

  const ditherFragmentShader = `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float colorNum;
    uniform float pixelSize;
    uniform float bayerMatrix[64];

    vec3 dither(vec2 uv, vec3 color) {
      vec2 scaledCoord = floor(uv * resolution / pixelSize);
      int x = int(mod(scaledCoord.x, 8.0));
      int y = int(mod(scaledCoord.y, 8.0));
      float threshold = bayerMatrix[y * 8 + x] / 64.0 - 0.25;
      float step = 1.0 / (colorNum - 1.0);
      color += threshold * step;
      float bias = 0.2;
      color = clamp(color - bias, 0.0, 1.0);
      return floor(color * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
    }

    void main() {
      vec2 uvPixel = floor(gl_FragCoord.xy / pixelSize) * pixelSize / resolution;
      vec4 color = texture2D(tDiffuse, uvPixel);
      color.rgb = dither(gl_FragCoord.xy / resolution, color.rgb);
      gl_FragColor = color;
    }
  `;

  let renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat
  });

  const ditherMaterial = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: ditherFragmentShader,
    uniforms: {
      tDiffuse: { value: renderTarget.texture },
      resolution: { value: new THREE.Vector2() },
      colorNum: { value: settings.colorNum },
      pixelSize: { value: settings.pixelSize },
      bayerMatrix: { value: bayerMatrixValues }
    }
  });

  const ditherScene = new THREE.Scene();
  const ditherMesh = new THREE.Mesh(geometry, ditherMaterial);
  ditherScene.add(ditherMesh);

  // Fixed pixel ratio so mouse coords and render resolution always agree
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);

  const mouse = new THREE.Vector2();
  let mouseActive = false;

  window.addEventListener("pointermove", (event) => {
    const rect = container.getBoundingClientRect();
    mouse.set(
      (event.clientX - rect.left) * DPR,
      (rect.height - (event.clientY - rect.top)) * DPR
    );
    mouseActive = true;
    // console.log("mouse", mouse.x, mouse.y); // uncomment to confirm events are firing
  });

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    const pixelWidth = Math.floor(width * DPR);
    const pixelHeight = Math.floor(height * DPR);
    renderTarget.setSize(pixelWidth, pixelHeight);
    waveUniforms.resolution.value.set(pixelWidth, pixelHeight);
    ditherMaterial.uniforms.resolution.value.set(pixelWidth, pixelHeight);
  }
  window.addEventListener("resize", resize);
  resize();

  const clock = new THREE.Clock();
    function animate() {
    requestAnimationFrame(animate);
    waveUniforms.time.value = clock.getElapsedTime();
    if (mouseActive) waveUniforms.mousePos.value.copy(mouse);

    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);

    renderer.setRenderTarget(null);
    renderer.render(ditherScene, camera);
  }
  animate();
}