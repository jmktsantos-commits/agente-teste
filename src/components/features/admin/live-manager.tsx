'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Radio, Save, Loader2, WifiOff, Wifi } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface LiveStream {
    id: string
    platform: string
    is_live: boolean
    stream_url: string | null
    expert_name: string
}

const PLATFORMS = [
    { id: 'bravobet', label: 'Bravobet', color: 'text-orange-400', dotColor: 'bg-orange-500', border: 'border-orange-800/40', bg: 'from-orange-950/20 to-transparent' },
    { id: 'superbet', label: 'Superbet', color: 'text-indigo-400', dotColor: 'bg-indigo-500', border: 'border-indigo-800/40', bg: 'from-indigo-950/20 to-transparent' },
    { id: 'esportivabet', label: 'EsportivaBet', color: 'text-green-400', dotColor: 'bg-green-500', border: 'border-green-800/40', bg: 'from-green-950/20 to-transparent' },
]

export function LiveManager() {
    const [streams, setStreams] = useState<LiveStream[]>([])
    const [saving, setSaving] = useState<string | null>(null)
    const [localState, setLocalState] = useState<Record<string, { url: string; expert: string; is_live: boolean }>>({})
    const supabase = createClient()

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase.from('live_streams').select('*').order('platform')
            if (data) {
                setStreams(data)
                const init: Record<string, { url: string; expert: string; is_live: boolean }> = {}
                data.forEach((s: LiveStream) => {
                    init[s.platform] = { url: s.stream_url ?? '', expert: s.expert_name, is_live: s.is_live }
                })
                setLocalState(init)
            }
        }
        fetch()
    }, [supabase])

    const handleSave = async (platform: string) => {
        setSaving(platform)
        const state = localState[platform]
        await supabase.from('live_streams').update({
            is_live: state.is_live,
            stream_url: state.url || null,
            expert_name: state.expert,
            started_at: state.is_live ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
        }).eq('platform', platform)
        setSaving(null)
    }

    const update = (platform: string, field: string, value: any) => {
        setLocalState(prev => ({ ...prev, [platform]: { ...prev[platform], [field]: value } }))
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Radio className="h-5 w-5 text-red-500" />
                    <div>
                        <CardTitle className="text-base">Gerenciar Lives</CardTitle>
                        <CardDescription>Ative experts ao vivo e defina o link de acesso por plataforma</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {PLATFORMS.map(platform => {
                    const state = localState[platform.id]
                    if (!state) return null
                    const isSaving = saving === platform.id

                    return (
                        <div key={platform.id} className={`rounded-xl border bg-gradient-to-r ${platform.bg} ${platform.border} p-4 space-y-3`}>
                            {/* Platform Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={`font-semibold ${platform.color}`}>{platform.label}</span>
                                    {state.is_live ? (
                                        <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-xs flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                            AO VIVO
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-slate-500 border-slate-700 text-xs">Offline</Badge>
                                    )}
                                </div>

                                {/* Toggle Button */}
                                <Button
                                    size="sm"
                                    variant={state.is_live ? 'destructive' : 'outline'}
                                    onClick={() => update(platform.id, 'is_live', !state.is_live)}
                                    className="gap-1.5 h-8 text-xs"
                                >
                                    {state.is_live ? (
                                        <><WifiOff className="w-3 h-3" /> Encerrar</>
                                    ) : (
                                        <><Wifi className="w-3 h-3" /> Ativar Live</>
                                    )}
                                </Button>
                            </div>

                            {/* Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Nome do Expert</Label>
                                    <Input
                                        value={state.expert}
                                        onChange={e => update(platform.id, 'expert', e.target.value)}
                                        placeholder="Ex: Expert João"
                                        className="h-8 text-sm bg-slate-900 border-slate-700"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Link da Live (Google Meet, YouTube, etc.)</Label>
                                    <Input
                                        value={state.url}
                                        onChange={e => update(platform.id, 'url', e.target.value)}
                                        placeholder="https://meet.google.com/xxx-xxxx-xxx"
                                        className="h-8 text-sm bg-slate-900 border-slate-700"
                                    />
                                </div>
                            </div>

                            {/* Save */}
                            <div className="flex justify-end">
                                <Button
                                    size="sm"
                                    onClick={() => handleSave(platform.id)}
                                    disabled={isSaving}
                                    className="h-8 text-xs gap-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600"
                                >
                                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    Salvar
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    )
}
