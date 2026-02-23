const { getNextAnalysisTime } = require('./lib/prediction-engine-mock'); // Need to mock or extract logic

// Replicating the logic from prediction-engine.ts to test it in isolation
function getNextAnalysisTimeTest(platform) {
    const now = new Date();
    const minutes = now.getMinutes();
    const hours = now.getHours();

    // Janelas de análise (exemplo: a cada 30 min)
    // Se for 23:09, próxima análise deve ser 23:30? Ou já estamos na janela de 23:00?
    // Lógica original parece ser baseada em incrementos fixos.

    let nextAnalysis = new Date(now);

    if (minutes < 30) {
        nextAnalysis.setMinutes(30, 0, 0);
    } else {
        nextAnalysis.setHours(hours + 1, 0, 0, 0);
    }

    console.log(`Current Time (Local): ${now.toLocaleTimeString()}`);
    console.log(`Next Analysis: ${nextAnalysis.toLocaleTimeString()}`);

    const diff = nextAnalysis.getTime() - now.getTime();
    console.log(`Diff (ms): ${diff}`);
    console.log(`Diff (minutes): ${diff / 60000}`);

    return nextAnalysis;
}

getNextAnalysisTimeTest('bravobet');
