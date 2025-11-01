export function formatEta(etainSeconds: number, elapsedSeconds: number, reviewsScraped: number): string {
    if (elapsedSeconds < 10 || reviewsScraped < 50 || isNaN(etainSeconds) || !isFinite(etainSeconds)) {
        return "Calculating ETA...";
    }
    if (etainSeconds < 60) {
        return `- ${Math.max(1, Math.round(etainSeconds / 60))} min remaining`; 
    }
    if (etainSeconds < 3600) {
        const mins = Math.round(etainSeconds / 60);
        return `- ${mins} mins remaining`;
    }

    const hours = Math.floor(etainSeconds / 3600);
    const mins = Math.round((etainSeconds % 3600) / 60);
    
    if (mins === 60) {
        return `- ${hours + 1} hr 0 mins remaining`; 
    }
    return `- ${hours} hr ${mins} mins remaining`;
}