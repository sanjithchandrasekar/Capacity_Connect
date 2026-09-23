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
          "bg-gradient-to-r from-cyan-600 via-blue-600 to-amber-600 text-white shadow-md shadow-cyan-600/20 hover:opacity-95 hover:shadow-lg transition-all",
        primary:
          "bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 text-white shadow-md shadow-cyan-600/20 hover:opacity-95 transition-all",
        purple:
          "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all",
        pink:
          "bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/20 transition-all",
        orange:
          "bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 transition-all",
        coral:
          "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 transition-all",
        outline:
          "border border-slate-200 bg-white shadow-xs hover:bg-slate-50 hover:border-slate-300 text-slate-800 transition-all",
        secondary:
          "bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200 transition-all",
        ghost: "hover:bg-slate-100 hover:text-slate-900 text-slate-700 transition-all",
        link: "text-cyan-600 underline-offset-4 hover:underline",
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
