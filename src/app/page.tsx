"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import {
  ArrowRight, Zap, ShieldCheck, BarChart3, Users, CheckCircle, Star,
  TrendingUp, Clock, Brain, Trophy, ChevronDown, MessageCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const CHECKOUT_STARTER = process.env.NEXT_PUBLIC_CHECKOUT_MENSAL || "https://sandbox.asaas.com/c/9g65d6vkig15fsu7"
const CHECKOUT_ANUAL = process.env.NEXT_PUBLIC_CHECKOUT_ANUAL || "https://sandbox.asaas.com/c/jtot6ozwz20sgnrm"
const CHECKOUT_BLACK = process.env.NEXT_PUBLIC_CHECKOUT_BLACK || "https://sandbox.asaas.com/c/wdj5s6op557z9txk"

// ── Countdown Timer ────────────────────────────────────────────────────────────
function Countdown() {
  const [time, setTime] = useState({ h: 2, m: 47, s: 33 })
  useEffect(() => {
    const t = setInterval(() => {
      setTime(prev => {
        let { h, m, s } = prev
        s--; if (s < 0) { s = 59; m-- }
        if (m < 0) { m = 59; h-- }
        if (h < 0) return { h: 2, m: 59, s: 59 }
        return { h, m, s }
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    <span className="font-mono font-bold text-amber-400">
      {pad(time.h)}:{pad(time.m)}:{pad(time.s)}
    </span>
  )
}

// ── Stat Counter ───────────────────────────────────────────────────────────────
function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl md:text-4xl font-black text-white">{value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
    </div>
  )
}

// ── Testimonial ────────────────────────────────────────────────────────────────
function Testimonial({ name, avatar, text, stars }: { name: string; avatar: string; text: string; stars: number }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 hover:border-purple-500/40 transition-colors">
      <div className="flex gap-0.5">
        {Array.from({ length: stars }).map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-slate-300 leading-relaxed text-sm">"{text}"</p>
      <div className="flex items-center gap-3 mt-auto">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {avatar}
        </div>
        <div>
          <p className="font-semibold text-white text-sm">{name}</p>
          <p className="text-xs text-slate-500">Membro AviatorPro</p>
        </div>
      </div>
    </div>
  )
}

// ── FAQ Item ────────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <span className="font-medium text-white pr-4">{q}</span>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-6 pb-5 text-sm text-slate-400 leading-relaxed">{a}</div>}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070714] text-white overflow-x-hidden selection:bg-purple-600/40">

      {/* ── Urgency Banner ──────────────────────────────────────────────── */}
      <div className="w-full bg-gradient-to-r from-purple-900/80 via-pink-900/80 to-purple-900/80 border-b border-white/10 py-2 text-center text-xs sm:text-sm">
        🔥 Oferta por tempo limitado: <Countdown /> restantes com desconto exclusivo
      </div>

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="fixed w-full z-50 top-8 left-0 bg-[#070714]/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-xl tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            AVIATOR<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">PRO</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hidden sm:inline-flex">
                Já sou membro
              </Button>
            </Link>
            <a href="#planos">
              <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-bold shadow-lg shadow-purple-900/30">
                Quero Acesso
              </Button>
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 md:pt-44 md:pb-32 overflow-hidden">
        {/* Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[500px] bg-pink-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-6 relative z-10 text-center max-w-5xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            🚀 +4.200 membros ativos agora
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
            <span className="text-white">Ganhe no Aviator com</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400">
              Inteligência Artificial
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Sinais em tempo real com <strong className="text-white">alta assertividade</strong>, gestão de banca profissional
            e comunidade VIP de lucros. Acesso exclusivo para membros.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <a href="#planos" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto h-14 px-10 text-lg font-bold rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 transition-all duration-200 shadow-2xl shadow-purple-900/50 flex items-center justify-center gap-2 hover:scale-[1.03]">
                Quero Acesso Agora <ArrowRight className="w-5 h-5" />
              </button>
            </a>
            <a href="#como-funciona" className="text-slate-400 hover:text-white text-sm underline underline-offset-4 transition-colors">
              Como funciona?
            </a>
          </div>

          {/* Trust signals below CTA */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-400" /> Acesso imediato por e-mail</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-400" /> Pagamento 100% seguro via PIX</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-400" /> Suporte 24/7</span>
          </div>
        </div>

        {/* Dashboard preview mockup */}
        <div className="container mx-auto px-6 mt-16 max-w-5xl relative z-10">
          <div className="rounded-2xl border border-white/10 bg-[#0f0f22]/90 backdrop-blur-xl p-3 shadow-2xl shadow-purple-900/20">
            <div className="rounded-xl bg-[#070714] overflow-hidden aspect-video relative border border-white/5 flex items-center justify-center">
              {/* Simulated dashboard UI */}
              <div className="absolute inset-0 p-4 flex flex-col gap-3">
                <div className="flex gap-2 items-center">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <div className="h-2 w-24 bg-white/10 rounded" />
                  <div className="ml-auto h-6 w-20 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 opacity-80" />
                </div>
                <div className="grid grid-cols-3 gap-2 flex-1">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
                    <div className="h-2 w-16 bg-white/20 rounded" />
                    <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">10x+</div>
                  </div>
                  <div className="col-span-2 bg-gradient-to-br from-purple-900/40 to-pink-900/20 rounded-xl border border-purple-500/20 p-3 flex flex-col gap-2">
                    <div className="h-2 w-20 bg-white/20 rounded" />
                    <div className="flex gap-1 flex-wrap">
                      {["1.8x", "3.2x", "12.4x", "2.1x", "5.6x", "1.4x", "8.9x", "2.3x"].map(v => (
                        <span key={v} className={cn("text-xs px-2 py-1 rounded font-bold",
                          parseFloat(v) > 5 ? "bg-pink-500/30 text-pink-300" : "bg-purple-500/20 text-purple-300"
                        )}>{v}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#070714] via-transparent to-transparent opacity-60" />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-bounce">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
                  🟢 SINAL AO VIVO: Entrada sugerida em 00:47
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STATS ──────────────────────────────────────────── */}
      <section className="py-10 border-y border-white/5 bg-white/[0.02]">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            <StatCard value="+4.200" label="Membros ativos" />
            <StatCard value="95%" label="Assertividade média" />
            <StatCard value="R$2.1M+" label="Lucros gerados" />
            <StatCard value="24/7" label="Sinais em tempo real" />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="como-funciona" className="py-24">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-16">
            <span className="text-purple-400 text-sm font-semibold uppercase tracking-widest">Simples e Rápido</span>
            <h2 className="text-3xl md:text-4xl font-black mt-2">Como funciona?</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 relative">
            {[
              { icon: <CheckCircle className="w-6 h-6 text-purple-400" />, step: "01", title: "Escolha seu Plano", desc: "Selecione o plano ideal e faça o pagamento via PIX em segundos, com total segurança." },
              { icon: <MessageCircle className="w-6 h-6 text-pink-400" />, step: "02", title: "Receba seu Acesso", desc: "Imediatamente após o pagamento, você receberá seu e-mail de acesso na sua caixa de entrada." },
              { icon: <TrendingUp className="w-6 h-6 text-amber-400" />, step: "03", title: "Comece a Lucrar", desc: "Acesse a plataforma, siga os sinais da IA e comece a acumular resultados no Aviator." },
            ].map(({ icon, step, title, desc }) => (
              <div key={step} className="relative bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-purple-500/30 transition-colors group">
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xs font-black">{step}</div>
                <div className="mb-4 w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">{icon}</div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-gradient-to-b from-[#070714] via-[#0d0d22] to-[#070714]">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-16">
            <span className="text-purple-400 text-sm font-semibold uppercase tracking-widest">O que você recebe</span>
            <h2 className="text-3xl md:text-4xl font-black mt-2">Tudo que você precisa para lucrar</h2>
            <p className="text-slate-400 mt-3 max-w-xl mx-auto text-sm">
              Uma plataforma completa construída para maximizar seus resultados no Aviator.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: <Brain className="w-6 h-6 text-purple-400" />, title: "IA de Sinais", desc: "Algoritmo treinado com milhões de rodadas. Indica o momento exato de entrada com alta precisão." },
              { icon: <BarChart3 className="w-6 h-6 text-pink-400" />, title: "Histórico Completo", desc: "Acesse o histórico de rodadas em tempo real com análise estatística de padrões." },
              { icon: <ShieldCheck className="w-6 h-6 text-green-400" />, title: "Gestão de Banca", desc: "Ferramentas de controle de risco para proteger seu capital e maximizar o crescimento." },
              { icon: <Trophy className="w-6 h-6 text-amber-400" />, title: "Comunidade VIP", desc: "Chat ao vivo com milhares de jogadores ativos compartilhando análises e estratégias." },
              { icon: <Clock className="w-6 h-6 text-blue-400" />, title: "Alertas 24/7", desc: "Notificações em tempo real direto no seu dispositivo. Nunca perca um sinal importante." },
              { icon: <Users className="w-6 h-6 text-orange-400" />, title: "Suporte Exclusivo", desc: "Atendimento dedicado por chat e e-mail para membros premium. Resolvemos seus problemas." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:border-purple-500/30 hover:bg-white/[0.06] transition-all group">
                <div className="mb-4 w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">{icon}</div>
                <h3 className="font-bold mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-12">
            <span className="text-purple-400 text-sm font-semibold uppercase tracking-widest">Depoimentos</span>
            <h2 className="text-3xl md:text-4xl font-black mt-2">O que nossos membros dizem</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Testimonial name="Lucas M." avatar="LM" stars={5} text="Em 3 dias já recuperei o valor da assinatura. Os sinais são muito precisos, melhor investimento que fiz no Aviator." />
            <Testimonial name="Rafael S." avatar="RS" stars={5} text="Antes perdia dinheiro sem critério. Agora com a gestão de banca e os sinais da IA, estou no lucro todo mês." />
            <Testimonial name="Ana P." avatar="AP" stars={5} text="Recebi o acesso em menos de 5 minutos após o pagamento. A plataforma é incrível, vale muito o investimento!" />
            <Testimonial name="Carlos T." avatar="CT" stars={5} text="A comunidade VIP é o diferencial. Aprender com outros membros e ver os resultados deles me motivou muito." />
            <Testimonial name="Juliana R." avatar="JR" stars={5} text="Nunca pensei que um sistema assim existia. Os sinais chegam na hora certa e o suporte é excelente." />
            <Testimonial name="Marcos F." avatar="MF" stars={5} text="Já testei vários grupos e serviços. O AviatorPro é de longe o mais profissional e mais lucrativo que usei." />
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────── */}
      <section id="planos" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto px-6 max-w-6xl relative z-10">
          <div className="text-center mb-14">
            <span className="text-purple-400 text-sm font-semibold uppercase tracking-widest">Planos</span>
            <h2 className="text-3xl md:text-4xl font-black mt-2">Escolha seu plano</h2>
            <p className="text-slate-400 mt-3 text-sm">
              🔥 Promoção por tempo limitado — <Countdown /> restantes
            </p>
          </div>

          {/* 3 Cards — Ancoragem de Preço */}
          <div className="flex flex-col md:flex-row items-stretch justify-center gap-4">

            {/* ── STARTER (Ancoragem inferior) ── */}
            <div className="w-full md:w-[29%] bg-white/[0.04] border border-white/10 rounded-2xl p-7 flex flex-col">
              <div className="mb-6">
                <span className="inline-block bg-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4">
                  STARTER — O Teste
                </span>
                <p className="text-slate-500 text-xs mb-5">Conheça a plataforma sem compromisso</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black text-white">R$47</span>
                  <span className="text-slate-400 mb-1.5 text-sm">/mês</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Cancele quando quiser</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {["Acesso à Plataforma", "Histórico e Análise de Velas Altas", "Gestão de Banca Inteligente", "📚 Curso Avançado Aviator", "Suporte via Chat"].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-400">
                    <CheckCircle className="w-4 h-4 text-green-400/50 shrink-0" /> {f}
                  </li>
                ))}
                <li className="flex items-center gap-2.5 text-sm text-slate-600">
                  <span className="w-4 h-4 shrink-0 text-center font-bold text-slate-700">✕</span>
                  <span className="line-through">Sinais no WhatsApp</span>
                </li>
                <li className="flex items-center gap-2.5 text-sm text-slate-600">
                  <span className="w-4 h-4 shrink-0 text-center font-bold text-slate-700">✕</span>
                  <span className="line-through">Mentoria Particular</span>
                </li>
              </ul>
              <a href={CHECKOUT_STARTER} target="_blank" rel="noopener noreferrer">
                <button className="w-full h-12 rounded-xl border border-white/20 text-slate-300 font-bold hover:bg-white/5 transition-colors text-sm">
                  Começar com Starter
                </button>
              </a>
            </div>

            {/* ── ANUAL — O Recomendado (card 10% maior, neon verde) ── */}
            <div className="relative w-full md:w-[40%] flex flex-col md:-mt-6 md:-mb-6">
              {/* Glow externo verde */}
              <div className="absolute -inset-1 rounded-[20px] bg-gradient-to-b from-green-400/25 to-emerald-600/15 blur-xl pointer-events-none" />
              <div className="relative bg-gradient-to-br from-[#0d2015] via-[#0a1a10] to-[#071510] border-2 border-green-400/60 rounded-2xl p-8 flex flex-col h-full shadow-2xl shadow-green-950/50">
                {/* Badge "MAIS ESCOLHIDO" */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                  <div className="bg-gradient-to-r from-green-400 to-emerald-400 text-black text-xs font-black px-6 py-2 rounded-full whitespace-nowrap shadow-lg shadow-green-900/60">
                    ✦ MAIS ESCOLHIDO ✦
                  </div>
                </div>

                <div className="pt-3 mb-6">
                  <span className="inline-block bg-green-500/20 text-green-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4">
                    ANUAL — O Recomendado
                  </span>
                  <p className="text-slate-300 text-xs mb-5">Sinais no WhatsApp + melhor custo-benefício</p>
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-black text-white leading-none">R$397</span>
                    <span className="text-slate-400 mb-1.5 text-sm">/ano</span>
                  </div>
                  <p className="text-green-400 text-sm font-bold mt-2">Equivale a apenas R$33,08 por mês</p>
                  <p className="text-xs text-slate-500 mt-1">Economize R$167 vs. plano mensal</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    { text: "Acesso Total à Plataforma", highlight: false },
                    { text: "Histórico e Análise de Velas Altas", highlight: false },
                    { text: "Gestão de Banca Inteligente", highlight: false },
                    { text: "📚 Curso Avançado Aviator", highlight: false },
                    { text: "🟢 Grupo VIP Exclusivo no WhatsApp", highlight: true },
                    { text: "Suporte Direto com Especialista", highlight: true },
                  ].map(({ text, highlight }) => (
                    <li key={text} className={cn("flex items-center gap-2.5 text-sm", highlight ? "text-white font-semibold" : "text-slate-300")}>
                      <CheckCircle className={cn("w-4 h-4 shrink-0", highlight ? "text-green-400" : "text-green-400/60")} /> {text}
                    </li>
                  ))}
                  <li className="flex items-center gap-2.5 text-sm text-slate-600">
                    <span className="w-4 h-4 shrink-0 text-center font-bold text-slate-700">✕</span>
                    <span className="line-through">Mentoria Particular</span>
                  </li>
                </ul>

                <a href={CHECKOUT_ANUAL} target="_blank" rel="noopener noreferrer">
                  <button className="w-full py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-black font-black text-base hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg shadow-green-900/50 flex items-center justify-center gap-2">
                    Garantir Acesso Anual <ArrowRight className="w-5 h-5" />
                  </button>
                </a>
                <p className="text-xs text-center text-slate-500 mt-3">
                  🔒 Pagamento seguro · PIX / Cartão / Boleto
                </p>
              </div>
            </div>

            {/* ── BLACK — A Elite (âncora de percepção de valor) ── */}
            <div className="relative w-full md:w-[29%] bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-950 border border-amber-500/50 rounded-2xl p-7 flex flex-col overflow-hidden">
              {/* Gold shimmer top */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 via-transparent to-transparent pointer-events-none" />

              {/* Badge ELITE */}
              <div className="absolute top-5 right-5">
                <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[10px] font-black px-2.5 py-1 rounded-full">
                  ◆ ELITE
                </span>
              </div>

              <div className="mb-6 relative z-10">
                <span className="inline-block bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4">
                  BLACK — A Elite
                </span>
                <p className="text-slate-400 text-xs mb-5">Mentoria exclusiva + acesso total</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black text-white">R$997</span>
                  <span className="text-slate-400 mb-1.5 text-sm">/ano</span>
                </div>
                <p className="text-amber-400 text-xs font-medium mt-2">~R$83,08 por mês</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1 relative z-10">
                {[
                  { text: "Acesso Total à Plataforma", gold: false },
                  { text: "Histórico e Análise de Velas Altas", gold: false },
                  { text: "Gestão de Banca Inteligente", gold: false },
                  { text: "📚 Curso Avançado Aviator", gold: false },
                  { text: "🟢 Grupo VIP Exclusivo no WhatsApp", gold: false },
                  { text: "Suporte Direto com Especialista", gold: false },
                  { text: "⭐ Mentoria Particular (6 Encontros/Ano)", gold: true },
                ].map(({ text, gold }) => (
                  <li key={text} className={cn("flex items-center gap-2.5 text-sm", gold ? "text-amber-200 font-semibold" : "text-slate-300")}>
                    <CheckCircle className={cn("w-4 h-4 shrink-0", gold ? "text-amber-400" : "text-amber-400/60")} /> {text}
                  </li>
                ))}
              </ul>

              <a href={CHECKOUT_BLACK} target="_blank" rel="noopener noreferrer" className="relative z-10">
                <button className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-black font-black text-sm hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg shadow-amber-900/30 flex items-center justify-center gap-2">
                  Quero o Black Elite
                </button>
              </a>
            </div>

          </div>{/* fim dos 3 cards */}

          {/* Guarantee */}
          <div className="mt-12 flex items-center justify-center gap-4 bg-green-500/5 border border-green-500/20 rounded-2xl p-6">
            <ShieldCheck className="w-10 h-10 text-green-400 shrink-0" />
            <div>
              <p className="font-bold text-white">Garantia de 7 dias</p>
              <p className="text-sm text-slate-400">Não gostou? Devolvemos 100% do seu dinheiro sem perguntas dentro de 7 dias.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black">Perguntas frequentes</h2>
          </div>
          <div className="space-y-3">
            <FaqItem q="Quanto tempo leva para receber meu acesso?" a="O acesso é liberado automaticamente assim que o pagamento é confirmado. Você receberá um e-mail com suas credenciais em menos de 5 minutos." />
            <FaqItem q="É seguro? Os sinais realmente funcionam?" a="Sim! Nossa plataforma usa IA treinada com milhões de rodadas históricas do Aviator. A assertividade média dos nossos sinais é de 95%. Mais de 4.200 membros confiam diariamente na plataforma." />
            <FaqItem q="Posso cancelar quando quiser?" a="Sim, o plano mensal pode ser cancelado a qualquer momento sem multa. O plano anual tem garantia de reembolso nos primeiros 7 dias." />
            <FaqItem q="Em quais casas de apostas funciona?" a="Nossa plataforma é compatível com EsportivaBet, Bravobet, Superbet e outras. Você pode usar os sinais na sua plataforma favorita." />
            <FaqItem q="Preciso ter experiência com Aviator?" a="Não! A plataforma foi desenvolvida para iniciantes e profissionais. Os sinais são simples de seguir e a comunidade está sempre pronta para ajudar." />
            <FaqItem q="Esqueci minha senha. Como recuperar?" a="Na tela de login, clique em 'Esqueceu a senha?' e você receberá um link de recuperação no seu e-mail em instantes." />
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent pointer-events-none" />
        <div className="container mx-auto px-6 max-w-3xl text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            Pronto para <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">começar a lucrar?</span>
          </h2>
          <p className="text-slate-400 mb-8 text-lg">
            Junte-se a mais de 4.200 membros que já transformaram os resultados no Aviator.
          </p>
          <a href="#planos">
            <button className="h-16 px-12 text-xl font-black rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 transition-all hover:scale-[1.03] shadow-2xl shadow-purple-900/50 inline-flex items-center gap-3">
              Quero Acesso Agora <ArrowRight className="w-6 h-6" />
            </button>
          </a>
          <p className="text-xs text-slate-500 mt-5">
            🔒 Pagamento seguro · PIX · Cartão · Garantia de 7 dias
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="py-10 border-t border-white/5 bg-[#050510]">
        <div className="container mx-auto px-6 text-center text-slate-600 text-xs space-y-2">
          <div className="flex items-center justify-center gap-2 font-black text-base text-slate-400 mb-4">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            AVIATOR<span className="text-purple-400">PRO</span>
          </div>
          <p>© {new Date().getFullYear()} AviatorPro. Todos os direitos reservados.</p>
          <p>Jogue com responsabilidade. Não garantimos lucros. Proibido para menores de 18 anos.</p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <Link href="/login" className="hover:text-slate-400 transition-colors">Área do Membro</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
