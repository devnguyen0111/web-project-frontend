"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-200 ease-out active:translate-y-px focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default:
          "bg-cyan-500 text-white shadow-md shadow-cyan-500/30 hover:bg-cyan-400",
        outline:
          "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
        secondary:
          "border border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100",
        ghost: "text-slate-700 hover:bg-slate-100",
        destructive: "bg-rose-600 text-white hover:bg-rose-500",
        link: "text-cyan-700 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 py-2 text-xs",
        xs: "h-8 px-2.5 py-1 text-xs",
        lg: "h-11 px-5 py-2",
        icon: "h-10 w-10",
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
