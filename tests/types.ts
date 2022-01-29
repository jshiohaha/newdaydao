import {
    PublicKey,
} from "@solana/web3.js";

export interface PdaConfig {
    address: PublicKey,
    bump: number
}

export interface AuctionsData {
    currentAuction: PublicKey,
    nextAuction: PublicKey,
    currentAuctionBump: number,
    nextAuctionBump: number,
}

export enum Network {
    Testnet = "testnet",
    Devnet = "devnet",
    Mainnet = "mainnet",
    Localnet = "localnet"
}
