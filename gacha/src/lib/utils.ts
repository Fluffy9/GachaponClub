export function formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Constants for SUI/MIST conversion
const MIST_PER_SUI = 1_000_000_000n; // 1 SUI = 1_000_000_000 MIST
const MAX_U64 = 18446744073709551615n; // Maximum u64 value

/**
 * Safely converts a value to BigInt, ensuring it's within u64 range
 * @param value - Value to convert (can be number, string, or BigInt)
 * @returns BigInt value within u64 range
 */
function safeToBigInt(value: number | string | bigint): bigint {
    try {
        const bigIntValue = BigInt(value);
        if (bigIntValue < 0n || bigIntValue > MAX_U64) {
            throw new Error('Value out of u64 range');
        }
        return bigIntValue;
    } catch (error) {
        throw new Error('Invalid value for u64 conversion');
    }
}

/**
 * Converts SUI amount to MIST (1 SUI = 1_000_000_000 MIST)
 * @param suiAmount - Amount in SUI (can be number or string)
 * @returns Amount in MIST as BigInt
 */
export function suiToMist(suiAmount: number | string): bigint {
    const amount = typeof suiAmount === 'string' ? parseFloat(suiAmount) : suiAmount;
    return BigInt(Math.round(amount * Number(MIST_PER_SUI)));
}

/**
 * Converts MIST amount to SUI (1 SUI = 1_000_000_000 MIST)
 * @param mistAmount - Amount in MIST (can be number, string, or BigInt)
 * @returns Amount in SUI as number
 */
export function mistToSui(mistAmount: number | string | bigint): number {
    const amount = typeof mistAmount === 'bigint' ? Number(mistAmount) : Number(mistAmount);
    return amount / Number(MIST_PER_SUI);
}

/**
 * Formats a MIST amount as a SUI string with specified decimal places
 * @param mistAmount - Amount in MIST (can be number, string, or BigInt)
 * @param decimals - Number of decimal places to show (default: 2)
 * @returns Formatted string with SUI symbol
 */
export function formatSui(mistAmount: number | string | bigint, decimals: number = 2): string {
    const suiAmount = mistToSui(mistAmount);
    return `${suiAmount.toFixed(decimals)} SUI`;
}

/**
 * Checks if a MIST balance is sufficient for a MIST price
 * @param balance - Balance in MIST (can be number, string, or BigInt)
 * @param price - Price in MIST (can be number, string, or BigInt)
 * @returns boolean indicating if balance is sufficient
 */
export function hasSufficientBalance(balance: number | string | bigint, price: number | string | bigint): boolean {
    try {
        const balanceMist = safeToBigInt(balance);
        const priceMist = safeToBigInt(price);
        return balanceMist >= priceMist;
    } catch (error) {
        console.error('Error comparing balances:', error);
        return false;
    }
}

/**
 * Gets the full URL for an image asset
 * @param path - Relative path to the image
 * @returns Full URL to the image
 */
export function getImageUrl(path: string): string {
    // If the path is already a full URL, return it
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    // Otherwise, prepend the base URL for local assets
    return `/images/${path}`;
}

