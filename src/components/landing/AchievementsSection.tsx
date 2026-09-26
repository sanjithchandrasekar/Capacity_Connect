import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award, Trophy, ChevronRight, ChevronLeft, Star, UserCheck, User
} from 'lucide-react'
import { useHomePageSettings, defaultAchievementStories, AchievementStoryItem } from '@/hooks/useHomePageSettings'

export function AchievementsSection() {
  const { settings } = useHomePageSettings()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  // Respect Section Live Toggle
  if (settings.achievements_enabled === false) {
    return null
  }

  const stories: AchievementStoryItem[] =
    settings.achievements_stories && settings.achievements_stories.length > 0
      ? settings.achievements_stories
      : defaultAchievementStories

  // Auto-play interval (every 5 seconds, pauses when hovering)
  useEffect(() => {
    if (isHovered || stories.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % stories.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [isHovered, stories.length])

  const activeStory = stories[currentIndex % stories.length] || stories[0]

  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? stories.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % stories.length)
  }

  const sectionTag = settings.achievements_tag || 'Proven National Impact'
  const sectionTitle = settings.achievements_title || 'Inspired trainees. Inspired results'
  const moesBadge = settings.achievements_moes_badge || '100% Verified Operational Skill Credentials'
  const moesDesc = settings.achievements_moes_desc || 'Direct alignment with WMO, IMD & INCOIS forecast protocols.'

  return (
    <section className="relative py-20 lg:py-24 bg-slate-50 text-slate-900 border-t border-slate-200 overflow-hidden select-none">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Top Header Grid (Light Theme) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-bold uppercase tracking-wider mb-4 shadow-2xs">
              <Trophy className="w-3.5 h-3.5 text-cyan-600" />
              {sectionTag}
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-display text-slate-900 tracking-tight leading-[1.15] mb-2">
              {sectionTitle.includes('Inspired results') ? (
                <>
                  Inspired trainees. Inspired{' '}
                  <span className="text-cyan-600">
                    results
                  </span>
                </>
              ) : (
                sectionTitle
              )}
            </h2>
          </div>

          {/* Right Header Visual Showcase Card */}
          <div className="relative flex items-center justify-center lg:justify-end">
            <div className="relative p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xl shadow-slate-200/50 max-w-md w-full flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-600 flex items-center justify-center text-white shadow-lg shadow-cyan-600/25 shrink-0">
                <Award className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-cyan-700 font-black text-xs uppercase tracking-wider mb-0.5">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>MoES Center of Excellence</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {moesBadge}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  {moesDesc}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dark Themed Showcase Card */}
        <div
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStory.id || currentIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="relative rounded-3xl bg-[#060c1c] text-white p-6 sm:p-10 lg:p-12 shadow-2xl shadow-cyan-950/40 border border-cyan-500/30 overflow-hidden"
            >
              {/* Banner Top Header Text */}
              <div className="text-center mb-8 sm:mb-12 relative z-10">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black font-display tracking-tight text-white leading-tight">
                  {activeStory.bannerTitle}{' '}
                  <span className="block sm:inline text-cyan-400 font-black font-display tracking-tight mt-1 sm:mt-0">
                    {activeStory.bannerSubtitle}
                  </span>
                </h3>
              </div>

              {/* Banner Inner Content Grid (Achievers Row + Stat Callout) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch relative z-10">
                
                {/* Left Side: Achievers Showcase (Col 7 / 8) */}
                <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
                  {(activeStory.achievers || []).map((achiever, i) => (
                    <motion.div
                      key={achiever.id || achiever.name + i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.35 }}
                      className="flex flex-col rounded-3xl bg-white text-slate-900 shadow-2xl shadow-slate-950/30 border border-slate-200/80 hover:border-cyan-400 hover:shadow-cyan-500/25 hover:-translate-y-2 transition-all duration-300 group overflow-hidden"
                    >
                      {/* Top Photo Section with Name Overlay */}
                      <div className="relative h-72 sm:h-80 w-full bg-slate-900 overflow-hidden flex items-end p-5">
                        {achiever.avatar_url ? (
                          <img
                            src={achiever.avatar_url}
                            alt={achiever.name}
                            className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-[#f0f2f5] via-[#d6dae1] to-[#8e97a6] flex items-center justify-center">
                            {/* Minimalist SVG Silhouette */}
                            <svg
                              viewBox="0 0 100 100"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-24 h-24 text-white/55 mb-8"
                              stroke="currentColor"
                              strokeWidth="2.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="50" cy="38" r="14" />
                              <path d="M26 78C26 63 36 57 50 57C64 57 74 63 74 78" />
                            </svg>
                          </div>
                        )}

                        {/* Top Right Score & Rank Floating Badge */}
                        {achiever.achievementBadge && (
                          <div className="absolute top-3.5 right-3.5 z-10">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/90 backdrop-blur-md text-amber-400 border border-amber-500/50 text-xs font-black uppercase tracking-wider font-display shadow-xl">
                              <Trophy className="w-3.5 h-3.5 text-amber-400" />
                              {achiever.achievementBadge}
                            </span>
                          </div>
                        )}

                        {/* Subtle bottom-only scrim for name readability without darkening the photo */}
                        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent pointer-events-none" />

                        {/* Overlay Name in bold white */}
                        <div className="relative z-10 text-left w-full">
                          <h4 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight drop-shadow-md">
                            {achiever.name}
                          </h4>
                        </div>
                      </div>

                      {/* Bottom Light Section with Vertical Accent Bar */}
                      <div className="p-5 bg-white flex flex-col justify-center flex-1">
                        {/* Role with Left Vertical Accent Bar */}
                        <div className="flex items-start gap-2.5">
                          <span className="w-1.5 h-4 bg-cyan-600 rounded-full shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-slate-900 leading-snug">
                            {achiever.role} - {achiever.institute}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Right Side: Big Stat Highlight Callout (Matching Light Theme & Height) */}
                <div className="lg:col-span-4 flex justify-center items-stretch">
                  <div className="w-full rounded-3xl bg-white text-slate-900 p-7 sm:p-9 shadow-2xl shadow-slate-950/30 border border-slate-200/80 hover:border-amber-400/80 transition-all duration-300 flex flex-col items-center justify-between text-center relative overflow-hidden">
                    
                    {/* Top Decorative accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-400" />

                    <div className="flex flex-col items-center my-auto py-4">
                      <span className="inline-block text-xs font-black text-cyan-800 tracking-widest uppercase bg-cyan-50 border border-cyan-200 px-4 py-1 rounded-full mb-3 shadow-2xs">
                        {activeStory.highlightStatTitle}
                      </span>

                      <span className="block text-5xl sm:text-6xl font-black text-amber-500 tracking-tight my-2 drop-shadow-sm">
                        {activeStory.highlightStatNumber}
                      </span>

                      <p className="text-xs sm:text-sm font-bold text-slate-700 leading-snug max-w-[240px] mx-auto mt-2">
                        {activeStory.highlightStatDescription}
                      </p>
                    </div>

                    <div className="mt-4 w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 rounded-2xl shadow-2xs">
                      <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>MoES Certified Placement</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Interactive Slide Dots Indicator */}
              {stories.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8 relative z-10">
                  {stories.map((s, idx) => {
                    const isActive = idx === currentIndex % stories.length
                    return (
                      <button
                        key={s.id || idx}
                        onClick={() => setCurrentIndex(idx)}
                        aria-label={`Go to slide ${idx + 1}`}
                        className={`transition-all duration-300 rounded-full cursor-pointer ${
                          isActive
                            ? 'w-8 h-2.5 bg-cyan-400 shadow-md shadow-cyan-500/50'
                            : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/60'
                        }`}
                      />
                    )
                  })}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Slider Left / Right Navigation Controls */}
          {stories.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                aria-label="Previous Achievement"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/90 hover:bg-slate-800 text-cyan-300 hover:text-white flex items-center justify-center shadow-2xl backdrop-blur-md transition-all hover:scale-110 active:scale-95 border border-cyan-500/40 hover:border-cyan-400 z-20 cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={handleNext}
                aria-label="Next Achievement"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/90 hover:bg-slate-800 text-cyan-300 hover:text-white flex items-center justify-center shadow-2xl backdrop-blur-md transition-all hover:scale-110 active:scale-95 border border-cyan-500/40 hover:border-cyan-400 z-20 cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

      </div>
    </section>
  )
}

