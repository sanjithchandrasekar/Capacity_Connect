import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Lock, Zap, Globe, Radio, Cpu, Activity } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface Step {
  id: string;
  stepNum: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  imageAlt: string;
  imagePosition?: string;
  icon: React.ElementType;
  highlights: { title: string; desc: string; icon: React.ElementType }[];
  metrics: { label: string; value: string };
  badgeColor: string;
  glowColor: string;
}

const steps: Step[] = [
  {
    id: 'step-1',
    stepNum: '01',
    badge: 'Real-Time Learning & Security',
    title: 'Secure, Real-Time Learning Environment',
    subtitle: 'Practice on live-feeling telemetry safely with strict role separation.',
    description:
      'Interactive capacity building modules stream realistic satellite and radar telemetry into simulated forecasting labs with granular role-based access.',
    image: '/home page/feature-earth-orbit.webp',
    imageAlt: 'High-resolution space view of Earth with atmospheric clouds and satellite orbit',
    imagePosition: 'object-top',
    icon: Lock,
    highlights: [
      {
        title: 'Secure & Role-Based Access',
        desc: 'Access locked strictly to your operational station and division.',
        icon: Lock,
      },
      {
        title: 'Real-Time Telemetry Labs',
        desc: 'Instant feedback simulations and live Doppler radar streams.',
        icon: Zap,
      },
    ],
    metrics: { label: 'Security Level', value: 'RLS Enforced' },
    badgeColor: 'border-cyan-500/30 text-cyan-300 bg-cyan-950/60',
    glowColor: 'rgba(6, 182, 212, 0.25)',
  },
  {
    id: 'step-2',
    stepNum: '02',
    badge: 'Field Ops & Regional Network',
    title: 'Pan-India Observational & Field Operations Training',
    subtitle: "One unified training standard for India's entire observation grid.",
    description:
      'Engineered for meteorologists and technical officers maintaining India’s weather network. Master AWS sensor calibration, Doppler radar diagnostics, and standard reporting.',
    image: '/home page/feature-ground-station.webp',
    imageAlt: 'Meteorological ground station and telescope tracking system under night sky',
    icon: Radio,
    highlights: [
      {
        title: 'Observational Ground Ops',
        desc: 'Interactive guides for AWS sensor calibration and field telemetry.',
        icon: Radio,
      },
      {
        title: 'Multi-Regional Network',
        desc: 'New Delhi, Mumbai, Chennai, Kolkata, Guwahati — unified and synchronized.',
        icon: Globe,
      },
    ],
    metrics: { label: 'Regional Coverage', value: 'Pan-India RMCs' },
    badgeColor: 'border-sky-500/30 text-sky-300 bg-sky-950/60',
    glowColor: 'rgba(56, 189, 248, 0.25)',
  },
  {
    id: 'step-3',
    stepNum: '03',
    badge: 'AI Analytics & Compliance',
    title: 'AI Competency Engine & Standards Compliance',
    subtitle: 'Adaptive learning paths built around official MoES and WMO benchmarks.',
    description:
      'Diagnostic AI assessments map technical proficiency against Ministry benchmarks, delivering tailored modules for cyclone tracking and climate modeling.',
    image: '/home page/feature-satellite-orbit.webp',
    imageAlt: 'Detailed rendering of Earth with glowing orbital satellites and solar panels',
    icon: Cpu,
    highlights: [
      {
        title: 'AI Competency Engine',
        desc: 'Targeted skill-gap closure customized for your operational track.',
        icon: Cpu,
      },
      {
        title: 'MoES & IMD Compliant',
        desc: 'Every certificate maps directly to national meteorological standards.',
        icon: Globe,
      },
    ],
    metrics: { label: 'Compliance Standard', value: 'MoES & WMO' },
    badgeColor: 'border-amber-500/30 text-amber-300 bg-amber-950/60',
    glowColor: 'rgba(245, 158, 11, 0.25)',
  },
];

