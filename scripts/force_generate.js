require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// --- REPLICATING PREDICTION ENGINE LOGIC ---

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

function analyzePatterns(history) {
    const multipliers = history.map(h => h.multiplier);
    let lowStreak = 0;
    for (const mult of multipliers) {
        if (mult < 2.0) lowStreak++; else break;
    }

    const highMultipliers = history.filter(h => h.multiplier >= 5.0);
    const lastHigh = highMultipliers[0];
    let minutesSinceHigh = 999;
    if (lastHigh && lastHigh.round_time) {
        minutesSinceHigh = (Date.now() - new Date(lastHigh.round_time).getTime()) / 60000;
    }

    const avgMultiplier = multipliers.reduce((a, b) => a + b, 0) / multipliers.length;
    const distribution = {
        '1-2x': multipliers.filter(m => m >= 1 && m < 2).length,
        '2-5x': multipliers.filter(m => m >= 2 && m < 5).length,
        '5-10x': multipliers.filter(m => m >= 5 && m < 10).length,
        '10x+': multipliers.filter(m => m >= 10).length
    };

    return {
        low_streak: lowStreak,
        minutes_since_high: Math.max(0, Math.round(minutesSinceHigh)),
        avg_multiplier: isNaN(avgMultiplier) ? 0 : Number(avgMultiplier.toFixed(2)),
        distribution,
        total_rounds: history.length,
        last_high_multiplier: lastHigh?.multiplier,
        last_high_time: lastHigh?.round_time
    };
}

function createPrediction(platform, analysis) {
    let confidence = 0.0;
    let predictionType = 'NORMAL';
    let suggestedRange = '2x - 5x';
    const reasons = [];

    if (analysis.low_streak >= 15) { confidence += 0.35; reasons.push(`${analysis.low_streak} velas baixas consecutivas`); }
    else if (analysis.low_streak >= 10) { confidence += 0.25; reasons.push(`${analysis.low_streak} velas baixas seguidas`); }

    if (analysis.minutes_since_high >= 60) { confidence += 0.30; reasons.push(`${analysis.minutes_since_high}min sem vela alta`); }

    if (confidence >= 0.40) {
        predictionType = 'WAIT_HIGH';
        suggestedRange = '2.5x - 6x';
    } else {
        predictionType = 'NORMAL';
        suggestedRange = '2x - 4x';
        if (reasons.length === 0) reasons.push('Padrão normal');
    }

    return {
        platform,
        prediction_type: predictionType,
        confidence: Number(Math.min(confidence, 0.95).toFixed(2)),
        suggested_range: suggestedRange,
        reason: reasons.join(', '),
        analysis_data: analysis,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        is_active: true
    };
}

async function forceGenerateValues() {
    const platform = 'bravobet';
    console.log(`[FORCE] Generating for ${platform}...`);

    const { data: history } = await supabase
        .from('crash_history')
        .select('multiplier, round_time, platform')
        .eq('platform', platform)
        .order('round_time', { ascending: false })
        .limit(200);

    if (!history || history.length === 0) {
        console.error('No history found!');
        return;
    }

    const analysis = analyzePatterns(history);
    const prediction = createPrediction(platform, analysis);

    console.log('Generated Prediction:', prediction);

    const { data: saved, error } = await supabase
        .from('predictions')
        .insert(prediction)
        .select()
        .single();

    if (error) {
        console.error('Error saving:', error);
    } else {
        console.log('SUCCESS! Saved prediction ID:', saved.id);
    }
}

forceGenerateValues();
