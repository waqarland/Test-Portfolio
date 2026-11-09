/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import {
  mapPointerToClipTime,
  calculateIdleTargetTime,
  easeValue,
} from './utils/math.ts';

const PLATE_IMAGE_URL =
  'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/a194141a-44ba-44bb-8372-e6720af994ca.jpg';
const CLIP_VIDEO_URL =
  'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/e1b48476-24ab-456a-bb12-13e63bc60973.mp4';
const HELMET_IMAGE_URL =
  'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/e8c78660-4497-41b9-82ae-a4738a5edd11.jpg';

export default function App() {
  const [isHelmetOn, setIsHelmetOn] = useState(false);
  const [isClipReady, setIsClipReady] = useState(false);

  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const helmetRef = useRef<HTMLImageElement>(null);
  const pushBtnRef = useRef<HTMLButtonElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);

  const logoRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const captionLeftRef = useRef<HTMLDivElement>(null);
  const captionRightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;

    const frameEl = frameRef.current;
    const videoEl = videoRef.current;
    const pushBtnEl = pushBtnRef.current;
    const cursorDot = cursorDotRef.current;
    const cursorRing = cursorRingRef.current;

    // Tracking state in refs/closure variables for 60fps RAF loop
    let clipDuration = 5.04;
    let targetTime = 2.52;
    let shownTime = 2.52;
    let isSeeking = false;
    let hasFirstSought = false;
    let lastMoveTime = performance.now();
    let seekWatchdog = 0;

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let cursorActive = false;
    let blobUrl: string | null = null;

    // 1. Video Loading via Blob Object URL for instant seek
    if (!prefersReducedMotion && videoEl) {
      fetch(CLIP_VIDEO_URL)
        .then((res) => {
          if (!res.ok) throw new Error('Blob fetch failed');
          return res.blob();
        })
        .then((blob) => {
          blobUrl = URL.createObjectURL(blob);
          videoEl.src = blobUrl;
          videoEl.load();
        })
        .catch((err) => {
          console.warn('Fallback to direct stream:', err);
          videoEl.src = CLIP_VIDEO_URL;
          videoEl.load();
        });

      const onLoadedMetadata = () => {
        if (videoEl.duration && !isNaN(videoEl.duration)) {
          clipDuration = videoEl.duration;
        }
        targetTime = clipDuration * 0.5;
        shownTime = targetTime;
        try {
          videoEl.currentTime = shownTime;
        } catch {}
      };

      const onSeeking = () => {
        isSeeking = true;
      };

      const onSeeked = () => {
        isSeeking = false;
        seekWatchdog = 0;
        if (!hasFirstSought) {
          hasFirstSought = true;
          setIsClipReady(true);
        }
      };

      videoEl.addEventListener('loadedmetadata', onLoadedMetadata);
      videoEl.addEventListener('seeking', onSeeking);
      videoEl.addEventListener('seeked', onSeeked);
    }

    // 2. Pointer Tracking
    const updatePointerCoord = (clientX: number) => {
      lastMoveTime = performance.now();
      if (prefersReducedMotion || !frameEl) return;

      const rect = frameEl.getBoundingClientRect();
      targetTime = mapPointerToClipTime(
        clientX,
        rect.left,
        rect.width,
        clipDuration
      );
    };

    const onPointerMove = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!cursorActive && isFinePointer && cursorDot && cursorRing) {
        cursorActive = true;
        ringX = mouseX;
        ringY = mouseY;
        cursorDot.style.opacity = '1';
        cursorRing.style.opacity = '1';
      }
      updatePointerCoord(e.clientX);
    };

    const onPointerLeave = () => {
      if (isFinePointer && cursorDot && cursorRing) {
        cursorActive = false;
        cursorDot.style.opacity = '0';
        cursorRing.style.opacity = '0';
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        updatePointerCoord(e.touches[0].clientX);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    // Cursor hover enhancement
    if (isFinePointer && cursorRing) {
      const interactiveElements = [pushBtnEl, menuRef.current, logoRef.current];
      interactiveElements.forEach((el) => {
        if (!el) return;
        el.addEventListener('pointerenter', () =>
          cursorRing.classList.add('cursor-hover')
        );
        el.addEventListener('pointerleave', () =>
          cursorRing.classList.remove('cursor-hover')
        );
      });
    }

    // 3. Animation Frame Loop
    let animId: number;
    const render = (now: number) => {
      if (!prefersReducedMotion && videoEl && clipDuration > 0) {
        const idleTime = now - lastMoveTime;
        if (idleTime > 3500) {
          targetTime = calculateIdleTargetTime(idleTime, clipDuration);
        }

        shownTime = easeValue(shownTime, targetTime, 0.14);

        if (isSeeking) {
          seekWatchdog++;
          if (seekWatchdog > 18) {
            isSeeking = false;
            seekWatchdog = 0;
          }
        }

        if (
          !isSeeking &&
          !videoEl.seeking &&
          Math.abs(videoEl.currentTime - shownTime) > 0.015
        ) {
          try {
            videoEl.currentTime = shownTime;
          } catch {}
        }
      }

      if (isFinePointer && cursorActive && cursorDot && cursorRing) {
        ringX = easeValue(ringX, mouseX, 0.55);
        ringY = easeValue(ringY, mouseY, 0.55);

        cursorDot.style.transform = `translate3d(${mouseX - 3.5}px, ${
          mouseY - 3.5
        }px, 0)`;
        cursorRing.style.transform = `translate3d(${ringX - 22}px, ${
          ringY - 22
        }px, 0)`;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    // 4. Entrance Timeline (~1.8s) via Web Animations API
    if (!prefersReducedMotion) {
      if (logoRef.current) {
        logoRef.current.animate(
          [
            { transform: 'translateY(-35px)', opacity: 0 },
            { transform: 'translateY(0)', opacity: 1 },
          ],
          {
            duration: 700,
            delay: 40,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'both',
          }
        );
      }

      if (menuRef.current) {
        menuRef.current.animate(
          [
            { transform: 'translateY(-35px)', opacity: 0 },
            { transform: 'translateY(0)', opacity: 1 },
          ],
          {
            duration: 700,
            delay: 90,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'both',
          }
        );
      }

      if (eyebrowRef.current) {
        eyebrowRef.current.animate(
          [
            {
              letterSpacing: '0.9em',
              textIndent: '0.9em',
              opacity: 0,
              transform: 'translateY(-12px)',
            },
            {
              letterSpacing: '0.46em',
              textIndent: '0.46em',
              opacity: 1,
              transform: 'translateY(0)',
            },
          ],
          {
            duration: 850,
            delay: 220,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'both',
          }
        );
      }

      if (headlineRef.current) {
        headlineRef.current.animate(
          [
            { filter: 'blur(14px)', transform: 'translateY(36px)', opacity: 0 },
            { filter: 'blur(0px)', transform: 'translateY(0)', opacity: 1 },
          ],
          {
            duration: 950,
            delay: 360,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'both',
          }
        );
      }

      if (subtitleRef.current) {
        subtitleRef.current.animate(
          [
            { transform: 'translateY(20px)', opacity: 0 },
            { transform: 'translateY(0)', opacity: 1 },
          ],
          {
            duration: 750,
            delay: 660,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'both',
          }
        );
      }

      const captions = [captionLeftRef.current, captionRightRef.current];
      captions.forEach((el, index) => {
        if (!el) return;
        el.animate(
          [
            { opacity: 0, transform: 'translateY(16px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          {
            duration: 650,
            delay: 840 + index * 100,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'both',
          }
        );
      });

      if (pushBtnRef.current) {
        pushBtnRef.current.animate(
          [
            { transform: 'scale(0)', opacity: 0 },
            { transform: 'scale(1)', opacity: 1 },
          ],
          {
            duration: 680,
            delay: 1100,
            easing: 'cubic-bezier(0.34, 1.45, 0.64, 1)',
            fill: 'both',
          }
        );
      }
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('touchmove', onTouchMove);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, []);

  const handlePushClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (pushBtnRef.current) {
      pushBtnRef.current.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(0.88)', offset: 0.4 },
          { transform: 'scale(1)' },
        ],
        {
          duration: 320,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        }
      );
    }
    setIsHelmetOn((prev) => !prev);
  };

  return (
    <>
      {/* Custom pointer elements */}
      <div
        ref={cursorDotRef}
        className="cursor-dot"
        aria-hidden="true"
        data-testid="cursor-dot"
      />
      <div
        ref={cursorRingRef}
        className="cursor-ring"
        aria-hidden="true"
        data-testid="cursor-ring"
      />

      <main className="stage" id="stage" data-testid="stage">
        <div ref={frameRef} className="frame" id="frame">
          {/* Background Plate */}
          <img
            className="plate"
            src={PLATE_IMAGE_URL}
            alt="Cadet"
            width={1920}
            height={1080}
            draggable={false}
          />

          {/* Head-turn Video Clip */}
          <video
            ref={videoRef}
            className={`head-clip ${isClipReady ? 'ready' : ''}`}
            id="headClip"
            muted
            playsInline
            preload="auto"
            draggable={false}
            data-testid="head-clip"
          />

          {/* Glass Bubble Helmet Overlay */}
          <img
            ref={helmetRef}
            className={`helmet ${isHelmetOn ? 'active' : ''}`}
            id="helmet"
            src={HELMET_IMAGE_URL}
            alt="Glass Space Helmet"
            width={960}
            height={958}
            draggable={false}
            data-testid="space-helmet"
          />

          {/* PUSH ME Interactive Button */}
          <button
            ref={pushBtnRef}
            type="button"
            className={`push-btn ${isHelmetOn ? 'active' : ''}`}
            id="pushBtn"
            aria-pressed={isHelmetOn}
            aria-label="Toggle Space Helmet"
            onClick={handlePushClick}
            data-testid="push-me-btn"
          >
            <span>
              PUSH
              <br />
              ME
            </span>
          </button>

          {/* Header Elements */}
          <div ref={logoRef} className="logo" id="logo">
            <div className="logo-disc" aria-hidden="true" />
            <span className="logo-text">Lumora</span>
          </div>

          <button
            ref={menuRef}
            type="button"
            className="menu"
            id="menu"
            aria-label="Open Navigation Menu"
          >
            <span className="menu-bar" />
            <span className="menu-bar" />
            <span className="menu-bar" />
          </button>

          {/* Center Copy Block */}
          <div className="copy-block" id="copyBlock">
            <div ref={eyebrowRef} className="eyebrow" id="eyebrow">
              CADET
            </div>
            <h1 ref={headlineRef} className="headline" id="headline">
              Waqar X AI
            </h1>
            <p ref={subtitleRef} className="subtitle" id="subtitle">
              Past the Stars and Further
            </p>
          </div>

          {/* Footer Captions */}
          <div
            ref={captionLeftRef}
            className="caption caption-left"
            id="captionLeft"
          >
            3D Interaction
          </div>
          <div
            ref={captionRightRef}
            className="caption caption-right"
            id="captionRight"
          >
            @studio.design
          </div>
        </div>
      </main>
    </>
  );
}
