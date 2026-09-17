import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white shadow-md shadow-pink-500/25 hover:opacity-95 hover:shadow-lg transition-all",
        primary:
          "bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white shadow-md shadow-pink-500/25 hover:opacity-95 transition-all",
        purple:
          "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/25 transition-all",
        pink:
          "bg-pink-500 hover:bg-pink-600 text-white shadow-md shadow-pink-500/25 transition-all",
        orange:
          "bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/25 transition-all",
        coral:
          "bg-coral-500 hover:bg-coral-600 text-white shadow-md shadow-coral-500/25 transition-all",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 transition-all",
        outline:
          "border border-purple-500/20 bg-white/90 shadow-sm hover:bg-purple-50 hover:border-purple-500/40 text-midnight transition-all",
        secondary:
          "bg-purple-500/10 text-purple-700 hover:bg-purple-500/15 border border-purple-500/20 transition-all",
        ghost: "hover:bg-purple-50 hover:text-purple-600 text-midnight/80 transition-all",
        link: "text-pink-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
