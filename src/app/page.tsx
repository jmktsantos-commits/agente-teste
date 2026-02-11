"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Bot, ShieldCheck, Zap, BarChart3, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white selection:bg-primary selection:text-white overflow-hidden">
      {/* Navbar */}
      <nav className="fixed w-full z-50 top-0 left-0 bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            AVIATOR<span className="text-primary">PRO</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:text-primary hover:bg-white/5">Entrar</Button>
            </Link>
            <Link href="/registro">
              <Button className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(233,69,96,0.3)]">
                Começar Agora
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block py-1 px-3 rounded-full bg-white/5 border border-white/10 text-primary text-sm font-medium mb-6">
              🚀 A Plataforma #1 de Sinais do Brasil
            </span>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
              Domine o Aviator com <br />
              <span className="text-primary">Inteligência Artificial</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Receba sinais assertivos em tempo real, gerencie sua banca profissionalmente e faça parte da maior comunidade de lucros do mercado.
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <Link href="/registro">
                <Button size="lg" className="h-14 px-8 text-lg bg-primary hover:bg-primary/90 shadow-[0_0_30px_rgba(233,69,96,0.5)]">
                  Criar Conta Grátis <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/10 bg-white/5 hover:bg-white/10 text-white">
                  Ver Funcionalidades
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Mockup UI */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-20 relative mx-auto max-w-5xl"
          >
            <div className="rounded-xl border border-white/10 bg-[#12122a]/80 backdrop-blur-xl p-2 shadow-2xl">
              <div className="rounded-lg bg-[#0a0a1a] overflow-hidden aspect-video relative flex items-center justify-center border border-white/5">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
                  <p className="text-slate-500">Dashboard Interativo em Tempo Real</p>
                </div>
                {/* Decorative overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-transparent to-transparent opacity-80" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-[#0a0a1a]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Por que escolher o AviatorPro?</h2>
            <p className="text-slate-400">Tecnologia de ponta para maximizar seus resultados.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Bot className="w-8 h-8 text-primary" />}
              title="Sinais com IA"
              description="Nossa inteligência artificial analisa milhões de rodadas para identificar os melhores momentos de entrada."
            />
            <FeatureCard
              icon={<ShieldCheck className="w-8 h-8 text-green-500" />}
              title="Gestão de Risco"
              description="Planilhas automatizadas e proteção de banca integradas para você nunca quebrar."
            />
            <FeatureCard
              icon={<Users className="w-8 h-8 text-blue-500" />}
              title="Comunidade VIP"
              description="Chat ao vivo com milhares de jogadores compartilhando estratégias e resultados."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-white/10 bg-[#050510] text-center text-slate-500 text-sm">
        <div className="container mx-auto px-6">
          <p>© 2024 AviatorPro. Todos os direitos reservados.</p>
          <p className="mt-2 text-xs">Jogue com responsabilidade. Proibido para menores de 18 anos.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl bg-[#12122a] border border-white/5 hover:border-primary/50 transition-colors group">
      <div className="mb-6 bg-white/5 w-16 h-16 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-slate-400 leading-relaxed">
        {description}
      </p>
    </div>
  )
}
