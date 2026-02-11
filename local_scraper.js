require('dotenv').config({ path: '.env.local' });
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Faltam credenciais');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PLATFORMS = [
    { name: 'bravobet', url: 'https://www.tipminer.com/br/historico/bravobet/aviator' },
    { name: 'superbet', url: 'https://www.tipminer.com/br/historico/betou/aviator' }
];

async function scrapePlatform(browser, platform) {
    const page = await browser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

        console.log(`📡 ${platform.name}...`);
        await page.goto(platform.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        try {
            await page.waitForSelector('button.cell--aviator', { timeout: 15000 });
        } catch (e) {
            await page.close();
            return [];
        }

        // Extract with CORRECT parsing and REAL timestamps
        const results = await page.evaluate(() => {
            const cells = Array.from(document.querySelectorAll('button.cell--aviator')).slice(0, 20);

            return cells.map((cell, index) => {
                const raw = cell.textContent.trim();
                // Format: "33,88x101:10:18" = multiplier + position + time
                // Example: 33,88x 10 1:10:18

                // Extract multiplier (e.g., "33,88")
                const multMatch = raw.match(/^([\d,]+)x/);
                if (!multMatch) return null;

                const multiplierStr = multMatch[1].replace(',', '.');
                const multiplier = parseFloat(multiplierStr);

                // Extract time (format: HH:MM:SS at the end)
                // Pattern: last occurrence of HH:MM:SS
                const timeMatch = raw.match(/(\d{1,2}):(\d{2}):(\d{2})$/);
                let gameTime = null;
                if (timeMatch) {
                    const hours = timeMatch[1].padStart(2, '0');
                    const minutes = timeMatch[2];
                    const seconds = timeMatch[3];
                    gameTime = `${hours}:${minutes}:${seconds}`;
                }

                const bgColor = cell.style.backgroundColor;

                return {
                    multiplier,
                    gameTime,
                    bgColor,
                    raw,
                    index  // Keep original order
                };
            }).filter(r => r !== null && !isNaN(r.multiplier) && r.gameTime !== null);
        });

        console.log(`✅ ${platform.name}: ${results.length} resultados`);
        results.slice(0, 5).forEach((r, i) => {
            const color = r.bgColor.includes('255, 103, 71') ? '🔴' : '🔵';
            console.log(`   ${i + 1}. ${color} ${r.multiplier}x (${r.gameTime})`);
        });

        await page.close();
        return results;

    } catch (err) {
        console.error(`❌ ${platform.name}:`, err.message);
        await page.close();
        return [];
    }
}

async function saveResults(platform, results) {
    if (!results || results.length === 0) return;

    let saved = 0;
    let skipped = 0;

    for (const result of results) {
        try {
            // Create timestamp using TODAY's date + game time from TipMiner
            const now = new Date();
            const [hours, minutes, seconds] = result.gameTime.split(':').map(Number);

            const roundDate = new Date(now);
            roundDate.setHours(hours, minutes, seconds, 0);

            // If game time is in the future, it's from yesterday
            if (roundDate > now) {
                roundDate.setDate(roundDate.getDate() - 1);
            }

            // Create base timestamp (without milliseconds) for duplicate checking
            const baseTime = new Date(roundDate);
            baseTime.setMilliseconds(0);

            // Check if this multiplier + platform + time (to the second) already exists
            const oneSecondAfter = new Date(baseTime.getTime() + 1000);

            const { data: existing } = await supabase
                .from('crash_history')
                .select('id')
                .eq('platform', platform.name)
                .eq('multiplier', result.multiplier)
                .gte('round_time', baseTime.toISOString())
                .lt('round_time', oneSecondAfter.toISOString())
                .limit(1);

            if (existing && existing.length > 0) {
                skipped++;
                continue;
            }

            // Add milliseconds based on position to preserve order
            // Position 0 (most recent) = 999ms, position 1 = 998ms, etc.
            const milliseconds = 999 - result.index;
            roundDate.setMilliseconds(milliseconds);

            const round_time = roundDate.toISOString();

            // Insert
            const { error } = await supabase
                .from('crash_history')
                .insert([{
                    multiplier: result.multiplier,
                    platform: platform.name,
                    round_time: round_time
                }]);

            if (error) {
                if (!error.message.includes('duplicate')) {
                    console.error(`❌ ${result.multiplier}x (${result.gameTime}):`, error.message);
                }
                skipped++;
            } else {
                saved++;
            }

        } catch (err) {
            console.error(`❌ Erro:`, err.message);
        }
    }

    console.log(`💾 ${platform.name}: ✅ ${saved} novos, ⏭️  ${skipped} ignorados\n`);
}

async function runCollector() {
    console.log('🚀 Coletor com HORÁRIOS REAIS do TipMiner...\n');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    while (true) {
        for (const platform of PLATFORMS) {
            const results = await scrapePlatform(browser, platform);
            await saveResults(platform, results);
        }

        console.log('⏳ Aguardando 10 segundos...\n');
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
}

runCollector();
