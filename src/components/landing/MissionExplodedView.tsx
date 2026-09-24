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

  // Check for prefers-reduced-motion
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
      video.currentTime = 0.001;
    }
  }, []);

  // Smooth ScrollTrigger & video seeking
  useEffect(() => {
    const section = sectionRef.current;
    const pinWrapper = pinWrapperRef.current;
    const video = videoRef.current;

    if (!section || !pinWrapper) return;

    ScrollTrigger.getAll().forEach((st) => {
      if (st.trigger === section || st.trigger === pinWrapper) {
        st.kill(true);
      }
    });

    let targetProgress = 0;
    let currentProgress = 0;
    let isSeeking = false;
    let isRunning = true;

    const onSeeked = () => {
      isSeeking = false;
    };

    if (video) {
      video.addEventListener('seeked', onSeeked);
    }

    const ticker = () => {
      if (!isRunning || !video || isNaN(video.duration) || video.duration <= 0) return;

      const diff = targetProgress - currentProgress;
      if (Math.abs(diff) > 0.001) {
        currentProgress += diff * 0.15;
        const targetTime = currentProgress * video.duration;

        if (!isSeeking && Math.abs(video.currentTime - targetTime) > 0.02) {
          isSeeking = true;
          try {
            if ('fastSeek' in video && typeof (video as any).fastSeek === 'function') {
              (video as any).fastSeek(targetTime);
            } else {
              video.currentTime = targetTime;
            }
          } catch {
            video.currentTime = targetTime;
            isSeeking = false;
          }
        }
      }
    };

    gsap.ticker.add(ticker);

    const ctx = gsap.context(() => {
      if (!isReducedMotion) {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

        ScrollTrigger.create({
          trigger: section,
          pin: pinWrapper,
          pinSpacing: true,
          start: 'top top',
          end: () => (isMobile ? '+=180%' : '+=220%'),
          scrub: isMobile ? 0.4 : 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const p = self.progress;
            targetProgress = p;

            let nextPhase = 0;
            if (p >= 0.66) {
              nextPhase = 2;
            } else if (p >= 0.33) {
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

    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 200);

    const handleWindowLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', handleWindowLoad);

    return () => {
      isRunning = false;
      gsap.ticker.remove(ticker);
      if (video) {
        video.removeEventListener('seeked', onSeeked);
      }
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
        className="relative w-full h-[100dvh] min-h-[600px] overflow-hidden flex items-center justify-center bg-[#030712]"
      >
        {/* ======================================================================= */}
        {/* VIDEO LAYER: Clear, Bright, Edge Softening Only                         */}
        {/* ======================================================================= */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-[#030712]">
          <video
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
            onLoadedMetadata={handleLoadedMetadata}
            className={`w-full h-full object-cover object-center brightness-[0.98] contrast-[1.05] saturate-[1.1] transition-opacity duration-700 ${
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

          {/* Minimal top and bottom boundary blend */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#030712] to-transparent pointer-events-none z-10" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#030712] to-transparent pointer-events-none z-10" />
        </div>

        {/* Ambient atmospheric backdrop glow behind floating text */}
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          <div className="w-[500px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px] opacity-60" />
        </div>

        {/* ======================================================================= */}
        {/* CONTENT LAYER: Pure Centered Floating Typography                        */}
        {/* ======================================================================= */}
        <div className="relative z-30 max-w-4xl mx-auto px-6 sm:px-8 w-full flex items-center justify-center pointer-events-none">
          <div className="relative w-full flex items-center justify-center min-h-[220px] overflow-visible">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPhase.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="w-full flex flex-col items-center justify-center text-center px-4"
              >
                <div className="flex flex-col items-center max-w-3xl mx-auto">
                  {/* Headline - Pure Floating Typography with Atmospheric Palette */}
                  <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold font-display text-white tracking-[-0.03em] leading-[1.15] mb-4 drop-shadow-[0_4px_30px_rgba(0,0,0,0.98)]">
                    {currentPhase.headlinePrefix}
                    <span
                      className={`text-transparent bg-clip-text bg-gradient-to-r ${currentPhase.highlightGradient} drop-shadow-none`}
                    >
                      {currentPhase.headlineHighlight}
                    </span>
                  </h2>

                  {/* Subtext - Crisp high-contrast titanium tone */}
                  <p className="text-slate-100 text-sm sm:text-base md:text-lg leading-relaxed font-normal max-w-2xl mx-auto drop-shadow-[0_2px_16px_rgba(0,0,0,0.98)]">
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

