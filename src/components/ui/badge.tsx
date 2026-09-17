import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/20",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-sm",
        gradient:
          "border-transparent bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white shadow-sm",
        purple:
          "border-purple-200 bg-purple-50 text-purple-700",
        pink:
          "border-pink-200 bg-pink-50 text-pink-700",
        orange:
          "border-orange-200 bg-orange-50 text-orange-700",
        coral:
          "border-coral-200 bg-coral-50 text-coral-700",
        secondary:
          "border-transparent bg-purple-100 text-purple-800 hover:bg-purple-200",
        destructive:
          "border-transparent bg-red-600 text-white shadow hover:bg-red-700",
        outline: "border-purple-200 text-midnight",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
