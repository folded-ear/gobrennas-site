"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import {
  Button as AriaButton,
  composeRenderProps,
  type ButtonProps as AriaButtonProps,
} from "react-aria-components"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors",
    /* Disabled */
    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ",
    /* Focus Visible */
    "data-[focus-visible]:outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-ring data-[focus-visible]:ring-offset-2",
    /* Resets */
    "focus-visible:outline-none",
  ],
  {
    variants: {
      variant: {
        default:
          "ds-bg-primary ds-text-primary-foreground data-[hovered]:ds-bg-primary/90",
        destructive:
          "ds-bg-destructive ds-text-destructive-foreground data-[hovered]:ds-bg-destructive/90",
        outline:
          "ds-border ds-border-input ds-bg-background data-[hovered]:ds-bg-accent data-[hovered]:ds-text-accent-foreground",
        secondary:
          "ds-bg-secondary ds-text-secondary-foreground data-[hovered]:ds-bg-secondary/80",
        ghost: "data-[hovered]:ds-bg-accent data-[hovered]:ds-text-accent-foreground",
        link: "ds-text-primary ds-underline-offset-4 data-[hovered]:ds-underline",
      },
      size: {
        default: "ds-h-10 ds-px-4 ds-py-2",
        sm: "ds-h-9 ds-rounded-md ds-px-3",
        lg: "ds-h-11 ds-rounded-md ds-px-8",
        icon: "ds-size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps
  extends AriaButtonProps,
    VariantProps<typeof buttonVariants> {}

const Button = ({ className, variant, size, ...props }: ButtonProps) => {
  return (
    <AriaButton
      className={composeRenderProps(className, (className) =>
        cn(
          buttonVariants({
            variant,
            size,
            className,
          })
        )
      )}
      {...props}
    />
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
