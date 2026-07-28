require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

function extractHighCandleMinutes(history) {
    const highCandles = history.filter(h => h.multiplier >= 10.0 && h.round_time);
    if (highCandles.length === 0) return [];
    const minutes = highCandles.map(h => {
        const brtMs = new Date(h.round_time).getTime() - 3 * 60 * 60 * 1000;
        return new Date(brtMs).getUTCMinutes();
    });
    const freq = {};
    for (const m of minutes) freq[m] = (freq[m] || 0) + 1;
    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([min]) => parseInt(min))
        .sort((a, b) => a - b);
}

function analyzePatterns(history) {
    const multipliers = history.map(h => h.multiplier);
    let lowStreak = 0;
    for (const mult of multipliers) { if (mult < 2.0) lowStreak++; else break; }
    const highItems = history.filter(h => h.multiplier >= 5.0);
    const lastHigh = highItems[0];
    let minutesSinceHigh = 999;
    if (lastHigh?.round_time) {
        const t = new Date(lastHigh.round_time).getTime();
        if (!isNaN(t)) minutesSinceHigh = (Date.now() - t) / 60000;
    }
    const avg = multipliers.reduce((a, b) => a + b, 0) / multipliers.length;
    const distribution = {
        '1-2x': multipliers.filter(m => m >= 1 && m < 2).length,
        '2-5x': multipliers.filter(m => m >= 2 && m < 5).length,
        '5-10x': multipliers.filter(m => m >= 5 && m < 10).length,
        '10x+': multipliers.filter(m => m >= 10).length,
    };
    return {
        low_streak: lowStreak,
        minutes_since_high: Math.max(0, Math.round(minutesSinceHigh)),
        avg_multiplier: isNaN(avg) ? 0 : Number(avg.toFixed(2)),
        distribution, total_rounds: history.length,
        last_high_multiplier: lastHigh?.multiplier,
        last_high_time: lastHigh?.round_time,
    };
}

async function forceGenerate(platformName) {
    console.log(`\n🔮 Gerando prediction para ${platformName}...`);

    const { data: history, error } = await supabase
        .from('crash_history')
        .select('multiplier, round_time')
        .eq('platform', platformName)
        .order('round_time', { ascending: false })
        .limit(200);

    if (error || !history || history.length < 20) {
        console.error('❌ Histórico insuficiente:', error?.message || history?.length);
        return;
    }

    const analysis = analyzePatterns(history);
    const typicalMinutes = extractHighCandleMinutes(history);

    let confidence = 0;
    const reasons = [];
    if (analysis.low_streak >= 15) { confidence += 0.35; reasons.push(`${analysis.low_streak} velas baixas consecutivas`); }
    else if (analysis.low_streak >= 10) { confidence += 0.25; reasons.push(`${analysis.low_streak} velas baixas seguidas`); }
    else if (analysis.low_streak >= 7) { confidence += 0.15; reasons.push(`${analysis.low_streak} velas baixas recentes`); }
    if (analysis.minutes_since_high >= 60) { confidence += 0.30; reasons.push(`${analysis.minutes_since_high}min sem vela alta`); }
    else if (analysis.minutes_since_high >= 45) { confidence += 0.20; reasons.push(`${analysis.minutes_since_high}min sem vela alta`); }
    else if (analysis.minutes_since_high >= 30) { confidence += 0.10; reasons.push(`${analysis.minutes_since_high}min sem vela alta`); }
    if (analysis.avg_multiplier < 1.7) { confidence += 0.20; reasons.push(`Média muito baixa (${analysis.avg_multiplier}x)`); }
    if (analysis.total_rounds > 0) {
        const lowPct = (analysis.distribution['1-2x'] / analysis.total_rounds) * 100;
        if (lowPct > 65) { confidence += 0.15; reasons.push(`${Math.round(lowPct)}% são velas baixas`); }
    }
    let predictionType = confidence >= 0.40 ? 'WAIT_HIGH' : (confidence < 0.20 ? 'CAUTION' : 'NORMAL');
    confidence = Math.min(confidence, 0.95);

    // Hora BRT atual + próxima hora para projeção
    const nowUTC = new Date();
    const nowBRT = new Date(nowUTC.getTime() - 3 * 60 * 60 * 1000);
    const nextHourBRT = (nowBRT.getUTCHours() + 1) % 24;

    console.log(`\n📊 Análise:`);
    console.log(`  - Hora BRT atual: ${nowBRT.getUTCHours()}h`);
    console.log(`  - Próxima hora BRT: ${nextHourBRT}h`);
    console.log(`  - Minutos típicos 10x+: ${typicalMinutes.join(', ')} (de ${history.filter(h=>h.multiplier>=10).length} ocorrências)`);
    console.log(`  - Confiança: ${Math.round(confidence*100)}% → ${predictionType}`);

    const fallbackMins = [10, 25, 40];
    const minsToUse = typicalMinutes.length >= 3 ? typicalMinutes.slice(0, 3) :
                      typicalMinutes.length > 0   ? [...typicalMinutes, ...fallbackMins].slice(0, 3) :
                      fallbackMins;
    // Sempre gerar horários — o tipo controla a cor no frontend
    const suggestedRange = minsToUse.map(min =>
        `${String(nextHourBRT).padStart(2,'0')}:${String(min).padStart(2,'0')} ± 1 min`
    ).join(', ');

    if (!reasons.length) reasons.push('Baseado nos padrões históricos de 200 rodadas');

    const nextHourUTC = new Date(nowUTC);
    nextHourUTC.setUTCHours(nextHourUTC.getUTCHours() + 1, 5, 0, 0);
    const nextAnalysisUTC = new Date(nowUTC);
    nextAnalysisUTC.setUTCHours(nextAnalysisUTC.getUTCHours() + 1, 0, 0, 0);

    const prediction = {
        platform: platformName,
        prediction_type: predictionType,
        confidence: Number(confidence.toFixed(2)),
        suggested_range: suggestedRange,
        reason: reasons.join(', '),
        analysis_data: { ...analysis, next_analysis_at: nextAnalysisUTC.toISOString() },
        expires_at: nextHourUTC.toISOString(),
        is_active: true,
    };

    console.log(`\n✅ Prediction a inserir:`);
    console.log(`  suggested_range: "${suggestedRange}"`);
    console.log(`  expires_at: ${prediction.expires_at}`);

    const { data: saved, error: saveErr } = await supabase
        .from('predictions')
        .insert(prediction)
        .select()
        .single();

    if (saveErr) {
        console.error('❌ Erro ao salvar:', saveErr.message);
    } else {
        console.log(`\n🎉 Prediction inserida com ID: ${saved.id}`);
    }
}

(async () => {
    await forceGenerate('bravobet');
    process.exit(0);
})();
