"use client"

import * as React from "react"
import PhoneInputOriginal from "react-phone-number-input"
import "react-phone-number-input/style.css"
import { cn } from "@/lib/utils"
// import { Input } from "@/components/ui/input" 

// Simple wrapper using the default style but with our class names
// Since we don"t have the Command component readily available, we"ll stick to the default select for now
// or just style the input directly.

export interface PhoneInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    value: string
    onChange: (value: string) => void
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
    ({ className, ...props }, ref) => {
        return (
            <PhoneInputOriginal
                {...props}
                defaultCountry="BR"
                international
                withCountryCallingCode
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    "[&_input]:bg-transparent [&_input]:outline-none [&_input]:h-full [&_input]:w-full [&_input]:ml-2",
                    "[&_.PhoneInputCountry]:mr-2",
                    className
                )}
                ref={ref as any}
            />
        )
    }
)
PhoneInput.displayName = "PhoneInput"

export { PhoneInput }
