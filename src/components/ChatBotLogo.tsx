import React from 'react'

interface ChatBotLogoProps {
  className?: string
  size?: number
  variant?: 'icon-only' | 'badge' | 'floating'
}

export function ChatBotLogo({ className = '', size = 24, variant = 'icon-only' }: ChatBotLogoProps) {
  const svgIcon = (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={variant === 'icon-only' ? className : 'w-full h-full'}
    >
      {/* Brain Left Hemisphere Outline */}
      <path
        d="M17 7.5C13.2 7.2 9.5 9.8 9.5 13.2C7.2 14.5 7 17.8 9.2 19.5C7.8 21.2 8.5 24.5 11.8 25.8C13.5 26.5 15.5 26.5 17 26.2"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Center Spine */}
      <path
        d="M17 8.5V25"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Top Circuit Branch */}
      <path
        d="M17 12H21.5C23 12 24 11 24 9.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="8.5" r="1.6" fill="currentColor" />

      {/* Middle Circuit Branch */}
      <path
        d="M17 17.5H23"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="24.8" cy="17.5" r="1.6" fill="currentColor" />

      {/* Bottom Circuit Branch */}
      <path
        d="M17 23H21.5C23 23 24 24 24 25.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="26.5" r="1.6" fill="currentColor" />
    </svg>
  )

  if (variant === 'floating') {
    return (
      <div
        className={`relative flex items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-amber-500 text-white shadow-[0_0_25px_rgba(6,182,212,0.55),0_0_10px_rgba(56,189,248,0.4)] border border-cyan-300/40 ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="w-[62%] h-[62%] flex items-center justify-center text-white">
          {svgIcon}
        </div>
      </div>
    )
  }

  if (variant === 'badge') {
    return (
      <div
        className={`relative flex items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.35)] border border-cyan-300/40 shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="w-[64%] h-[64%] flex items-center justify-center text-white">
          {svgIcon}
        </div>
      </div>
    )
  }

  return svgIcon
}
