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

async function debugScraper() {
    console.log('🔍 DEBUG: Verificando extração de dados\n');

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    await page.goto('https://www.tipminer.com/br/historico/bravobet/aviator', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
    });

    await page.waitForSelector('button.cell--aviator', { timeout: 15000 });

    // Extract with detailed logging
    const results = await page.evaluate(() => {
        const cells = Array.from(document.querySelectorAll('button.cell--aviator')).slice(0, 10);

        return cells.map((cell, i) => {
            const rawText = cell.textContent;
            const trimmed = rawText.trim();
            const bgColor = cell.style.backgroundColor;
            const ariaLabel = cell.getAttribute('aria-label');

            // Try multiple extraction methods
            const method1 = parseFloat(trimmed.replace('x', ''));
            const method2 = parseFloat(trimmed);

            return {
                index: i,
                rawText,
                trimmed,
                method1,
                method2,
                bgColor,
                ariaLabel
            };
        });
    });

    console.log('📊 Resultados da extração:\n');
    results.forEach(r => {
        console.log(`${r.index + 1}. Raw: "${r.rawText}" | Trimmed: "${r.trimmed}"`);
        console.log(`   Method1 (replace): ${r.method1} | Method2 (direct): ${r.method2}`);
        console.log(`   AriaLabel: ${r.ariaLabel} | BgColor: ${r.bgColor}\n`);
    });

    await browser.close();
    process.exit(0);
}

debugScraper();
