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

export const getFormattedBidAmount = (amount: BN): string => {
    const amt = convertLamportsToSol(amount.toNumber());

    if (amt < 1e1) return amt.toFixed(3);
    if (amt < 1e2) return amt.toFixed(2);
    if (amt < 1e3) return amt.toFixed(1);
    if (amt >= 1e3 && amt < 1e6) return +(amt / 1e3).toFixed(1) + "K";
    if (amt >= 1e6 && amt < 1e9) return +(amt / 1e6).toFixed(1) + "M";
    if (amt >= 1e9 && amt < 1e12) return +(amt / 1e9).toFixed(1) + "B";
    if (amt >= 1e12) return +(amt / 1e12).toFixed(1) + "T";

    return `${amt}`;
}