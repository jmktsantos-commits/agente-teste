/**
 * Casino Platform Configuration
 * 
 * Affiliate links and platform metadata for casino integrations
 * 
 * TODO: Replace placeholder URLs with real affiliate links after registration
 */

export type CasinoPlatform = 'bravobet' | 'superbet' | 'esportivabet'

export interface CasinoConfig {
    id: CasinoPlatform
    name: string
    displayName: string
    affiliateUrl: string
    previewImage: string
    features: string[]
    bonus: string
    minDeposit: string
    paymentMethods: string[]
    description: string
    color: {
        primary: string
        secondary: string
        gradient: string
    }
}

export const CASINO_CONFIGS: Record<CasinoPlatform, CasinoConfig> = {
    esportivabet: {
        id: 'esportivabet',
        name: 'EsportivaBet',
        displayName: 'EsportivaBet Casino',
        affiliateUrl: 'https://go.aff.esportiva.bet/8ywkf5b2?utm_campaign=site',
        previewImage: '/images/casino/esportivabet-preview.jpg',
        features: [
            'CASHBACK EXCLUSIVO para o AVIATOR',
            'Saques instantâneos via PIX',
            'Plataforma 100% brasileira',
            'Plataforma Regulamentada pelo Governo',
            'Bonificação para NÍVEIS de Jogadores'
        ],
        bonus: 'Bônus de boas-vindas exclusivo',
        minDeposit: 'R$ 10',
        paymentMethods: ['PIX'],
        description: 'Plataforma brasileira especializada em jogos crash. Acesse o Aviator com bônus exclusivo.',
        color: {
            primary: '#16A34A',
            secondary: '#4ADE80',
            gradient: 'linear-gradient(135deg, #16A34A 0%, #4ADE80 100%)'
        }
    },
    bravobet: {
        id: 'bravobet',
        name: 'Bravobet',
        displayName: 'Bravobet Casino',
        affiliateUrl: 'https://affiliates.bravo.bet.br/links/?accounts=%2A&register=%2A&btag=1989135_l350155__',
        previewImage: '/images/casino/bravobet-preview.jpg',
        features: [
            'Aviator com multiplicadores até 200x',
            'Saques instantâneos via PIX',
            'Suporte 24/7 em português',
            'App mobile nativo'
        ],
        bonus: 'Bônus de boas-vindas exclusivo',
        minDeposit: 'R$ 20',
        paymentMethods: ['PIX'],
        description: 'Plataforma líder em jogos crash com foco em Aviator. Interface brasileira e pagamentos rápidos.',
        color: {
            primary: '#FF6B35',
            secondary: '#FFA07A',
            gradient: 'linear-gradient(135deg, #FF6B35 0%, #FFA07A 100%)'
        }
    },
    superbet: {
        id: 'superbet',
        name: 'Superbet',
        displayName: 'Superbet Casino',
        affiliateUrl: 'https://brsuperbet.com/registro_7330',
        previewImage: '/images/casino/superbet-preview.jpg',
        features: [
            'Aviator com cashback automático',
            'Programa VIP exclusivo',
            'Torneios diários de Aviator',
            'Odds competitivas'
        ],
        bonus: 'Bônus de boas-vindas exclusivo',
        minDeposit: 'R$ 10',
        paymentMethods: ['PIX'],
        description: 'Casa de apostas completa com foco em experiência premium. Melhor para jogadores VIP.',
        color: {
            primary: '#4F46E5',
            secondary: '#818CF8',
            gradient: 'linear-gradient(135deg, #4F46E5 0%, #818CF8 100%)'
        }
    }
}

/**
 * Get casino config by platform
 */
export function getCasinoConfig(platform: CasinoPlatform): CasinoConfig {
    return CASINO_CONFIGS[platform]
}

/**
 * Get all casino configs in display order (esportivabet first)
 */
export function getAllCasinoConfigs(): CasinoConfig[] {
    return [
        CASINO_CONFIGS.esportivabet,
        CASINO_CONFIGS.bravobet,
        CASINO_CONFIGS.superbet,
    ]
}

/**
 * Build affiliate URL with tracking parameters
 */
export function buildAffiliateUrl(
    platform: CasinoPlatform,
    params?: {
        utmSource?: string
        utmMedium?: string
        utmCampaign?: string
    }
): string {
    const config = getCasinoConfig(platform)
    const url = new URL(config.affiliateUrl)

    // Add UTM parameters if provided
    if (params?.utmSource) url.searchParams.set('utm_source', params.utmSource)
    if (params?.utmMedium) url.searchParams.set('utm_medium', params.utmMedium)
    if (params?.utmCampaign) url.searchParams.set('utm_campaign', params.utmCampaign)

    return url.toString()
}
