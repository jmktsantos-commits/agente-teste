"use client"

import { Bell, Moon, Sun, User } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
// Need DropdownMenu component, creating generic or using radix?
// I'll create a simple dropdown for now or install it.
// I'll skip complex dropdown for this iteration and just use a button or simple toggle.
// Better: I'll stick to simple buttons for now to save time on setting up all shadcn components.

export function Header() {
    const { setTheme, theme } = useTheme()

    return (
        <div className="flex items-center justify-end px-6 py-4 border-b h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-x-4">
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-600" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>

                <Button variant="ghost" size="icon" className="rounded-full bg-muted">
                    <User className="h-5 w-5" />
                </Button>
            </div>
        </div>
    )
}
