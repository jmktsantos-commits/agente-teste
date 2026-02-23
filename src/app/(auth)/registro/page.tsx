"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/ui/phone-input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Gift } from "lucide-react"

export default function RegisterPage() {
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [phone, setPhone] = useState("")
    const [birthDate, setBirthDate] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [btag, setBtag] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    // Capture btag from URL and persist in localStorage
    useEffect(() => {
        const urlBtag = searchParams.get("btag")
        if (urlBtag) {
            localStorage.setItem("affiliate_btag", urlBtag)
            setBtag(urlBtag)
        } else {
            const stored = localStorage.getItem("affiliate_btag")
            if (stored) setBtag(stored)
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

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                    data: {
                        full_name: `${firstName} ${lastName}`.trim(),
                        first_name: firstName,
                        last_name: lastName,
                        phone: phone,
                        birth_date: birthDate,
                        btag: btag || undefined,
                    }
                },
            })

            if (error) {
                throw error
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
                {btag && (
                    <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-600">
                        <Gift className="w-4 h-4" />
                        Você foi indicado por um afiliado! 🎉
                    </div>
                )}
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Criar conta</CardTitle>
                    <CardDescription>
                        Comece a usar o Aviator Pro hoje mesmo
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <div className="text-center space-y-4">
                            <div className="text-green-500 font-medium">
                                Cadastro realizado com sucesso!
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Verifique seu email para confirmar sua conta.
                            </p>
                            <Button asChild className="w-full">
                                <Link href="/login">Ir para Login</Link>
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
                                Criar conta
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
