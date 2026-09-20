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
    subtitle: 'Practice on live-feeling data, safely. Every trainee sees exactly what their role needs — nothing more, nothing less.',
    description:
      'Interactive capacity building modules that stream realistic satellite and radar telemetry directly into simulated forecasting labs. Granular access controls ensure every trainee accesses precisely what their operational role requires.',
    image: '/home page/pexels-giantasparagus-37968049.png',
    imageAlt: 'High-resolution space view of Earth with atmospheric clouds and satellite orbit',
    imagePosition: 'object-top',
    icon: Lock,
    highlights: [
      {
        title: 'Secure & Role-Based Access',
        desc: 'Your data, your division. Access is locked to your role automatically.',
        icon: Lock,
      },
      {
        title: 'Real-Time Learning Labs',
        desc: 'Simulations, instant feedback, live sessions — no waiting for results.',
        icon: Zap,
      },
    ],
    metrics: { label: 'Security Level', value: 'RLS Enforced' },
    badgeColor: 'border-purple-500/40 text-purple-300 bg-purple-950/40',
    glowColor: 'rgba(107, 75, 163, 0.4)',
  },
  {
    id: 'step-2',
    stepNum: '02',
    badge: 'Field Ops & Regional Network',
    title: 'Pan-India Observational & Field Operations Training',
    subtitle: "From high-altitude stations to coastal radar towers — one unified training standard for India's entire observation grid.",
    description:
      'Engineered for meteorologists and technical officers maintaining India’s weather and telemetry network. Master Automatic Weather Station (AWS) calibration, Doppler radar diagnostics, and standardized reporting protocols across all regional stations.',
    image: '/home page/pexels-raulling-27644974.png',
    imageAlt: 'Meteorological ground station and telescope tracking system under night sky',
    icon: Radio,
    highlights: [
      {
        title: 'Observational Ground Ops',
        desc: 'Interactive guides for AWS sensor calibration, Doppler radar maintenance, and field telemetry.',
        icon: Radio,
      },
      {
        title: 'Multi-Regional Network',
        desc: 'New Delhi, Mumbai, Chennai, Kolkata, Guwahati — one unified platform, all centres in sync.',
        icon: Globe,
      },
    ],
    metrics: { label: 'Regional Coverage', value: 'Pan-India RMCs' },
    badgeColor: 'border-pink-500/40 text-pink-300 bg-pink-950/40',
    glowColor: 'rgba(234, 81, 157, 0.4)',
  },
  {
    id: 'step-3',
    stepNum: '03',
    badge: 'AI Analytics & Compliance',
    title: 'AI Competency Engine & Standards Compliance',
    subtitle: 'We spot your gaps before the field does. AI-guided learning paths, built around real MoES and WMO benchmarks.',
    description:
      'Intelligent diagnostic assessments map your technical strengths against official Ministry benchmarks, delivering tailored modules for cyclone tracking, radar interpretation, and climate modeling.',
    image: '/home page/satellite-orbit-with-planet-earth-background.png',
    imageAlt: 'Detailed rendering of Earth with glowing orbital satellites and solar panels',
    icon: Cpu,
    highlights: [
      {
        title: 'AI Competency Engine',
        desc: 'Take a quick skills check — get a learning path made for you, not a generic syllabus.',
        icon: Cpu,
      },
      {
        title: 'MoES & IMD Compliant',
        desc: "Every course maps directly to official standards. What you learn is what's actually required.",
        icon: Globe,
      },
    ],
    metrics: { label: 'Compliance Standard', value: 'MoES & WMO' },
    badgeColor: 'border-orange-500/40 text-orange-300 bg-orange-950/40',
    glowColor: 'rgba(243, 132, 29, 0.4)',
  },
];

