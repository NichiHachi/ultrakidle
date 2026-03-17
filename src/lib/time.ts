/**
 * Calculates the number of milliseconds until the next 12:00 AM in Nicaragua time (UTC-6).
 */
export function getMsUntilNicaraguaMidnight(): number {
    const now = new Date();

    // Get current time in Nicaragua
    const nicaraguaStr = now.toLocaleString("en-US", { timeZone: "America/Managua" });
    const nicaraguaNow = new Date(nicaraguaStr);

    // Get next midnight in Nicaragua
    const nicaraguaMidnight = new Date(nicaraguaStr);
    nicaraguaMidnight.setHours(24, 0, 0, 0);

    return nicaraguaMidnight.getTime() - nicaraguaNow.getTime();
}

/**
 * Returns true if it's currently exactly midnight in Nicaragua (within a small margin).
 */
export function isNicaraguaMidnight(): boolean {
    const now = new Date();
    const nicaraguaStr = now.toLocaleString("en-US", { timeZone: "America/Managua" });
    const nicaraguaNow = new Date(nicaraguaStr);

    return nicaraguaNow.getHours() === 0 && nicaraguaNow.getMinutes() === 0;
}
