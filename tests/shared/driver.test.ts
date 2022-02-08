import * as anchor from "@project-serum/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

import {
    NodeWallet,
    AuctionFactoryClient,
    generateSeed,
    AUCTION_FACTORY_SEED_LEN,
    CONFIG_SEED_LEN,
    AuctionFactoryData,
    TokenAccount,
} from "../../sdk/src";

// ============================================================================
// base tester class
// ============================================================================

export class AuctionFactoryTestClient extends AuctionFactoryClient {
    isVerbose: boolean = true;
    nodeWallet: NodeWallet;
    funder: Keypair;

    auctionFactoryAuthority: Keypair;

    constructor() {
        // setup connection & local wallet
        super(
            anchor.Provider.env().connection,
            anchor.Provider.env().wallet as anchor.Wallet
        );

        this.nodeWallet = new NodeWallet(
            anchor.Provider.env().connection,
            anchor.Provider.env().wallet as anchor.Wallet
        );

        this.funder = this.nodeWallet.wallet.payer;
    }

    // ===== CONFIG =====

    getConfigDetails = () => {
        return this.config;
    };

    initConfig = async (masSupply: number) => {
        const seed = generateSeed(CONFIG_SEED_LEN);
        const [configAddress, configBump] = await this.findConfigPda(seed);

        this.auctionFactoryAuthority = await this.nodeWallet.createFundedWallet(
            1 * LAMPORTS_PER_SOL
        );

        await this.initializeConfig(
            configAddress,
            configBump,
            seed,
            masSupply,
            this.auctionFactoryAuthority
        );

        // set config so that parent auction factory client
        this.updateConfigDetails(configAddress, configBump, seed);
    };

    addDataToConfig = async (data: string[]) => {
        await this.addConfig(data, this.auctionFactoryAuthority);
    };

    // ===== AUCTION FACTORY =====

    initializeAuctionFactory = async (
        duration: number,
        timeBuffer: number,
        minBidPercentageIncrease: number,
        minReservePrice: number,
        seed?: string
    ) => {
        const _seed = seed ? seed : generateSeed(AUCTION_FACTORY_SEED_LEN);
        const [afAddress, afBump] = await this.findAuctionFactoryPda(_seed);

        const config = {
            duration: new anchor.BN(duration),
            timeBuffer: new anchor.BN(timeBuffer),
            minBidPercentageIncrease: new anchor.BN(minBidPercentageIncrease),
            minReservePrice: new anchor.BN(minReservePrice),
        } as AuctionFactoryData;

        const treasury = await this.nodeWallet.createFundedWallet(
            0.1 * LAMPORTS_PER_SOL
        );

        await this.initialize(
            afAddress,
            afBump,
            _seed,
            config,
            treasury.publicKey,
            this.auctionFactoryAuthority
        );

        // console.log('after init', this.auctionFactory.config.address.toString());
    };

    toggleAuctionFactoryStatus = async () => {
        await this.toggleStatus(this.auctionFactoryAuthority);
    };

    modifyAuctionFactory = async (
        duration: number,
        timeBuffer: number,
        minBidPercentageIncrease: number,
        minReservePrice: number,
        payer?: Keypair
    ) => {
        const config = {
            duration: new anchor.BN(duration),
            timeBuffer: new anchor.BN(timeBuffer),
            minBidPercentageIncrease: new anchor.BN(minBidPercentageIncrease),
            minReservePrice: new anchor.BN(minReservePrice),
        } as AuctionFactoryData;

        await this.modify(config, payer ? payer : this.auctionFactoryAuthority);
    };

    changeTreasury = async (treasury: PublicKey) => {
        await this.updateTreasury(treasury, this.auctionFactoryAuthority);
    };

    changeAuthority = async (authority: Keypair) => {
        await this.updateAuthority(
            authority.publicKey,
            this.auctionFactoryAuthority
        );

        this.auctionFactoryAuthority = authority;
    };

    dumpLamportsToTreasury = async () => {
        await this.transferLamports(
            this.auctionFactory.treasury,
            this.auctionFactoryAuthority
        );
    };

    // ===== AUCTION =====

    initAuction = async (sequence: number) => {
        const [auction, bump] = await this.findAuctionPda(
            sequence,
            this.auctionFactory.config.address
        );

        const payer = await this.nodeWallet.createFundedWallet(
            0.1 * LAMPORTS_PER_SOL
        );
        await this.createAuction(auction, bump, sequence, payer);
    };

    mintNftToAuction = async (
        mint: Keypair,
        auctionTokenAccount: TokenAccount
    ) => {
        const payer = await this.nodeWallet.createFundedWallet(
            1 * LAMPORTS_PER_SOL
        );

        await this.mintTokenToAuction(mint, auctionTokenAccount, payer);

        await this.supplyResource(mint.publicKey, payer);
    };

    placeBidOnAuction = async (amount: number, bidder: Keypair) => {
        await this.placeBid(amount, bidder);
    };

    settleCurrentAuction = async (
        bidderTokenAccount: TokenAccount,
        mint: PublicKey
    ) => {
        const payer = await this.nodeWallet.createFundedWallet(
            1 * LAMPORTS_PER_SOL
        );

        await this.settleAuction(bidderTokenAccount, mint, payer);
    };

    closeAuctionATA = async (
        auction: PublicKey,
        bump: number,
        sequence: number,
        auctionTokenAccount: PublicKey
    ) => {
        const payer = await this.nodeWallet.createFundedWallet(
            1 * LAMPORTS_PER_SOL
        );

        await this.closeAuctionTokenAccount(
            auction,
            bump,
            sequence,
            auctionTokenAccount,
            payer
        );
    };

    // ============================================================================
    // generic helpers
    // ============================================================================

    addFundsToAuctionFactory = async (lamports: number): Promise<void> => {
        await this.nodeWallet.fundWallet(
            this.auctionFactory.config.address,
            lamports
        );
    };

    getAuctionTokenAccountBalance = async (
        auction: PublicKey,
        mint: PublicKey
    ): Promise<number> => {
        const [auctionTokenAccount, _bump] =
            await this.getAssociatedTokenAccountAddress(auction, mint);
        const auctionTokenAmount = await this.getTokenBalance(
            auctionTokenAccount
        );

        return +auctionTokenAmount["value"]["amount"];
    };
}
