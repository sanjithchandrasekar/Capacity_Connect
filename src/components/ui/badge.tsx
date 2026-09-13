import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ink/20",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-ink text-cream shadow hover:bg-ink/90",
        secondary:
          "border-transparent bg-ink/10 text-ink hover:bg-ink/15",
        destructive:
          "border-transparent bg-red-600 text-white shadow hover:bg-red-700",
        outline: "border-ink/20 text-ink",
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
