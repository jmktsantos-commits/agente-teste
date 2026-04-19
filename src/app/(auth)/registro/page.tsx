"use client"

import { Suspense, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/ui/phone-input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Gift } from "lucide-react"

function RegisterForm() {
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [phone, setPhone] = useState("")
    const [birthDate, setBirthDate] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [id1para1, setId1para1] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [btag, setBtag] = useState<string | null>(null)
    const [trialRef, setTrialRef] = useState<string | null>(null)
    const [isTrial, setIsTrial] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    // Capture btag, trial ref from URL and persist in localStorage
    useEffect(() => {
        const urlBtag = searchParams.get("btag")
        if (urlBtag) {
            localStorage.setItem("affiliate_btag", urlBtag)
            setBtag(urlBtag)
        } else {
            const stored = localStorage.getItem("affiliate_btag")
            if (stored) setBtag(stored)
        }

        // Capturar parâmetros de trial
        const ref = searchParams.get("ref")
        const trial = searchParams.get("trial")
        if (ref) {
            localStorage.setItem("trial_ref", ref)
            setTrialRef(ref)
        } else {
            const storedRef = localStorage.getItem("trial_ref")
            if (storedRef) setTrialRef(storedRef)
        }
        if (trial === "true") {
            localStorage.setItem("activate_trial", "true")
            setIsTrial(true)
        } else if (localStorage.getItem("activate_trial") === "true") {
            setIsTrial(true)
        }
    }, [searchParams])

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (password !== confirmPassword) {
            setError("As senhas não coincidem")
            setLoading(false)
            return
        }

        // Validar ID 1PARA1
        const id1Clean = id1para1.replace(/\D/g, '')
        if (id1Clean.length !== 9) {
            setError("O ID 1PARA1 deve conter exatamente 9 dígitos numéricos.")
            setLoading(false)
            return
        }

        try {
            const redirectTo = `${window.location.origin}/aguardando-aprovacao`

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: redirectTo,
                    data: {
                        full_name: `${firstName} ${lastName}`.trim(),
                        first_name: firstName,
                        last_name: lastName,
                        phone: phone,
                        birth_date: birthDate,
                        btag: btag || undefined,
                        id_1para1: id1Clean,   // ← salva no user_metadata
                    }
                },
            })

            if (error) throw error

            // Se confirmação de email está desabilitada no Supabase, o usuário já está logado
            if (data.session) {
                // Forçar status = 'pending' e last_seen = null (independente do trigger)
                await fetch('/api/auth/set-pending', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: data.session.user.id, id1para1: id1Clean }),
                })
                // IMPORTANTE: deslogar imediatamente — só acessa após aprovacão do admin
                await supabase.auth.signOut()
                router.push('/aguardando-aprovacao')
                return
            }

            setSuccess(true)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-md">
                {isTrial && (
                    <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-600">
                        <Gift className="w-4 h-4" />
                        🎁 Você terá 7 dias de acesso gratuito após o cadastro!
                    </div>
                )}
                {btag && !isTrial && (
                    <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-600">
                        <Gift className="w-4 h-4" />
                        Você foi indicado por um afiliado! 🎉
                    </div>
                )}
                {/* Banner 1PARA1 */}
                <a
                    href="https://1pra1.bet.br/Jean"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-xl border border-purple-500/40 bg-gradient-to-r from-purple-600/20 to-violet-600/10 px-4 py-3 text-sm transition-all hover:border-purple-400/60 hover:bg-purple-600/25 group"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🎰</span>
                        <div>
                            <p className="font-semibold text-purple-200 leading-tight">
                                Ainda não tem cadastro na 1PARA1?
                            </p>
                            <p className="text-xs text-purple-300/80 mt-0.5">
                                Cadastre-se agora e pegue seu <strong className="text-purple-200">ID de Acesso</strong>
                            </p>
                        </div>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-white bg-purple-600 group-hover:bg-purple-500 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap">
                        Cadastrar →
                    </span>
                </a>

                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Criar conta</CardTitle>
                    <CardDescription>
                        Comece a usar o Nexa Plataforma hoje mesmo
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <div className="text-center space-y-4 py-4">
                            <div className="text-5xl">⏳</div>
                            <div className="text-emerald-500 font-semibold text-lg">
                                Cadastro realizado!
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Sua conta foi criada. Aguarde a aprovação do administrador para acessar a plataforma.
                                Você receberá um aviso assim que for aprovado.
                            </p>
                            <Button asChild className="w-full">
                                <Link href="/login">Voltar ao Login</Link>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">Nome</Label>
                                    <Input
                                        id="firstName"
                                        placeholder="João"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Sobrenome</Label>
                                    <Input
                                        id="lastName"
                                        placeholder="Silva"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefone</Label>
                                <PhoneInput
                                    id="phone"
                                    value={phone}
                                    onChange={setPhone}
                                    required
                                    placeholder="(11) 99999-9999"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="birthDate">Data de Nascimento</Label>
                                <Input
                                    id="birthDate"
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    required
                                />
                            </div>

                            {/* ID 1PARA1 */}
                            <div className="space-y-2">
                                <Label htmlFor="id1para1">
                                    ID 1PARA1 <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="id1para1"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="000000000 (9 dígitos)"
                                    value={id1para1}
                                    onChange={(e) => {
                                        // Aceita apenas dígitos, máximo 9
                                        const v = e.target.value.replace(/\D/g, '').slice(0, 9)
                                        setId1para1(v)
                                    }}
                                    maxLength={9}
                                    required
                                    className={id1para1.length > 0 && id1para1.length !== 9 ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Seu ID da plataforma 1PARA1 — 9 dígitos numéricos.
                                    {id1para1.length > 0 && (
                                        <span className={id1para1.length === 9 ? 'text-emerald-500 ml-1' : 'text-red-400 ml-1'}>
                                            {id1para1.length}/9
                                        </span>
                                    )}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                            {error && <div className="text-sm text-red-500">{error}</div>}
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isTrial ? "🎁 Criar conta e ativar trial gratuito" : "Criar conta"}
                            </Button>
                        </form>
                    )}
                </CardContent>
                {!success && (
                    <CardFooter className="justify-center">
                        <p className="text-sm text-muted-foreground">
                            Já tem uma conta?{" "}
                            <Link href="/login" className="text-primary hover:underline">
                                Entrar
                            </Link>
                        </p>
                    </CardFooter>
                )}
            </Card>
        </div>
    )
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center p-4 bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <RegisterForm />
        </Suspense>
    )
}
