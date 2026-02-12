"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Loader2, Send, Save } from "lucide-react"

export default function CommunicationsPage() {
    const [loading, setLoading] = useState(false)

    // Push State
    const [pushTitle, setPushTitle] = useState("")
    const [pushBody, setPushBody] = useState("")

    // Popup State
    const [popupActive, setPopupActive] = useState(false)
    const [popupContent, setPopupContent] = useState("")

    const handleSendPush = async () => {
        setLoading(true)
        // TODO: Call API to trigger n8n webhook
        // await fetch('/api/admin/push', { method: 'POST', body: JSON.stringify({ title: pushTitle, body: pushBody }) })

        setTimeout(() => {
            setLoading(false)
            alert("Notificação enviada para a fila de processamento!")
            setPushTitle("")
            setPushBody("")
        }, 1500)
    }

    const handleSavePopup = async () => {
        setLoading(true)
        // TODO: Save to admin_settings table
        setTimeout(() => {
            setLoading(false)
            alert("Configurações de Pop-up salvas!")
        }, 1000)
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Comunicações</h1>
                <p className="text-muted-foreground">Envie notificações e configure alertas para os usuários.</p>
            </div>

            <Tabs defaultValue="push" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="push">Push Notifications</TabsTrigger>
                    <TabsTrigger value="popup">Pop-ups do Site</TabsTrigger>
                </TabsList>

                <TabsContent value="push">
                    <Card>
                        <CardHeader>
                            <CardTitle>Enviar Notificação Push</CardTitle>
                            <CardDescription>
                                Envie mensagens para todos os dispositivos ativos ou segmentos específicos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Título</Label>
                                <Input placeholder="Ex: Bônus de Depósito!" value={pushTitle} onChange={e => setPushTitle(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Mensagem</Label>
                                <Textarea placeholder="Digite o conteúdo da notificação..." value={pushBody} onChange={e => setPushBody(e.target.value)} />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSendPush} disabled={loading || !pushTitle || !pushBody}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Send className="mr-2 h-4 w-4" />
                                Enviar Agora
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="popup">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuração de Pop-up</CardTitle>
                            <CardDescription>
                                Exiba um modal de alerta para todos os usuários ao entrarem no painel.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Switch id="popup-active" checked={popupActive} onCheckedChange={setPopupActive} />
                                <Label htmlFor="popup-active">Pop-up Ativo</Label>
                            </div>
                            <div className="space-y-2">
                                <Label>Conteúdo (HTML Permitido)</Label>
                                <Textarea
                                    className="min-h-[150px]"
                                    placeholder="<h3>Aviso Importante</h3><p>Manutenção programada...</p>"
                                    value={popupContent}
                                    onChange={e => setPopupContent(e.target.value)}
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSavePopup} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" />
                                Salvar Configuração
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
