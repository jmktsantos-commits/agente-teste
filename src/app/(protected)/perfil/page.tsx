"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Calendar, Mail, Phone, User, Shield, GitMerge, ExternalLink, Copy, CheckCircle } from "lucide-react"
import Link from "next/link"


export default function ProfilePage() {
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [affiliate, setAffiliate] = useState<any>(null)
    const [copied, setCopied] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        const getProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                const { data } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single()

                setProfile(data || { email: user.email })

                // Load affiliate data if user is affiliate
                if (data?.role === "affiliate") {
                    const { data: aff } = await supabase
                        .from("affiliates")
                        .select("btag, commission_rate, status")
                        .eq("id", user.id)
                        .single()
                    setAffiliate(aff)
                }
            }
            setLoading(false)
        }

        getProfile()
    }, [])

    if (loading) {
        return <div className="flex h-full items-center justify-center p-8">Carregando perfil...</div>
    }

    if (!profile) {
        return <div className="p-8">Não foi possível carregar o perfil.</div>
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return "Não informado"
        return new Date(dateString).toLocaleDateString('pt-BR')
    }

    return (
        <div className="container max-w-2xl mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8">Meu Perfil</h1>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-10 w-10 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">{profile.full_name || "Usuário"}</CardTitle>
                            <CardDescription>{profile.email}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-4 w-4" /> Email
                            </Label>
                            <div className="font-medium">{profile.email}</div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-4 w-4" /> Telefone
                            </Label>
                            <div className="font-medium">{profile.phone || "Não informado"}</div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" /> Data de Nascimento
                            </Label>
                            <div className="font-medium">{formatDate(profile.birth_date)}</div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-muted-foreground">
                                <Shield className="h-4 w-4" /> Tipo de Conta
                            </Label>
                            <div>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${profile.role === 'admin'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                    : profile.role === 'affiliate'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    }`}>
                                    {profile.role === 'admin' ? 'Administrador' : profile.role === 'affiliate' ? 'Afiliado' : 'Usuário'}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="text-xl">Configurações</CardTitle>
                    <CardDescription>Personalize sua experiência na plataforma</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                        <div className="space-y-0.5">
                            <Label className="text-base">Relógio Flutuante (Brasília)</Label>
                            <p className="text-sm text-muted-foreground">
                                Exibe um relógio flutuante com horário oficial de Brasília (UTC-3).
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Label htmlFor="floating-clock-mode" className="sr-only">Relógio Flutuante</Label>
                            <input
                                id="floating-clock-mode"
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500 accent-pink-500"
                                checked={typeof window !== 'undefined' && localStorage.getItem('showFloatingClock') === 'true'}
                                onChange={(e) => {
                                    const isChecked = e.target.checked
                                    localStorage.setItem('showFloatingClock', isChecked.toString())
                                    // Custom event to notify the floating component immediately
                                    window.dispatchEvent(new Event('floating-clock-toggle'))
                                    // Force re-render to update checkbox state
                                    const event = new Event('storage')
                                    window.dispatchEvent(event)
                                }}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Affiliate Panel Card — only shown for affiliates */}
            {profile.role === "affiliate" && (
                <Card className="mt-8 border-emerald-500/30 bg-emerald-500/5">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <GitMerge className="w-5 h-5 text-emerald-500" />
                            Painel Afiliado
                        </CardTitle>
                        <CardDescription>
                            Acesse seu painel exclusivo de afiliado e acompanhe seus resultados.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {affiliate && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="rounded-lg border bg-background p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Seu B-Tag</p>
                                    <code className="font-mono font-bold text-sm">{affiliate.btag}</code>
                                </div>
                                <div className="rounded-lg border bg-background p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Comissão</p>
                                    <p className="font-bold text-sm text-emerald-500">{affiliate.commission_rate}%</p>
                                </div>
                                <div className="rounded-lg border bg-background p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                                    <p className={`font-bold text-sm ${affiliate.status === 'active' ? 'text-emerald-500' :
                                        affiliate.status === 'pending' ? 'text-yellow-500' : 'text-red-500'
                                        }`}>
                                        {affiliate.status === 'active' ? 'Ativo' : affiliate.status === 'pending' ? 'Pendente' : 'Suspenso'}
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <Link
                                href="/affiliate"
                                className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-sm font-semibold transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Acessar Painel de Afiliado
                            </Link>
                            {affiliate?.btag && (
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/registro?btag=${affiliate.btag}`)
                                        setCopied(true)
                                        setTimeout(() => setCopied(false), 2000)
                                    }}
                                    className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-background hover:bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold transition-colors"
                                >
                                    {copied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                    {copied ? "Copiado!" : "Copiar Link de Indicação"}
                                </button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
