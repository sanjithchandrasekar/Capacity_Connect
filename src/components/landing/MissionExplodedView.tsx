import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'framer-motion';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export interface MissionExplodedViewProps {
  /** Optional custom section ID for anchor navigation */
  id?: string;
  /** Optional className for outer section container */
  className?: string;
}

interface MissionPhase {
  id: string;
  headlinePrefix: string;
  headlineHighlight: string;
  highlightGradient: string;
  subtext: string;
}

const PHASES: MissionPhase[] = [
  {
    id: 'phase-1',
    headlinePrefix: "Strengthening India's Meteorological Readiness for a ",
    headlineHighlight: 'Changing Climate',
    highlightGradient: 'from-cyan-400 via-sky-300 to-amber-400',
    subtext:
      'One platform, every skill IMD and MoES need — cyclone tracking, monsoon forecasting, seismology, ocean observation — built for the people doing the actual work.',
  },
  {
    id: 'phase-2',
    headlinePrefix: 'Explore Layer-by-Layer Sensor & Payload Diagnostics in ',
    headlineHighlight: 'Interactive 3D',
    highlightGradient: 'from-cyan-400 via-sky-300 to-blue-400',
    subtext:
      'Dissect solar arrays, Doppler radar modules, and telemetry transponders in simulated labs — master internal mechanics before live station deployment.',
  },
  {
    id: 'phase-3',
    headlinePrefix: 'Real-Time Orbital Telemetry to ',
    headlineHighlight: 'Ground Command',
    highlightGradient: 'from-amber-400 via-orange-400 to-amber-300',
    subtext:
      'Seamlessly connect orbital feeds to 500+ AWS calibration nodes, Doppler radar arrays, and numerical prediction supercomputers across India.',
  },
];

