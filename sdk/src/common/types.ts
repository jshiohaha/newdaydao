import { Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "@project-serum/anchor";

export function isKp(kp: PublicKey | Keypair) {
    return kp instanceof Keypair || "_keypair" in kp;
}

export interface TokenAccount {
    address: PublicKey;
    bump: number;
}

export interface Config {
    bump: number;
    address: PublicKey;
    seed?: string;
}

export interface AuctionFactoryConfig {
    config: Config;
    treasury: PublicKey;
}

export interface Bid {
    bidder: PublicKey;
    updatedAt: BN;
    amount: BN;
}

export interface Auction {
    bump: number;
    sequence: BN;
    authority: PublicKey;
    startTime: BN;
    endTime: BN;
    finalizedEndTime: BN;
    settled: boolean;
    amount: BN;
    bidder: PublicKey;
    bidTime: BN;
    resource?: PublicKey;
    bids: Bid[];
}

export interface AuctionFactoryData {
    duration: BN;
    timeBuffer: BN;
    minBidPercentageIncrease: BN;
    minReservePrice: BN;
}

export interface AuctionFactory {
    bump: number;
    seed: string;
    sequence: BN;
    authority: PublicKey;
    isActive: boolean;
    data: AuctionFactoryData;
    initializedAt: BN;
    activeSince: number;
    treasury: PublicKey;
    config: PublicKey;
}

export interface SignerInfo {
    payer: PublicKey,
    signers: Keypair[]
}

export interface AuctionPdaData {
    addr: PublicKey,
    bump: number,
}