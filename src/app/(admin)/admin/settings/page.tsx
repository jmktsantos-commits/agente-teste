"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Loader2, Globe, ShieldCheck, Bell, Video, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react"

export default function SettingsPage() {
    const [loading, setLoading] = useState(false)
    const [videoLoading, setVideoLoading] = useState(false)
    const [videoSuccess, setVideoSuccess] = useState(false)
    const [videoError, setVideoError] = useState<string | null>(null)

    // General settings
    const [platformName, setPlatformName] = useState("Aviator Pro")
    const [maintenanceMode, setMaintenanceMode] = useState(false)
    const [registrationOpen, setRegistrationOpen] = useState(true)

    // Security settings
    const [sessionTimeout, setSessionTimeout] = useState("60")
    const [maxAttempts, setMaxAttempts] = useState("5")
    const [twoFactor, setTwoFactor] = useState(false)

    // Notification settings
    const [emailNotifications, setEmailNotifications] = useState(true)
    const [pushNotifications, setPushNotifications] = useState(true)
    const [weeklyReport, setWeeklyReport] = useState(false)

    // Content settings
    const [welcomeVideoUrl, setWelcomeVideoUrl] = useState("")
    const [currentVideo, setCurrentVideo] = useState<{ value: string; parsed: { type: string; id: string } | null } | null>(null)

    // Load current video URL on mount
    useEffect(() => {
        fetch("/api/admin/site-settings?key=welcome_video_url")
            .then(r => r.json())
            .then(data => {
                if (data.value !== undefined) {
                    setWelcomeVideoUrl(data.value ?? "")
                    setCurrentVideo(data)
                }
            })
            .catch(() => { })
    }, [])

    const handleSave = async () => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
            alert("Configurações salvas com sucesso!")
        }, 1000)
    }

    const handleSaveVideo = async () => {
        setVideoLoading(true)
        setVideoSuccess(false)
        setVideoError(null)

        try {
            const res = await fetch("/api/admin/site-settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: "welcome_video_url", value: welcomeVideoUrl.trim() }),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Erro ao salvar")
            }

            // Refresh preview
            const updated = await fetch("/api/admin/site-settings?key=welcome_video_url").then(r => r.json())
            setCurrentVideo(updated)
            setVideoSuccess(true)
            setTimeout(() => setVideoSuccess(false), 3000)
        } catch (err: any) {
            setVideoError(err.message)
        } finally {
            setVideoLoading(false)
        }
    }

    const getEmbedUrl = () => {
        if (!currentVideo?.parsed) return null
        if (currentVideo.parsed.type === "youtube") {
            return `https://www.youtube.com/embed/${currentVideo.parsed.id}?rel=0&modestbranding=1`
        }
        if (currentVideo.parsed.type === "vimeo") {
            return `https://player.vimeo.com/video/${currentVideo.parsed.id}`
        }
        return null
    }

    const embedUrl = getEmbedUrl()

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
                <p className="text-muted-foreground mt-1">Gerencie as configurações gerais da plataforma.</p>
            </div>

            <Tabs defaultValue="conteudo" className="space-y-6">
                <TabsList className="grid w-full max-w-lg grid-cols-4">
                    <TabsTrigger value="conteudo" className="flex items-center gap-1.5">
                        <Video className="h-4 w-4" />
                        Conteúdo
                    </TabsTrigger>
                    <TabsTrigger value="general" className="flex items-center gap-1.5">
                        <Globe className="h-4 w-4" />
                        Geral
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4" />
                        Segurança
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="flex items-center gap-1.5">
                        <Bell className="h-4 w-4" />
                        Alertas
                    </TabsTrigger>
                </TabsList>

                {/* ── CONTEÚDO — Vídeo de Boas-Vindas ─────────────────────── */}
                <TabsContent value="conteudo">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Video className="h-5 w-5 text-purple-500" />
                                Vídeo de Boas-Vindas
                            </CardTitle>
                            <CardDescription>
                                Este vídeo aparece na tela inicial para todos os usuários após o login.
                                Cole a URL do YouTube ou Vimeo abaixo.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="video-url" className="text-sm font-medium">
                                    URL do Vídeo
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="video-url"
                                        placeholder="https://www.youtube.com/watch?v=... ou https://vimeo.com/..."
                                        value={welcomeVideoUrl}
                                        onChange={e => { setWelcomeVideoUrl(e.target.value); setVideoSuccess(false); setVideoError(null) }}
                                        className="flex-1"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Aceita links do YouTube (<code>youtu.be/...</code>, <code>youtube.com/watch?v=...</code>) e Vimeo (<code>vimeo.com/...</code>).
                                </p>

                                {/* Status messages */}
                                {videoSuccess && (
                                    <div className="flex items-center gap-2 text-sm text-emerald-500">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Vídeo atualizado com sucesso! Já está visível para os usuários.
                                    </div>
                                )}
                                {videoError && (
                                    <div className="flex items-center gap-2 text-sm text-red-500">
                                        <AlertCircle className="h-4 w-4" />
                                        {videoError}
                                    </div>
                                )}
                            </div>

                            {/* Preview do vídeo atual */}
                            {embedUrl ? (
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-muted-foreground">Pré-visualização atual</Label>
                                    <div className="relative w-full overflow-hidden rounded-xl border border-white/10" style={{ paddingBottom: "56.25%" }}>
                                        <iframe
                                            className="absolute inset-0 w-full h-full"
                                            src={embedUrl}
                                            title="Preview vídeo boas-vindas"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                    {currentVideo?.value && (
                                        <a
                                            href={currentVideo.value}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                            Abrir vídeo original
                                        </a>
                                    )}
                                </div>
                            ) : currentVideo?.value ? (
                                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-500">
                                    URL salva mas não foi possível identificar como YouTube ou Vimeo.
                                    Verifique o link e tente novamente.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-muted-foreground">
                                    Nenhum vídeo configurado ainda.
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSaveVideo} disabled={videoLoading}>
                                {videoLoading
                                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                                    : <><Save className="mr-2 h-4 w-4" />Salvar Vídeo</>
                                }
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* General Settings */}
                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configurações Gerais</CardTitle>
                            <CardDescription>Defina o nome da plataforma e controles básicos.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="platform-name">Nome da Plataforma</Label>
                                <Input id="platform-name" value={platformName} onChange={e => setPlatformName(e.target.value)} />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label>Modo Manutenção</Label>
                                    <p className="text-xs text-muted-foreground">Bloqueia o acesso de usuários ao site.</p>
                                </div>
                                <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label>Registro de Novos Usuários</Label>
                                    <p className="text-xs text-muted-foreground">Permite que novos usuários se cadastrem.</p>
                                </div>
                                <Switch checked={registrationOpen} onCheckedChange={setRegistrationOpen} />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSave} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" />Salvar
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* Security Settings */}
                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle>Segurança</CardTitle>
                            <CardDescription>Configure políticas de acesso e autenticação.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="session-timeout">Timeout de Sessão (minutos)</Label>
                                <Input id="session-timeout" type="number" value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} />
                                <p className="text-xs text-muted-foreground">Tempo máximo de inatividade antes do logout automático.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="max-attempts">Máx. Tentativas de Login</Label>
                                <Input id="max-attempts" type="number" value={maxAttempts} onChange={e => setMaxAttempts(e.target.value)} />
                                <p className="text-xs text-muted-foreground">Bloqueia a conta após ultrapassar o limite.</p>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label>Autenticação 2 Fatores</Label>
                                    <p className="text-xs text-muted-foreground">Exigir 2FA para todos os usuários.</p>
                                </div>
                                <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSave} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" />Salvar
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* Notification Settings */}
                <TabsContent value="notifications">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notificações e Alertas</CardTitle>
                            <CardDescription>Configure como e quando receber alertas.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label>Notificações por E-mail</Label>
                                    <p className="text-xs text-muted-foreground">Receba alertas importantes por e-mail.</p>
                                </div>
                                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label>Push Notifications</Label>
                                    <p className="text-xs text-muted-foreground">Alertas em tempo real no navegador.</p>
                                </div>
                                <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label>Relatório Semanal</Label>
                                    <p className="text-xs text-muted-foreground">Resumo semanal enviado por e-mail.</p>
                                </div>
                                <Switch checked={weeklyReport} onCheckedChange={setWeeklyReport} />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSave} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" />Salvar
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
