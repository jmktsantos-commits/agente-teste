"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Loader2, Globe, ShieldCheck, Bell } from "lucide-react"

export default function SettingsPage() {
    const [loading, setLoading] = useState(false)

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

    const handleSave = async () => {
        setLoading(true)
        // TODO: Save to admin_settings table
        setTimeout(() => {
            setLoading(false)
            alert("Configurações salvas com sucesso!")
        }, 1000)
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
                <p className="text-muted-foreground mt-1">Gerencie as configurações gerais da plataforma.</p>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="general" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Geral
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Segurança
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Alertas
                    </TabsTrigger>
                </TabsList>

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
                                <Save className="mr-2 h-4 w-4" />
                                Salvar
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
                                <Save className="mr-2 h-4 w-4" />
                                Salvar
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
                                <Save className="mr-2 h-4 w-4" />
                                Salvar
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
