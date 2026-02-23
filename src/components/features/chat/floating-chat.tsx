"use client"

import { useState, useEffect } from "react"
import { MessageCircle, X, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChatWindow } from "./chat-window"
import { Badge } from "@/components/ui/badge"

export function FloatingChat() {
    const [isOpen, setIsOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [isMinimized, setIsMinimized] = useState(false)
    const [isButtonHidden, setIsButtonHidden] = useState(false)

    // Load hidden state from localStorage on mount
    useEffect(() => {
        const hidden = localStorage.getItem('chatButtonHidden') === 'true'
        setIsButtonHidden(hidden)
    }, [])

    const hideButton = (e: React.MouseEvent) => {
        e.stopPropagation() // Prevent opening chat
        setIsButtonHidden(true)
        localStorage.setItem('chatButtonHidden', 'true')
    }

    // Simulate unread messages (in production, get from Supabase realtime)
    useEffect(() => {
        if (!isOpen) {
            // Mock: increment unread count every 30 seconds when closed
            const interval = setInterval(() => {
                setUnreadCount(prev => prev + 1)
            }, 30000)
            return () => clearInterval(interval)
        } else {
            // Reset when opened
            setUnreadCount(0)
        }
    }, [isOpen])

    const toggleChat = () => {
        setIsOpen(!isOpen)
        setIsMinimized(false)
        if (!isOpen) {
            setUnreadCount(0) // Mark as read when opening
        }
    }

    const minimizeChat = () => {
        setIsMinimized(true)
        setTimeout(() => setIsOpen(false), 200) // Delay for animation
    }

    return (
        <>
            {/* Floating Button */}
            {!isOpen && !isButtonHidden && (
                <div className="fixed bottom-4 md:bottom-6 right-4 md:right-6 z-50 group">
                    <button
                        onClick={toggleChat}
                        className="w-14 h-14 md:w-16 md:h-16
                            bg-gradient-to-r from-purple-600 to-pink-600 
                            rounded-full shadow-2xl hover:scale-110 transition-all duration-300
                            flex items-center justify-center
                            animate-in fade-in slide-in-from-bottom-4 relative"
                        aria-label="Abrir chat"
                    >
                        <MessageCircle className="w-6 h-6 md:w-7 md:h-7 text-white group-hover:scale-110 transition-transform" />

                        {/* Notification Badge */}
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 
                                text-white text-xs font-bold rounded-full w-6 h-6 md:w-7 md:h-7
                                flex items-center justify-center border-2 border-slate-900
                                animate-in zoom-in">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}

                        {/* Pulse effect */}
                        <span className="absolute inset-0 rounded-full bg-purple-600 
                            opacity-75 animate-ping" />
                    </button>

                    {/* Close Button (X) */}
                    <button
                        onClick={hideButton}
                        className="absolute -top-1 -left-1 w-5 h-5 bg-slate-800 border border-slate-600
                            rounded-full flex items-center justify-center
                            hover:bg-slate-700 transition-colors z-10
                            opacity-0 group-hover:opacity-100"
                        aria-label="Fechar chat permanentemente"
                    >
                        <X className="w-3 h-3 text-slate-300" />
                    </button>
                </div>
            )}

            {/* Chat Modal */}
            {isOpen && (
                <div
                    className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 
                        w-full max-w-[95vw] md:max-w-[420px] 
                        h-[500px] md:h-[650px]
                        bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl
                        flex flex-col overflow-hidden
                        ${isMinimized ? 'animate-out slide-out-to-bottom-4 fade-out' : 'animate-in slide-in-from-bottom-4 fade-in'}
                        transition-all duration-300`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-800 
                        bg-gradient-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 
                                flex items-center justify-center animate-pulse">
                                <MessageCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white text-sm">Chat da Comunidade</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[11px] text-slate-400">142 online</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={minimizeChat}
                                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
                            >
                                <Minimize2 className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsOpen(false)}
                                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Chat Content */}
                    <div className="flex-1 overflow-hidden">
                        <ChatWindow />
                    </div>
                </div>
            )}
        </>
    )
}
