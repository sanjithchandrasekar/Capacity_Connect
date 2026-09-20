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
      const mm = gsap.matchMedia();

      // Desktop (>= 1024px): Pinned Horizontal Scroll
      mm.add('(min-width: 1024px)', () => {
        if (!trackRef.current || !pinWrapperRef.current) return;

        const panelsCount = steps.length;
        // Total horizontal shift to reveal the last panel: (panelsCount - 1) / panelsCount * 100%
        const totalXPercent = -((panelsCount - 1) / panelsCount) * 100;
        const scrollDistance = Math.max(window.innerHeight * 1.5, 1200);

        gsap.to(trackRef.current, {
          xPercent: totalXPercent,
          ease: 'none',
          scrollTrigger: {
            trigger: pinWrapperRef.current,
            pin: true,
            scrub: 0.5,
            start: 'top top',
            end: () => `+=${scrollDistance}`,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });
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
      className="pin-wrapper relative w-full bg-[#07091B] text-slate-100 border-t border-purple-500/15 overflow-hidden lg:h-screen lg:max-h-screen flex flex-col justify-between"
    >
      {/* Decorative ambient nebula glows */}
      <div className="pointer-events-none absolute top-1/4 -left-64 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-1/4 -right-64 w-[600px] h-[600px] rounded-full bg-pink-600/10 blur-[140px]" />

      {/* Persistent Fixed Header */}
      <div className="pt-20 sm:pt-24 lg:pt-24 pb-2 px-6 max-w-7xl mx-auto w-full text-center relative z-20 shrink-0">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-semibold tracking-wider uppercase mb-2 shadow-inner">
          <Activity className="w-3.5 h-3.5 text-pink-400" />
          Core Platform Architecture
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display tracking-tight text-white mb-1.5">
          From Orbital Telemetry to{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
            Ground-Level Preparedness
          </span>
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm max-w-2xl mx-auto mb-2">
          Built to meet the real demands of MoES field teams — from orbital satellite streams to remote ground observation towers.
        </p>
      </div>

      {/* Horizontal Scroll Panels Track */}
      <div
        ref={trackRef}
        className="pin-track flex flex-col lg:flex-row w-full lg:w-[300%] h-full items-center z-10 py-6 lg:py-0 flex-1"
      >
        {steps.map((step, idx) => {
          const isEven = idx % 2 === 1;

          return (
            <div
              key={step.id}
              className="pin-panel w-full lg:w-[33.333333%] px-6 sm:px-12 lg:px-16 flex items-center justify-center shrink-0 mb-16 lg:mb-0 h-full"
            >
              <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center my-auto">
                {/* Text Content Block */}
                <div className={`w-full lg:col-span-6 ${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
                  <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/85 border border-purple-500/30 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                    {/* Ambient Glow */}
                    <div
                      className="absolute -top-20 -right-20 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-30"
                      style={{ backgroundColor: step.glowColor }}
                    />

                    {/* Headline */}
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold font-display text-white mb-2 tracking-tight">
                      {step.title}
                    </h3>

                    {/* Subtitle */}
                    <p className="text-pink-300 text-xs sm:text-sm font-semibold mb-2.5 leading-relaxed">
                      {step.subtitle}
                    </p>

                    {/* Description */}
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4 font-normal">
                      {step.description}
                    </p>

                    {/* Feature Highlights */}
                    <div className="space-y-2">
                      {step.highlights.map((item) => {
                        const HIcon = item.icon;
                        return (
                          <div
                            key={item.title}
                            className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-start gap-2.5 group/item hover:border-purple-500/40 transition-colors"
                          >
                            <div className="w-6 h-6 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center shrink-0 mt-0.5 text-pink-400">
                              <HIcon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold text-white mb-0.5">
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
                <div className={`w-full lg:col-span-6 ${isEven ? 'lg:order-1' : 'lg:order-2'}`}>
                  <div className="relative w-full aspect-[4/3] max-h-[350px] rounded-3xl p-1.5 bg-gradient-to-br from-purple-500/40 via-pink-500/30 to-orange-500/40 shadow-2xl overflow-hidden group">
                    <div className="relative w-full h-full rounded-[22px] overflow-hidden bg-slate-950">
                      <img
                        src={step.image}
                        alt={step.imageAlt}
                        className={`w-full h-full object-cover ${
                          step.imagePosition || 'object-center'
                        } transform group-hover:scale-105 transition-transform duration-700`}
                        loading="lazy"
                        onLoad={() => ScrollTrigger.refresh()}
                      />

                      {/* Subtle Vignette Scrim */}
                      <div className="absolute inset-0 bg-gradient-to-t from-space-950/40 via-transparent to-transparent pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom spacer for desktop pinning */}
      <div className="hidden lg:block pb-4" />
    </section>
  );
}