export function StickyScrollFeatures() {
  const pinWrapperRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Kill any existing ScrollTrigger instances on this trigger to prevent duplicate pin-spacers
    ScrollTrigger.getAll().forEach((st) => {
      if (st.trigger === pinWrapperRef.current) {
        st.kill(true);
      }
    });

    const ctx = gsap.context(() => {
      if (!trackRef.current || !pinWrapperRef.current) return;

      const panelsCount = steps.length;
      // Total horizontal shift to reveal the last panel: (panelsCount - 1) / panelsCount * 100%
      const totalXPercent = -((panelsCount - 1) / panelsCount) * 100;
      const getScrollDistance = () => Math.max(window.innerHeight * 1.6, 1000);

      gsap.to(trackRef.current, {
        xPercent: totalXPercent,
        ease: 'none',
        scrollTrigger: {
          trigger: pinWrapperRef.current,
          pin: true,
          scrub: 0.5,
          start: 'top top',
          end: () => `+=${getScrollDistance()}`,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
    }, pinWrapperRef);

    const refreshHandler = () => ScrollTrigger.refresh();
    window.addEventListener('resize', refreshHandler);

    return () => {
      window.removeEventListener('resize', refreshHandler);
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === pinWrapperRef.current) {
          st.kill(true);
        }
      });
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="sticky-features"
      ref={pinWrapperRef}
      className="pin-wrapper relative w-full bg-[#07091B] text-slate-100 border-t border-purple-500/15 overflow-hidden h-[100dvh] max-h-[100dvh] min-h-[580px] flex flex-col justify-between"
    >
      {/* Decorative ambient nebula glows */}
      <div className="pointer-events-none absolute top-1/4 -left-64 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-1/4 -right-64 w-[600px] h-[600px] rounded-full bg-pink-600/10 blur-[140px]" />

      {/* Persistent Section Header (Always visible, perfectly clearance below navbar) */}
      <div className="pt-16 sm:pt-16 lg:pt-16 pb-1 px-4 sm:px-6 max-w-7xl mx-auto w-full text-center relative z-20 shrink-0">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-0.5 sm:px-3 sm:py-0.5 rounded-full bg-purple-950/70 border border-purple-500/30 text-purple-300 text-[10px] sm:text-xs font-semibold tracking-wider uppercase mb-1 shadow-inner">
          <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-pink-400" />
          Core Platform Architecture
        </div>
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold font-display tracking-tight text-white mb-0.5 leading-tight">
          From Orbital Telemetry to{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
            Ground-Level Preparedness
          </span>
        </h2>
        <p className="text-slate-400 text-[11px] sm:text-xs md:text-sm max-w-2xl mx-auto line-clamp-1">
          Built to meet the real demands of MoES field teams — from live data feeds to offline mountain outposts.
        </p>
      </div>

      {/* Horizontal Scroll Panels Track */}
      <div
        ref={trackRef}
        className="pin-track flex flex-row w-[300%] h-full items-center z-10 flex-1 min-h-0 py-1 overflow-hidden"
      >
        {steps.map((step, idx) => {
          const isEven = idx % 2 === 1;

          return (
            <div
              key={step.id}
              className="pin-panel w-[33.333333%] px-3 sm:px-6 md:px-8 lg:px-12 xl:px-16 flex items-center justify-center shrink-0 h-full max-h-full"
            >
              {/* ========================================================================= */}
              {/* MOBILE LAYOUT (< md): Unified Lengthy Portrait Card (No Clipping)         */}
              {/* ========================================================================= */}
              <div className="block md:hidden w-full max-w-sm mx-auto my-auto">
                <div className="p-3 sm:p-4 rounded-3xl bg-slate-900/90 border border-purple-500/30 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col gap-2">
                  {/* Ambient Glow */}
                  <div
                    className="absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-30"
                    style={{ backgroundColor: step.glowColor }}
                  />

                  {/* Top Image Banner */}
                  <div className="relative w-full aspect-[2.2/1] rounded-2xl overflow-hidden bg-slate-950 border border-purple-500/20 shadow-inner shrink-0">
                    <img
                      src={step.image}
                      alt={step.imageAlt}
                      className={`w-full h-full object-cover ${step.imagePosition || 'object-center'}`}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
                  </div>

                  {/* Text Details */}
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-bold font-display text-white tracking-tight leading-snug">
                      {step.title}
                    </h3>
                    <p className="text-pink-300 text-[10px] sm:text-[11px] font-semibold leading-tight">
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
                          className="p-1.5 rounded-xl bg-purple-950/50 border border-purple-500/20 flex items-center gap-2"
                        >
                          <div className="w-5 h-5 rounded-lg bg-pink-500/15 border border-pink-500/30 flex items-center justify-center shrink-0 text-pink-400">
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

              {/* ========================================================================= */}
              {/* DESKTOP / TABLET / LAPTOP LAYOUT (>= md): Responsive 2-Column Side-by-Side */}
              {/* ========================================================================= */}
              <div className="hidden md:grid max-w-6xl w-full mx-auto grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-6 xl:gap-8 items-center my-auto">
                {/* Text Content Block */}
                <div className={`w-full col-span-1 lg:col-span-6 ${isEven ? 'order-2' : 'order-1'}`}>
                  <div className="p-4 sm:p-5 lg:p-6 xl:p-7 rounded-2xl lg:rounded-3xl bg-slate-900/90 border border-purple-500/30 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                    {/* Ambient Glow */}
                    <div
                      className="absolute -top-20 -right-20 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-30"
                      style={{ backgroundColor: step.glowColor }}
                    />

                    {/* Headline */}
                    <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold font-display text-white mb-1 lg:mb-1.5 tracking-tight leading-snug">
                      {step.title}
                    </h3>

                    {/* Subtitle */}
                    <p className="text-pink-300 text-[11px] sm:text-xs lg:text-sm font-semibold mb-1 lg:mb-2 leading-tight sm:leading-relaxed">
                      {step.subtitle}
                    </p>

                    {/* Description */}
                    <p className="text-slate-300 text-[11px] sm:text-xs lg:text-sm leading-relaxed mb-2 lg:mb-3 font-normal line-clamp-2 xl:line-clamp-3">
                      {step.description}
                    </p>

                    {/* Feature Highlights */}
                    <div className="space-y-1.5 lg:space-y-2">
                      {step.highlights.map((item) => {
                        const HIcon = item.icon;
                        return (
                          <div
                            key={item.title}
                            className="p-2 lg:p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-start gap-2 lg:gap-2.5 group/item hover:border-purple-500/40 transition-colors"
                          >
                            <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center shrink-0 mt-0.5 text-pink-400">
                              <HIcon className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-[11px] lg:text-xs font-semibold text-white mb-0.5 leading-none">
                                {item.title}
                              </h4>
                              <p className="text-[10px] lg:text-[11px] text-slate-400 leading-tight lg:leading-relaxed line-clamp-1 sm:line-clamp-none">
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
                  <div className="relative w-full aspect-[16/10] sm:aspect-[4/3] max-h-[220px] lg:max-h-[280px] xl:max-h-[320px] rounded-2xl lg:rounded-3xl p-1 sm:p-1.5 bg-gradient-to-br from-purple-500/40 via-pink-500/30 to-orange-500/40 shadow-2xl overflow-hidden group mx-auto">
                    <div className="relative w-full h-full rounded-[14px] sm:rounded-[22px] overflow-hidden bg-slate-950">
                      <img
                        src={step.image}
                        alt={step.imageAlt}
                        className={`w-full h-full object-cover ${
                          step.imagePosition || 'object-center'
                        } transform group-hover:scale-105 transition-transform duration-700`}
                        loading="lazy"
                        onLoad={() => ScrollTrigger.refresh()}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-space-950/40 via-transparent to-transparent pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom spacer for viewport balance */}
      <div className="pb-1 sm:pb-2" />
    </section>
  );
}
