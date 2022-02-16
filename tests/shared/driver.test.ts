import * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
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

    initConfig = async (maxSupply: number) => {
        const seed = generateSeed(CONFIG_SEED_LEN);
        const [configAddress, configBump] = await this.findConfigPda(seed);

        this.auctionFactoryAuthority = await this.nodeWallet.createFundedWallet(
            1 * LAMPORTS_PER_SOL
        );

        await this.initializeConfig(
            configAddress,
            configBump,
            seed,
            maxSupply,
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

    initAuction = async (sequence: BN) => {
        const auctionPda = await this.fetchAuctionPdaData(sequence);

        const payer = await this.nodeWallet.createFundedWallet(
            0.1 * LAMPORTS_PER_SOL
        );
        await this.createAuction(auctionPda.addr, auctionPda.bump, sequence, payer);
    };

    mintNftToAuction = async (sequence: BN, mint: Keypair) => {
        const payer = await this.nodeWallet.createFundedWallet(
            1 * LAMPORTS_PER_SOL
        );

        await this.mintTokenToAuction(sequence, mint, payer);
        await this.supplyResource(sequence, mint.publicKey, payer);
    };

    placeBidOnAuction = async (
        sequence: BN,
        amount: BN,
        bidder: Keypair
    ) => {
        await this.placeBid(sequence, amount, bidder);
    };

    settleCurrentAuction = async (
        sequence: BN,
        bidderTokenAccount: TokenAccount,
        mint: PublicKey
    ) => {
        const payer = await this.nodeWallet.createFundedWallet(
            1 * LAMPORTS_PER_SOL
        );

        await this.settleAuction(sequence, bidderTokenAccount, mint, payer);
    };

    closeAuctionATA = async (
        auction: PublicKey,
        bump: number,
        sequence: BN,
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

    closeCurrentAuctionATA = async () => {
        let auctionFactoryAccount = await this.fetchAuctionFactory(
            this.auctionFactory.config.address
        );
        const [addr, bump] = await this.findAuctionPda(
            auctionFactoryAccount.sequence,
            this.auctionFactory.config.address
        );

        const auction = await this.fetchAuction(addr);
        const mint = new PublicKey(auction.resource);
        const [auctionTokenAccount, _auctionTokenAccountBump] =
            await this.getAssociatedTokenAccountAddress(addr, mint);

        const payer = await this.nodeWallet.createFundedWallet(
            1 * LAMPORTS_PER_SOL
        );

        await this.closeAuctionTokenAccount(
            addr,
            bump,
            auctionFactoryAccount.sequence,
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

    getCurrentAuctionAddress = async () => {
        const auctionFactoryAccount = await this.fetchAuctionFactory(
            this.auctionFactory.config.address
        );

        const [addr, _bump] = await this.findAuctionPda(
            auctionFactoryAccount.sequence,
            this.auctionFactory.config.address
        );
        return addr;
    };

    getAuctionFactory = async () => {
        return await this.fetchAuctionFactory(
            this.auctionFactory.config.address
        );
    }
}