export function MissionExplodedView({
  id = 'mission-section',
  className = '',
}: MissionExplodedViewProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const pinWrapperRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [activePhaseIdx, setActivePhaseIdx] = useState(0);
  const activePhaseRef = useRef(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Check for prefers-reduced-motion only
  useEffect(() => {
    const checkMotion = () => {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setIsReducedMotion(prefersReduced);
    };

    checkMotion();
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', checkMotion);
    return () => mediaQuery.removeEventListener('change', checkMotion);
  }, []);

  // Handle video metadata loading
  const handleLoadedMetadata = () => {
    setIsVideoLoaded(true);
    ScrollTrigger.refresh();
  };

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      if (video.readyState >= 1) {
        setIsVideoLoaded(true);
        ScrollTrigger.refresh();
      }
      // Prime video for mobile scrub
      video.currentTime = 0.001;
    }
  }, []);

  // GSAP ScrollTrigger Animations
  useEffect(() => {
    const section = sectionRef.current;
    const pinWrapper = pinWrapperRef.current;
    const video = videoRef.current;

    if (!section || !pinWrapper) return;

    // Clean up any stale ScrollTriggers for these specific elements
    ScrollTrigger.getAll().forEach((st) => {
      if (st.trigger === section || st.trigger === pinWrapper) {
        st.kill(true);
      }
    });

    const ctx = gsap.context(() => {
      if (!isReducedMotion) {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        let rafId: number | null = null;

        // Master ScrollTrigger Timeline pinned for smooth, natural scroll speed
        ScrollTrigger.create({
          trigger: section,
          pin: pinWrapper,
          pinSpacing: true,
          start: 'top top',
          end: () => (isMobile ? '+=180%' : '+=260%'),
          scrub: isMobile ? 0.4 : 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const p = self.progress;

            // Throttled RAF video time sync to eliminate stutter on mobile / laptops
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
              if (video && video.duration && !isNaN(video.duration)) {
                const targetTime = p * video.duration;
                if (Math.abs(video.currentTime - targetTime) > 0.02) {
                  video.currentTime = targetTime;
                }
              }
            });

            // Dynamically calculate and transition active phase
            let nextPhase = 0;
            if (p >= 0.65) {
              nextPhase = 2;
            } else if (p >= 0.32) {
              nextPhase = 1;
            } else {
              nextPhase = 0;
            }

            if (activePhaseRef.current !== nextPhase) {
              activePhaseRef.current = nextPhase;
              setActivePhaseIdx(nextPhase);
            }
          },
        });
      } else if (video && isReducedMotion) {
        // Reduced-motion fallback only: show all sequentially or autoplay video
        ScrollTrigger.create({
          trigger: section,
          start: 'top 70%',
          end: 'bottom 20%',
          onEnter: () => video.play().catch(() => {}),
          onLeave: () => video.pause(),
          onEnterBack: () => video.play().catch(() => {}),
          onLeaveBack: () => video.pause(),
        });
      }
    }, section);

    // Refresh ScrollTrigger after DOM has settled
    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 200);

    const handleWindowLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', handleWindowLoad);

    return () => {
      clearTimeout(refreshTimer);
      window.removeEventListener('load', handleWindowLoad);
      ctx.revert();
    };
  }, [isVideoLoaded, isReducedMotion]);

  const currentPhase = PHASES[activePhaseIdx] || PHASES[0];

  return (
    <section
      id={id}
      ref={sectionRef}
      className={`relative w-full bg-[#030712] text-white ${className}`}
    >
      {/* Pinned Viewport Container */}
      <div
        ref={pinWrapperRef}
        className="relative w-full h-[100dvh] min-h-[620px] overflow-hidden flex items-center justify-center bg-[#030712]"
      >
        {/* ======================================================================= */}
        {/* VIDEO LAYER: Enhanced Brightness, Clarity, and Full Visibility          */}
        {/* ======================================================================= */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-[#030712]">
          <video
            ref={videoRef}
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
            className={`w-full h-full object-cover object-center brightness-[0.95] contrast-[1.10] saturate-[1.15] transition-opacity duration-700 ${
              isVideoLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <source
              src="/home%20page/i_dont_want_the_blue_lines_com%20(1).mp4"
              type="video/mp4"
            />
            <source
              src="/home page/i_dont_want_the_blue_lines_com (1).mp4"
              type="video/mp4"
            />
          </video>

          {/* Seamless section transition edge fades matching space obsidian #030712 */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#030712] to-transparent pointer-events-none z-10" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#030712] to-transparent pointer-events-none z-10" />
        </div>

        {/* Ambient atmospheric backdrop glow behind floating text */}
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          <div className="w-[600px] h-[350px] bg-cyan-500/10 rounded-full blur-[120px] opacity-70" />
        </div>

        {/* ======================================================================= */}
        {/* CONTENT LAYER: Seamless Framer Motion Phase Transitions on Scroll       */}
        {/* ======================================================================= */}
        <div className="relative z-30 max-w-5xl mx-auto px-6 sm:px-8 w-full flex items-center justify-center my-auto pointer-events-none">
          <div className="relative w-full flex items-center justify-center min-h-[260px] sm:min-h-[300px] overflow-visible">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPhase.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="w-full flex flex-col items-center justify-center text-center max-w-4xl mx-auto px-4"
              >
                <div className="flex flex-col items-center max-w-3xl mx-auto">
                  {/* Headline - Pure Floating Typography with Atmospheric Palette */}
                  <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold font-display text-white tracking-[-0.03em] leading-[1.15] mb-5 drop-shadow-[0_4px_30px_rgba(0,0,0,0.98)]">
                    {currentPhase.headlinePrefix}
                    <span className={`text-transparent bg-clip-text bg-gradient-to-r ${currentPhase.highlightGradient} drop-shadow-none`}>
                      {currentPhase.headlineHighlight}
                    </span>
                  </h2>

                  {/* Subtext - Floating directly with high contrast titanium slate tone */}
                  <p className="text-slate-100 text-sm sm:text-base md:text-xl leading-relaxed font-normal max-w-2xl mx-auto drop-shadow-[0_2px_16px_rgba(0,0,0,0.98)]">
                    {currentPhase.subtext}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
