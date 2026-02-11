"use client"

import { useState, useRef } from "react"
import { Maximize2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function CasinoPage() {
    const containerRef = useRef<HTMLDivElement>(null)

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen()
        } else {
            document.exitFullscreen()
        }
    }

    const superbetUrl = process.env.SUPERBET_AFFILIATE_URL || "https://superbet.com.br"
    const bravobetUrl = process.env.BRAVOBET_AFFILIATE_URL || "https://bravobet.com.br"

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.32))]" ref={containerRef}>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold text-white">Cassino</h1>
                <Button variant="outline" size="sm" onClick={toggleFullscreen} className="gap-2">
                    <Maximize2 className="h-4 w-4" />
                    Tela Cheia
                </Button>
            </div>

            <Tabs defaultValue="superbet" className="flex-1 flex flex-col h-full">
                <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-900">
                    <TabsTrigger value="superbet">Superbet</TabsTrigger>
                    <TabsTrigger value="bravobet">Bravobet</TabsTrigger>
                </TabsList>

                <TabsContent value="superbet" className="flex-1 relative rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                        <p className="text-slate-500 text-sm mb-2 pointer-events-auto">
                            Se não carregar, use o botão abaixo
                        </p>
                        <Button size="sm" variant="secondary" className="pointer-events-auto" onClick={() => window.open(superbetUrl, "_blank")}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Abrir Superbet
                        </Button>
                    </div>
                    <iframe
                        src={superbetUrl}
                        className="w-full h-full relative z-20 hover:opacity-100 transition-opacity bg-white"
                        title="Superbet"
                        allow="fullscreen"
                    />
                </TabsContent>

                <TabsContent value="bravobet" className="flex-1 relative rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                        <p className="text-slate-500 text-sm mb-2 pointer-events-auto">
                            Se não carregar, use o botão abaixo
                        </p>
                        <Button size="sm" variant="secondary" className="pointer-events-auto" onClick={() => window.open(bravobetUrl, "_blank")}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Abrir Bravobet
                        </Button>
                    </div>
                    <iframe
                        src={bravobetUrl}
                        className="w-full h-full relative z-20 bg-white"
                        title="Bravobet"
                        allow="fullscreen"
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
