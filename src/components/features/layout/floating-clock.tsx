"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Clock, GripHorizontal } from "lucide-react"

export function FloatingClock() {
    const [time, setTime] = useState<string>("")
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Safe localStorage access
        const getStorage = () => {
            try {
                return localStorage.getItem("showFloatingClock") === "true"
            } catch (e) {
                return false
            }
        }

        setIsVisible(getStorage())

        const handleStorageChange = () => {
            setIsVisible(getStorage())
        }

        window.addEventListener("storage", handleStorageChange)
        window.addEventListener("floating-clock-toggle", handleStorageChange)

        const timer = setInterval(() => {
            try {
                // Try Brasilia Time (UTC-3)
                const now = new Date()
                const timeString = now.toLocaleTimeString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false
                })
                setTime(timeString)
            } catch (e) {
                // Fallback to local system time if timezone fails
                setTime(new Date().toLocaleTimeString())
            }
        }, 1000)

        handleStorageChange()

        return () => {
            clearInterval(timer)
            window.removeEventListener("storage", handleStorageChange)
            window.removeEventListener("floating-clock-toggle", handleStorageChange)
        }
    }, [])

    if (!isVisible) return null

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.2}
            initial={{ bottom: 80, right: 20, opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed z-[100] cursor-grab active:cursor-grabbing touch-none"
        >
            <div className="bg-slate-900/90 backdrop-blur-md border border-pink-500/30 text-white px-3 py-2 md:px-4 md:py-2 rounded-full shadow-[0_0_15px_rgba(236,72,153,0.3)] flex items-center gap-2 md:gap-3 select-none">
                <GripHorizontal className="w-4 h-4 text-slate-500" />
                <div className="flex items-center gap-1.5 md:gap-2">
                    <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-pink-500 animate-pulse" />
                    <span className="font-mono text-sm md:text-xl font-bold tracking-wider text-pink-50">
                        {time}
                    </span>
                </div>
                <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 border-l border-slate-700">
                    BRT
                </span>
            </div>
        </motion.div>
    )
}
