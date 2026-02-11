export type RiskProfile = 'conservador' | 'moderado' | 'agressivo';

export interface BankrollResult {
    total_bet: number;
    protection_bet: number;  // 60% - saída em 2.1x
    risk_bet: number;        // 40% - velas mais altas
    percentage_used: number;
    tips: string[];
}

const RISK_PERCENTAGES = {
    conservador: 0.01,  // 1%
    moderado: 0.025,    // 2.5% (média entre 2-3%)
    agressivo: 0.045    // 4.5% (média entre 4-5%)
};

export function calculateBankroll(balance: number, riskProfile: RiskProfile): BankrollResult {
    // Validação
    if (balance <= 0) {
        throw new Error('Banca deve ser maior que zero');
    }

    // Calcula percentual baseado no perfil
    const percentage = RISK_PERCENTAGES[riskProfile];
    const totalBet = balance * percentage;

    // Split: 60% proteção, 40% risco
    const protectionBet = totalBet * 0.6;
    const riskBet = totalBet * 0.4;

    // Gera dicas personalizadas
    const tips = generateTips(balance, totalBet, protectionBet, riskBet, riskProfile);

    return {
        total_bet: totalBet,
        protection_bet: protectionBet,
        risk_bet: riskBet,
        percentage_used: percentage * 100,
        tips
    };
}

function generateTips(
    balance: number,
    totalBet: number,
    protectionBet: number,
    riskBet: number,
    riskProfile: RiskProfile
): string[] {
    const tips: string[] = [];

    // Dica sobre split
    tips.push(
        `Divida seu valor em 2 apostas: R$ ${protectionBet.toFixed(2)} para proteção (sair em 2.1x) e R$ ${riskBet.toFixed(2)} para risco (velas mais altas)`
    );

    // Dica sobre proteção
    tips.push(
        `Com a aposta de proteção (R$ ${protectionBet.toFixed(2)}), ao sair em 2.1x você garante R$ ${(protectionBet * 2.1).toFixed(2)}`
    );

    // Dica sobre gestão
    if (riskProfile === 'conservador') {
        tips.push('No modo conservador, priorize sempre a proteção. Só arrisque na segunda aposta quando tiver certeza.');
    } else if (riskProfile === 'moderado') {
        tips.push('No modo moderado, equilibre proteção e risco. Busque velas entre 3x-5x na aposta de risco.');
    } else {
        tips.push('No modo agressivo, você pode buscar velas mais altas (5x+), mas sempre proteja primeiro com a aposta de 60%.');
    }

    // Dica sobre limite de perda
    const maxLoss = totalBet * 3; // Exemplo: máximo 3 apostas seguidas perdidas
    tips.push(
        `Defina um Stop Loss: Se perder ${maxLoss.toFixed(2)} (3 rodadas), pare e analise sua estratégia.`
    );

    // Dica sobre meta de ganho
    const dailyGoal = balance * 0.1; // 10% da banca
    tips.push(
        `Meta diária sugerida: R$ ${dailyGoal.toFixed(2)} (10% da banca). Ao atingir, considere encerrar o dia.`
    );

    return tips;
}
