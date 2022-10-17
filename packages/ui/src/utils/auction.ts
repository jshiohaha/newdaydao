import { Auction } from '@auction-factory/sdk';
import { BN } from '@project-serum/anchor';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export const isAuctionLive = (auction: Auction | undefined) => {
    if (!auction) return false;

    const endTimeMilli = auction.endTime.toNumber() * 1000;
    const currentTimestamp = new Date().getTime();

    return auction && (!auction.settled && endTimeMilli >= currentTimestamp);
}

export const computeMinimumNextBid = (
    amount: number,
    requiredPercentIncrease: number
) => {
    // unable to bid 0, min bid is 1 lamport
    if (amount === 0) return (1 / LAMPORTS_PER_SOL);

    const minBidAmount = Math.round((1 + (requiredPercentIncrease / 100)) * amount);

    // a single lamport over current bid amount
    if (minBidAmount === amount) {
        return amount + 1;
    }

    return minBidAmount;
}

const minBidSol = (minBid: number): string => {
    if (minBid === 0) {
        return "0.01";
    }

    const roundedSol = Math.ceil((minBid / LAMPORTS_PER_SOL) * 100) / 100;
    return roundedSol.toString();
};

export const convertLamportsToSol = (amount: number): number => {
    return amount / LAMPORTS_PER_SOL;
}

export const convertSolToLamports = (amount: number): BN => {
    const _amount = amount * LAMPORTS_PER_SOL;
    return new BN(_amount);
}

export const getFormattedBidAmount = (amount: BN, truncate: boolean = true, decimals?: number): string => {
    const amt = convertLamportsToSol(amount.toNumber());

    if (amt < 1e1) return _getFormattedAmount(amt, 1e0, '', 3, false, decimals); // 0-9 => 3 decimals
    if (amt < 1e2) return _getFormattedAmount(amt, 1e1, '', 3, false, decimals); // 11-99 => 2 decimals
    if (amt < 1e3) return _getFormattedAmount(amt, 1e2, '', 3, false, decimals); // 100-999 => 1 decimal
    if (amt >= 1e3 && amt < 1e6) return _getFormattedAmount(amt, 1e3, 'K', 3, truncate, decimals); // 1,000-9,999 => 1.001K
    if (amt >= 1e6 && amt < 1e9) return _getFormattedAmount(amt, 1e6, 'M', 3, truncate, decimals); // 1,000,000-9,999,999 => 1.001M
    if (amt >= 1e9 && amt < 1e12) _getFormattedAmount(amt, 1e9, 'B', 3, truncate, decimals); // 1.001B
    if (amt >= 1e12) return _getFormattedAmount(amt, 1e12, 'T', 3, truncate, decimals); // 1.001T

    return `${amt}`;
}

const _getFormattedAmount = (n: number, divisor: number, valueToAppend: string, digits: number, truncate: boolean, decimals?: number): string => {
    const value: string = (truncate ? n / divisor : n).toFixed(decimals ? decimals : digits);
    return truncate ? value + valueToAppend : value;
}