export function StickyScrollFeatures() {
  const containerRef = useRef<HTMLElement | null>(null);
  const pinWrapperRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Kill any existing ScrollTrigger instances on this trigger to prevent duplicate pin-spacers
    ScrollTrigger.getAll().forEach((st) => {
      if (st.trigger === containerRef.current || st.trigger === pinWrapperRef.current) {
        st.kill(true);
      }
    });

    const ctx = gsap.context(() => {
      if (!trackRef.current || !pinWrapperRef.current || !containerRef.current) return;

      const panelsCount = steps.length;
      // Total horizontal shift to reveal the last panel: (panelsCount - 1) / panelsCount * 100%
      const totalXPercent = -((panelsCount - 1) / panelsCount) * 100;
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const getScrollDistance = () => (isMobile ? window.innerHeight * 1.4 : window.innerHeight * 2.0);

      gsap.to(trackRef.current, {
        xPercent: totalXPercent,
        ease: 'none',
        force3D: true,
        scrollTrigger: {
          trigger: containerRef.current,
          pin: pinWrapperRef.current,
          scrub: isMobile ? 0.4 : 0.6,
          start: 'top top',
          end: () => `+=${getScrollDistance()}`,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
    }, containerRef);

    const refreshHandler = () => ScrollTrigger.refresh();
    window.addEventListener('resize', refreshHandler);

    return () => {
      window.removeEventListener('resize', refreshHandler);
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === containerRef.current || st.trigger === pinWrapperRef.current) {
          st.kill(true);
        }
      });
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="sticky-features"
      ref={containerRef}
      className="relative w-full bg-[#040814] text-white border-t border-cyan-500/20"
    >
      <div
        ref={pinWrapperRef}
        className="pin-wrapper relative w-full overflow-hidden h-[100dvh] max-h-[100dvh] min-h-[580px] flex flex-col justify-between"
      >
      {/* Decorative ambient atmospheric nebula glows */}
      <div className="pointer-events-none absolute top-1/4 -left-64 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[150px]" />
      <div className="pointer-events-none absolute bottom-1/4 -right-64 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[150px]" />

      {/* Persistent Section Header */}
      <div className="pt-24 sm:pt-28 md:pt-32 pb-2 px-4 sm:px-6 max-w-7xl mx-auto w-full text-center relative z-20 shrink-0">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-[10px] sm:text-xs font-semibold tracking-wider uppercase mb-2 shadow-lg shadow-cyan-950/50">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          Core Platform Architecture
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold font-display tracking-tight text-white mb-1.5 leading-tight">
          From Orbital Telemetry to{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400">
            Ground-Level Preparedness
          </span>
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm max-w-2xl mx-auto line-clamp-1">
          Built to meet the real demands of MoES field teams — from live telemetry streams to remote mountain outposts.
        </p>
      </div>

      {/* Horizontal Scroll Panels Track */}
      <div
        ref={trackRef}
        style={{ willChange: 'transform', transform: 'translateZ(0)' }}
        className="pin-track flex flex-row w-[300%] h-full items-center z-10 flex-1 min-h-0 py-1 overflow-hidden will-change-transform"
      >
        {steps.map((step, idx) => {
          const isEven = idx % 2 === 1;

          return (
            <div
              key={step.id}
              className="pin-panel w-[33.333333%] px-3 sm:px-6 md:px-8 lg:px-12 xl:px-16 flex items-center justify-center shrink-0 h-full max-h-full"
            >
              {/* MOBILE LAYOUT (< md) */}
              <div className="block md:hidden w-full max-w-sm mx-auto my-auto">
                <div className="p-3 sm:p-4 rounded-3xl bg-[#081022]/90 border border-cyan-500/20 backdrop-blur-xl shadow-2xl shadow-cyan-950/80 relative overflow-hidden flex flex-col gap-2">
                  <div
                    className="absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-40"
                    style={{ backgroundColor: step.glowColor }}
                  />

                  {/* Top Image Banner */}
                  <div className="relative w-full aspect-[2.2/1] rounded-2xl overflow-hidden bg-slate-900 border border-cyan-500/20 shadow-inner shrink-0">
                    <img
                      src={step.image}
                      alt={step.imageAlt}
                      className={`w-full h-full object-cover ${step.imagePosition || 'object-center'}`}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#081022]/80 via-transparent to-transparent pointer-events-none" />
                  </div>

                  {/* Text Details */}
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-bold font-display text-white tracking-tight leading-snug">
                      {step.title}
                    </h3>
                    <p className="text-cyan-400 text-[10px] sm:text-[11px] font-semibold leading-tight">
                      {step.subtitle}
                    </p>
                    <p className="text-slate-300 text-[10px] sm:text-[11px] leading-relaxed line-clamp-2 font-normal">
                      {step.description}
                    </p>
                  </div>

                  {/* Highlights Pill List */}
                  <div className="space-y-1 mt-0.5">
                    {step.highlights.map((item) => {
                      const HIcon = item.icon;
                      return (
                        <div
                          key={item.title}
                          className="p-1.5 rounded-xl bg-[#040916] border border-cyan-500/20 flex items-center gap-2"
                        >
                          <div className="w-5 h-5 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-400">
                            <HIcon className="w-3 h-3" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-semibold text-white block leading-none truncate">
                              {item.title}
                            </span>
                            <span className="text-[9px] text-slate-400 leading-none truncate block mt-0.5">
                              {item.desc}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* DESKTOP / TABLET / LAPTOP LAYOUT (>= md) */}
              <div className="hidden md:grid max-w-6xl w-full mx-auto grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-6 xl:gap-8 items-center my-auto">
                {/* Text Content Block */}
                <div className={`w-full col-span-1 lg:col-span-6 ${isEven ? 'order-2' : 'order-1'}`}>
                  <div className="p-5 lg:p-7 rounded-3xl bg-[#081022]/90 border border-cyan-500/20 backdrop-blur-xl shadow-2xl shadow-cyan-950/80 relative overflow-hidden group">
                    <div
                      className="absolute -top-20 -right-20 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-40"
                      style={{ backgroundColor: step.glowColor }}
                    />

                    {/* Headline */}
                    <h3 className="text-lg lg:text-2xl font-bold font-display text-white mb-1.5 tracking-tight leading-snug">
                      {step.title}
                    </h3>

                    {/* Subtitle */}
                    <p className="text-cyan-400 text-xs lg:text-sm font-semibold mb-2 leading-relaxed">
                      {step.subtitle}
                    </p>

                    {/* Description */}
                    <p className="text-slate-300 text-xs lg:text-sm leading-relaxed mb-3 font-normal line-clamp-2 xl:line-clamp-3">
                      {step.description}
                    </p>

                    {/* Feature Highlights */}
                    <div className="space-y-2">
                      {step.highlights.map((item) => {
                        const HIcon = item.icon;
                        return (
                          <div
                            key={item.title}
                            className="p-2.5 rounded-xl bg-[#040916] border border-cyan-500/20 flex items-start gap-2.5 group/item hover:border-cyan-400/40 transition-colors"
                          >
                            <div className="w-6 h-6 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5 text-cyan-400">
                              <HIcon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-semibold text-white mb-0.5 leading-none">
                                {item.title}
                              </h4>
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                {item.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Visual Image Block */}
                <div className={`w-full col-span-1 lg:col-span-6 ${isEven ? 'order-1' : 'order-2'}`}>
                  <div className="relative w-full aspect-[16/10] sm:aspect-[4/3] max-h-[260px] lg:max-h-[320px] rounded-3xl p-1.5 bg-gradient-to-br from-cyan-500/30 via-sky-500/20 to-amber-500/30 shadow-2xl border border-cyan-500/30 overflow-hidden group mx-auto">
                    <div className="relative w-full h-full rounded-[22px] overflow-hidden bg-slate-900">
                      <img
                        src={step.image}
                        alt={step.imageAlt}
                        className={`w-full h-full object-cover ${
                          step.imagePosition || 'object-center'
                        } transform group-hover:scale-105 transition-transform duration-700`}
                        loading="lazy"
                        onLoad={() => ScrollTrigger.refresh()}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#040814]/70 via-transparent to-transparent pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pb-2" />
      </div>
    </section>
  );
}
