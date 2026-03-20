"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "btn-base text-sm focus-visible:outline-none",
  {
    variants: {
      variant: {
        default: "btn-primary",
        outline: "btn-outline",
        secondary: "btn-secondary",
        ghost: "btn-ghost",
        destructive: "btn-destructive",
        link: "btn-link",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 py-2 text-xs",
        xs: "h-8 px-2.5 py-1 text-xs",
        lg: "h-11 px-5 py-2 text-sm",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
