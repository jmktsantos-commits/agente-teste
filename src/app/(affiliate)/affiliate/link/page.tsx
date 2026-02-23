"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { getMyAffiliateData } from "@/app/actions/affiliate-actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Link, Copy, CheckCircle, QrCode, Share2, Loader2 } from "lucide-react"

export default function AffiliateLinkPage() {
    const [affiliate, setAffiliate] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { affiliate: aff } = await getMyAffiliateData(user.id)
            setAffiliate(aff)
            setLoading(false)
        }
        load()
    }, [])

    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const referralLink = affiliate ? `${origin}/registro?btag=${affiliate.btag}` : ""

    const copyLink = () => {
        navigator.clipboard.writeText(referralLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const shareLink = () => {
        if (navigator.share) {
            navigator.share({ title: "Aviator Pro", url: referralLink })
        }
    }

    const whatsappMsg = `Olá! Venha usar o Aviator Pro, a melhor plataforma de análise: ${referralLink}`

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Meu Link de Indicação</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Compartilhe este link para captar novos leads vinculados à sua conta.
                </p>
            </div>

            <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Link className="w-4 h-4 text-emerald-500" />
                        Seu Link Personalizado
                    </CardTitle>
                    <CardDescription>
                        B-Tag: <code className="font-mono font-bold text-foreground">{affiliate?.btag}</code>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input readOnly value={referralLink} className="font-mono text-sm" />
                        <Button onClick={copyLink} className="gap-2 shrink-0">
                            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? "Copiado!" : "Copiar"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold">Compartilhar via WhatsApp</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`, "_blank")}
                        >
                            <Share2 className="w-4 h-4" />
                            Enviar pelo WhatsApp
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold">Compartilhamento Nativo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full gap-2" onClick={shareLink}>
                            <Share2 className="w-4 h-4" />
                            Compartilhar Link
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-semibold">Como Funciona?</CardTitle>
                </CardHeader>
                <CardContent>
                    <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
                        <li>Compartilhe seu link único com potenciais clientes.</li>
                        <li>Quando alguém se cadastra pelo seu link, eles ficam vinculados à sua conta como seu lead.</li>
                        <li>Quando um lead converte (compra), você recebe uma comissão de <strong className="text-foreground">{affiliate?.commission_rate}%</strong>.</li>
                        <li>Acompanhe seus leads e comissões pelo painel.</li>
                    </ol>
                </CardContent>
            </Card>
        </div>
    )
}
