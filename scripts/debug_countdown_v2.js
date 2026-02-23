// Standalone version of getNextAnalysisTime logic
function getNextAnalysisTime(platform) {
    const now = new Date();
    const minutes = now.getMinutes();
    const hours = now.getHours();

    // Lógica simplificada baseada no que vi em prediction-engine.ts
    // Se estamos em XX:00-XX:29 -> Próxima é XX:30
    // Se estamos em XX:30-XX:59 -> Próxima é (XX+1):00

    let nextAnalysis = new Date(now);
    nextAnalysis.setSeconds(0);
    nextAnalysis.setMilliseconds(0);

    if (minutes < 30) {
        nextAnalysis.setMinutes(30);
    } else {
        nextAnalysis.setHours(hours + 1);
        nextAnalysis.setMinutes(0);
    }

    return nextAnalysis;
}

const now = new Date();
const next = getNextAnalysisTime('bravobet');
const diff = next.getTime() - now.getTime();

console.log(`Current Time: ${now.toLocaleTimeString()}`);
console.log(`Next Analysis: ${next.toLocaleTimeString()}`);
console.log(`Diff (ms): ${diff}`);

// Simulation of SignalCard Logic
let targetTime = next.getTime();
// "If we're in the current window (diff <= 0), show time to NEXT window (30min later)"
// This check in SignalCard seems redundant if getNextAnalysisTime always returns future time?
// Unles getNextAnalysisTime returns the CURRENT window start?

console.log(`Target Time: ${new Date(targetTime).toLocaleTimeString()}`);
const finalDiff = targetTime - now.getTime();
const hours = Math.floor(finalDiff / (1000 * 60 * 60));
const minutes = Math.floor((finalDiff % (1000 * 60 * 60)) / (1000 * 60));
const seconds = Math.floor((finalDiff % (1000 * 60)) / 1000);

console.log(`Countdown: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);

// Check visibility logic
const isWindowActive = true; // Assumption
const suggestedTimes = ["23:26", "23:32", "23:43"]; // Example from screenshot
// Screenshot shows "Horários Confirmados", which means suggestedTimes.length > 0.
// Code: 
/*
   isWindowActive && suggestedTimes.length > 0 ? "Próxima Análise" : "Próxima Análise Em"
*/
// The label logic seems fine.
// The issue is the countdown value itself? Or visibility?
