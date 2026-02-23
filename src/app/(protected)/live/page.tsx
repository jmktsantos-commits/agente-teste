'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Radio, Users, Play, Wifi, WifiOff, ExternalLink, X, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface LiveStream {
    id: string
    platform: string
    is_live: boolean
    stream_url: string | null
    expert_name: string
    viewers_count: number
}

const PLATFORM_CONFIG: Record<string, { label: string; color: string; gradient: string; bg: string; border: string }> = {
    bravobet: {
        label: 'Bravobet',
        color: 'text-orange-400',
        gradient: 'from-orange-500 to-amber-500',
        bg: 'from-orange-950/30 to-slate-900',
        border: 'border-orange-800/40'
    },
    superbet: {
        label: 'Superbet',
        color: 'text-indigo-400',
        gradient: 'from-indigo-500 to-purple-500',
        bg: 'from-indigo-950/30 to-slate-900',
        border: 'border-indigo-800/40'
    },
    esportivabet: {
        label: 'EsportivaBet',
        color: 'text-green-400',
        gradient: 'from-green-500 to-emerald-500',
        bg: 'from-green-950/30 to-slate-900',
        border: 'border-green-800/40'
    }
}

function LiveCard({ stream, onWatch }: { stream: LiveStream; onWatch: (s: LiveStream) => void }) {
    const cfg = PLATFORM_CONFIG[stream.platform]

    return (
        <div className={`relative flex flex-col rounded-2xl border bg-gradient-to-br ${cfg.bg} ${cfg.border} overflow-hidden transition-all duration-300 ${stream.is_live ? 'shadow-lg hover:shadow-xl hover:-translate-y-1' : 'opacity-60'}`}>
            <div className={`h-1 w-full bg-gradient-to-r ${cfg.gradient}`} />
            <div className="p-6 flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                            {stream.expert_name.charAt(0)}
                        </div>
                        <div>
                            <p className={`font-bold text-base ${cfg.color}`}>{cfg.label}</p>
                            <p className="text-sm text-slate-400">{stream.expert_name}</p>
                        </div>
                    </div>
                    {stream.is_live ? (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/40 flex items-center gap-1.5 px-3 py-1">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            AO VIVO
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-slate-500 border-slate-700">
                            <WifiOff className="w-3 h-3 mr-1" />
                            Offline
                        </Badge>
                    )}
                </div>

                {stream.is_live && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Wifi className="w-4 h-4 text-green-500" />
                        <span>Expert online agora</span>
                    </div>
                )}

                {!stream.is_live && (
                    <p className="text-sm text-slate-500">
                        O expert desta plataforma está offline. Volte mais tarde!
                    </p>
                )}

                <Button
                    onClick={() => onWatch(stream)}
                    disabled={!stream.is_live}
                    className={`w-full mt-2 font-bold gap-2 ${stream.is_live
                        ? `bg-gradient-to-r ${cfg.gradient} hover:opacity-90 text-white shadow-md`
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                >
                    <Play className="w-4 h-4" />
                    {stream.is_live ? 'Assistir Agora' : 'Aguardando Expert'}
                </Button>
            </div>
        </div>
    )
}

export default function LivePage() {
    const [streams, setStreams] = useState<LiveStream[]>([])
    const [activeStream, setActiveStream] = useState<LiveStream | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchStreams = async () => {
            const { data } = await supabase.from('live_streams').select('*').order('platform')
            if (data) setStreams(data)
            setLoading(false)
        }

        fetchStreams()

        const channel = supabase
            .channel('live_streams_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, () => {
                fetchStreams()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [supabase])

    // Viewer Mode — same pattern as casino iframe
    if (activeStream) {
        const cfg = PLATFORM_CONFIG[activeStream.platform]

        return (
            <div className="flex flex-col h-[calc(100vh-4rem)]">
                {/* Header Controls */}
                <div className="flex items-center justify-between border-b border-white/10 bg-background/95 backdrop-blur-xl px-4 py-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="font-semibold">{activeStream.expert_name}</span>
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-xs">AO VIVO</Badge>
                        <span className={`text-sm ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {activeStream.stream_url && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(activeStream.stream_url!, '_blank', 'noopener,noreferrer')}
                                className="gap-2"
                            >
                                <ExternalLink className="h-4 w-4" />
                                Abrir em Nova Aba
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setActiveStream(null)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Iframe Container */}
                <div className="flex-1 relative bg-slate-950">
                    {/* Fallback message (shows if iframe is blocked) */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none z-10">
                        <div className="pointer-events-auto space-y-3 text-center max-w-md p-6 rounded-xl bg-background/95 backdrop-blur-xl border border-white/10">
                            <Shield className="h-12 w-12 mx-auto text-amber-500" />
                            <p className="text-sm font-medium">Se a live não carregar aqui, use o botão abaixo</p>
                            <Button
                                onClick={() => window.open(activeStream.stream_url!, '_blank', 'noopener,noreferrer')}
                                className={`bg-gradient-to-r ${cfg.gradient} text-white`}
                            >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Abrir Live em Nova Aba
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                Algumas plataformas (como Google Meet) bloqueiam incorporação por segurança.
                            </p>
                        </div>
                    </div>

                    {/* Main Iframe */}
                    {activeStream.stream_url && (
                        <iframe
                            src={activeStream.stream_url}
                            className="w-full h-full relative z-20"
                            title={`Live ${activeStream.expert_name}`}
                            allow="camera; microphone; fullscreen; display-capture; autoplay"
                            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation"
                        />
                    )}
                </div>

                {/* Warning Bar */}
                <div className="flex items-center justify-center gap-2 border-t border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs shrink-0">
                    <Shield className="h-3 w-3 text-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400">
                        Jogue com responsabilidade. Nunca aposte mais do que pode perder.
                    </span>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Hero */}
            <div className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-background via-background to-red-500/5">
                <div className="absolute inset-0">
                    <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-red-500/10 blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />
                </div>
                <div className="container relative mx-auto px-4 py-12 sm:px-6">
                    <div className="mx-auto max-w-3xl text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 p-4">
                                <Radio className="h-10 w-10 text-red-400 animate-pulse" />
                            </div>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight">
                            <span className="bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                                Lives dos Experts
                            </span>
                        </h1>
                        <p className="text-muted-foreground">
                            Assista ao vivo os experts jogando nas plataformas parceiras e aprenda estratégias em tempo real.
                        </p>
                    </div>
                </div>
            </div>

            {/* Cards */}
            <div className="container mx-auto px-4 py-10 sm:px-6">
                <div className="mx-auto max-w-5xl">
                    {loading ? (
                        <div className="grid gap-6 md:grid-cols-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900 h-64 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-3">
                            {[...streams]
                                .sort((a, b) => (b.is_live ? 1 : 0) - (a.is_live ? 1 : 0))
                                .map(stream => (
                                    <LiveCard key={stream.id} stream={stream} onWatch={setActiveStream} />
                                ))}
                        </div>
                    )}

                    <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center space-y-2">
                        <p className="text-sm text-slate-400">
                            💡 Quando um expert iniciar uma live, o card fica disponível para assistir diretamente aqui.
                        </p>
                        <p className="text-xs text-slate-500">
                            A página atualiza automaticamente quando um expert entra ou sai ao vivo.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
