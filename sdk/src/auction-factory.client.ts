import * as anchor from "@project-serum/anchor";
import { Idl, Program, Provider, Wallet } from "@project-serum/anchor";
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    Transaction,
    sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as lodash from "lodash";
import { TOKEN_PROGRAM_ID, Token, MintLayout } from "@solana/spl-token";

import { isBlank } from "./common/util";
import { AuctionFactory as AuctionFactoryProgram } from "./types/auction_factory";
import { AccountUtils } from "./common/account-utils";
import { AUX_FAX_SEED, AUX_SEED, URI_CONFIG_SEED, TOKEN_METADATA_PROGRAM_ID, isKp } from "./common";

export interface TokenAccount {
    address: PublicKey;
    bump: number;
}

export interface Config {
    bump: number;
    address: PublicKey;
    seed?: string;
}

export interface AuctionConfig {
    config: Config;
    sequence: number;
    leadingBidder?: PublicKey;
    amount?: number;
}

export interface AuctionFactoryConfig {
    config: Config;
    treasury: PublicKey;
    // authority: PublicKey;
}

export interface AuctionFactoryData {
    duration: anchor.BN;
    timeBuffer: anchor.BN;
    minBidPercentageIncrease: anchor.BN;
    minReservePrice: anchor.BN;
}

export class AuctionFactoryClient extends AccountUtils {
    wallet: anchor.Wallet;
    provider: anchor.Provider;
    program: anchor.Program<AuctionFactoryProgram>;

    isVerbose: boolean;

    auctionFactory: AuctionFactoryConfig;
    auction: AuctionConfig;
    config: Config;
    maxSupply: number;

    constructor(
        connection: Connection,
        wallet: Wallet,
        idl?: Idl,
        programId?: PublicKey
    ) {
        super(connection);
        this.wallet = wallet;
        this.setProvider();
        this.setAuctionFactoryProgram(idl, programId);

        // verbose by default in test
        this.isVerbose = idl ? false : true;
    }

    setVerbosity = (verbosity: boolean) => {
        this.isVerbose = verbosity;
    };

    setProvider = () => {
        this.provider = new Provider(
            this.connection,
            this.wallet,
            Provider.defaultOptions()
        );
        anchor.setProvider(this.provider);
    };

    setAuctionFactoryProgram = (idl?: Idl, programId?: PublicKey) => {
        // instantiating program depends on the environment
        if (idl && programId) {
            // prod env
            this.program = new anchor.Program<AuctionFactoryProgram>(
                idl as any,
                programId,
                this.provider
            );
        } else {
            // test env
            this.program = anchor.workspace
                .AuctionFactory as Program<AuctionFactoryProgram>;
        }
    };

    // ============================================================================
    // fetch deserialized accounts
    // ============================================================================

    fetchAuctionFactory = async (auctionFactory: PublicKey) => {
        return this.program.account.auctionFactory.fetch(auctionFactory);
    };

    fetchAuction = async (auction: PublicKey) => {
        return this.program.account.auction.fetch(auction);
    };

    fetchConfig = async (config: PublicKey) => {
        return this.program.account.config.fetch(config);
    };

    // ============================================================================
    // find PDA accounts
    // ============================================================================

    findAuctionFactoryPda = async (seed: string) => {
        return this.findProgramAddress(this.program.programId, [
            AUX_FAX_SEED,
            seed,
        ]);
    };

    findAuctionPda = async (sequence: number, auctionFactory: PublicKey) => {
        return this.findProgramAddress(this.program.programId, [
            AUX_SEED,
            auctionFactory,
            sequence.toString(),
        ]);
    };

    findConfigPda = async (seed: string) => {
        return this.findProgramAddress(this.program.programId, [
            URI_CONFIG_SEED,
            seed,
        ]);
    };

    // ============================================================================
    // auction factory client
    // ============================================================================

    updateConfigDetails = (
        address: PublicKey,
        bump: number,
        seed: string
    ) => {
        this.config = {
            address,
            bump,
            seed
        }
    }

    updateAuctionFactoryDetails = (
        address: PublicKey,
        bump: number,
        seed: string
    ) => {
        this.auctionFactory.config = {
            address,
            bump,
            seed
        }
    }

    initialize = async (
        auctionFactory: PublicKey,
        bump: number,
        seed: string,
        config: AuctionFactoryData,
        treasury: PublicKey,
        payer: PublicKey | Keypair
    ) => {
        const payerIsKeypair = isKp(payer);
        const _payer = payerIsKeypair ? (<Keypair>payer).publicKey : payer;

        // assert signers is non-empty array?
        const signers = [];
        if (payerIsKeypair) signers.push(<Keypair>payer);

        if (this.isVerbose) {
            console.log(
                `initialize auction factory with address ${auctionFactory.toString()} and config ${config}. payer: ${_payer.toString()} and ${
                    signers.length
                } signers`
            );
        }

        await this.program.rpc.initializeAuctionFactory(
            bump,
            seed,
            this.config.bump,
            this.config.seed,
            {
                duration: config.duration,
                timeBuffer: config.timeBuffer,
                minBidPercentageIncrease: config.minBidPercentageIncrease,
                minReservePrice: config.minReservePrice,
            },
            {
                accounts: {
                    auctionFactory,
                    config: this.config.address,
                    payer: _payer,
                    treasury,
                    systemProgram: SystemProgram.programId,
                },
                signers,
            }
        );

        this.auctionFactory = {
            config: {
                bump,
                address: auctionFactory,
                seed,
            },
            treasury,
        };
    };

    toggleStatus = async (payer: PublicKey | Keypair) => {
        const payerIsKeypair = isKp(payer);
        const _payer = payerIsKeypair ? (<Keypair>payer).publicKey : payer;

        // assert signers is non-empty array?
        const signers = [];
        if (payerIsKeypair) signers.push(<Keypair>payer);

        if (this.isVerbose) {
            console.log(
                `toggling auction factory with address ${this.auctionFactory.config.address.toString()} status. payer: ${_payer.toString()} and ${
                    signers.length
                } signers`
            );
        }

        await this.program.rpc.toggleAuctionFactoryStatus(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed!,
            {
                accounts: {
                    payer: _payer,
                    auctionFactory: this.auctionFactory.config.address,
                },
                signers,
            }
        );
    };

    modify = async (config: AuctionFactoryData, payer: PublicKey | Keypair) => {
        const payerIsKeypair = isKp(payer);
        const _payer = payerIsKeypair ? (<Keypair>payer).publicKey : payer;

        // assert signers is non-empty array?
        const signers = [];
        if (payerIsKeypair) signers.push(<Keypair>payer);

        if (this.isVerbose) {
            console.log(
                `modify auction factory with address ${this.auctionFactory.config.address.toString()} status and config`,  config, `.payer: ${_payer.toString()} and ${
                    signers.length
                } signers`
            );
        }

        await this.program.rpc.modifyAuctionFactoryData(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed!,
            config,
            {
                accounts: {
                    payer: _payer,
                    auctionFactory: this.auctionFactory.config.address,
                },
                signers,
            }
        );
    };

    updateTreasury = async (
        treasury: PublicKey,
        payer: PublicKey | Keypair
    ) => {
        const payerIsKeypair = isKp(payer);
        const _payer = payerIsKeypair ? (<Keypair>payer).publicKey : payer;

        // assert signers is non-empty array?
        const signers = [];
        if (payerIsKeypair) signers.push(<Keypair>payer);

        if (this.isVerbose) {
            console.log(
                `update auction factory with address ${this.auctionFactory.config.address.toString()} treasury: ${treasury.toString()}. payer: ${_payer.toString()} and ${
                    signers.length
                } signers`
            );
        }

        await this.program.rpc.updateTreasury(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed!,
            {
                accounts: {
                    payer: _payer,
                    auctionFactory: this.auctionFactory.config.address,
                    treasury,
                },
                signers,
            }
        );

        // update state config
        this.auctionFactory = {
            ...this.auctionFactory,
            treasury,
        };
    };

    updateAuthority = async (
        authority: PublicKey,
        payer: PublicKey | Keypair
    ) => {
        const payerIsKeypair = isKp(payer);
        const _payer = payerIsKeypair ? (<Keypair>payer).publicKey : payer;

        // assert signers is non-empty array?
        const signers = [];
        if (payerIsKeypair) signers.push(<Keypair>payer);

        if (this.isVerbose) {
            console.log(
                `update auction factory with address ${this.auctionFactory.config.address.toString()} authority: ${authority.toString()}. payer: ${_payer.toString()} and ${
                    signers.length
                } signers`
            );
        }

        await this.program.rpc.updateAuthority(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed!,
            {
                accounts: {
                    payer: _payer,
                    auctionFactory: this.auctionFactory.config.address,
                    newAuthority: authority,
                },
                signers,
            }
        );
    };

    transferLamports = async (dest: PublicKey, payer: PublicKey | Keypair) => {
        const payerIsKeypair = isKp(payer);
        const _payer = payerIsKeypair ? (<Keypair>payer).publicKey : payer;

        // assert signers is non-empty array?
        const signers = [];
        if (payerIsKeypair) signers.push(<Keypair>payer);

        if (this.isVerbose) {
            console.log(
                `transfer auction factory [${this.auctionFactory.config.address.toString()}] lamports to: ${dest.toString()}. payer: ${_payer.toString()} and ${
                    signers.length
                } signers`
            );
        }

        await this.program.rpc.transferLamportsToTreasury(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed!,
            {
                accounts: {
                    payer: _payer,
                    auctionFactory: this.auctionFactory.config.address,
                    treasury: dest,
                },
                signers,
            }
        );
    };

    // ============================================================================
    // auction client
    // ============================================================================

    // abstract away the complexity of creating auctions. even though the on-chain program has
    // two different endpoints depending on the auction sequence, the caller only sees 1.
    createAuction = async (
        auction: PublicKey,
        bump: number,
        sequence: number,
        payer: PublicKey | Keypair
    ) => {
        const payerIsKeypair = isKp(payer);
        const _payer = payerIsKeypair ? (<Keypair>payer).publicKey : payer;

        // assert signers is non-empty array?
        const signers = [];
        if (payerIsKeypair) signers.push(<Keypair>payer);

        if (this.isVerbose) {
            console.log(
                `create ${
                    sequence + 1
                } auction with address ${auction.toString()}. payer: ${_payer.toString()} and ${
                    signers.length
                } signers`
            );
        }

        const seq = new anchor.BN(sequence);
        if (seq.eq(new anchor.BN(0))) {
            await this.program.rpc.createFirstAuction(
                this.auctionFactory.config.bump,
                this.auctionFactory.config.seed,
                bump,
                seq,
                {
                    accounts: {
                        payer: _payer,
                        auctionFactory: this.auctionFactory.config.address,
                        auction,
                        systemProgram: SystemProgram.programId,
                    },
                    signers,
                }
            );
        } else {
            await this.program.rpc.createNextAuction(
                this.auctionFactory.config.bump,
                this.auctionFactory.config.seed,
                this.auction.config.bump,
                bump,
                seq.sub(new anchor.BN(1)),
                seq,
                {
                    accounts: {
                        payer: _payer,
                        auctionFactory: this.auctionFactory.config.address,
                        currentAuction: this.auction.config.address,
                        nextAuction: auction,
                        systemProgram: SystemProgram.programId,
                    },
                    signers,
                }
            );
        }

        // update auction state var
        this.auction = {
            config: {
                bump,
                address: auction,
            },
            sequence,
            leadingBidder: undefined,
            amount: 0,
        };

        return;
    };

    buildMintToAuctionInstruction = async (
        sequence: number,
        mint: PublicKey,
        tokenMintAccount: PublicKey
    ) => {
        return this.program.instruction.mintToAuction(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed,
            this.auction.config.bump,
            new anchor.BN(sequence),
            {
                accounts: {
                    mint,
                    tokenMintAccount,
                    auctionFactory: this.auctionFactory.config.address,
                    auction: this.auction.config.address,
                    tokenProgram: TOKEN_PROGRAM_ID,
                },
            }
        );
    };

    mintTokenToAuction = async (
        mint: Keypair,
        bidderTokenAccount: TokenAccount,
        payer: PublicKey | Keypair
    ) => {
        const payerIsKeypair = isKp(payer);
        // @ts-ignore: why is this complaining?
        const _payer: PublicKey = payerIsKeypair
            ? (<Keypair>payer).publicKey
            : payer;

        const signers = [];
        if (payerIsKeypair) signers.push(<Keypair>payer);
    
        const [auctionTokenAccount, _auctionTokenAccountBump] =
            await this.getAssociatedTokenAccountAddress(
                this.auction.config.address,
                mint.publicKey
            );

        const owner = this.auction.config.address;
        const mintTx = new Transaction()
            .add(
                SystemProgram.createAccount({
                    fromPubkey: _payer,
                    newAccountPubkey: mint.publicKey,
                    space: MintLayout.span,
                    lamports:
                        await this.program.provider.connection.getMinimumBalanceForRentExemption(
                            MintLayout.span
                        ),
                    programId: TOKEN_PROGRAM_ID,
                })
            )
            //init the mint
            .add(
                Token.createInitMintInstruction(
                    TOKEN_PROGRAM_ID,
                    mint.publicKey,
                    0,
                    owner,
                    owner
                )
            )
            // create token account for new token
            .add(
                this.createAssociatedTokenAccount(
                    mint.publicKey,
                    bidderTokenAccount.address,
                    owner, // owner
                    _payer // payer
                )
            )
            .add(
                await this.buildMintToAuctionInstruction(
                    this.auction.sequence,
                    mint.publicKey,
                    auctionTokenAccount
                )
            );

        // how to add keypair here?
        await sendAndConfirmTransaction(
            this.program.provider.connection,
            mintTx,
            [...signers, mint] // todo: does this work in the browser?
        );
    };

    supplyResource = async (mint: PublicKey, payer: PublicKey | Keypair) => {
        const payerIsKeypair = isKp(payer);
        const _payer = payerIsKeypair ? (<Keypair>payer).publicKey : payer;

        // assert signers is non-empty array?
        const signers = [];
        if (payerIsKeypair) signers.push(<Keypair>payer);

        if (this.isVerbose) {
            console.log(
                `supply resource with mint ${mint.toString()} to auction with address ${this.auction.config.address.toString()}. payer: ${_payer.toString()} and ${
                    signers.length
                } signers`
            );
        }

        const metadata = await this.getMetadata(mint);
        const masterEdition = await this.getMasterEdition(mint);
        const seq = new anchor.BN(this.auction.sequence);

        await this.program.rpc.supplyResourceToAuction(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed,
            this.auction.config.bump,
            this.config.bump,
            this.config.seed,
            seq,
            {
                accounts: {
                    payer: _payer,
                    config: this.config.address,
                    auction: this.auction.config.address,
                    auctionFactory: this.auctionFactory.config.address,
                    metadata,
                    masterEdition,
                    mint,
                    tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    rent: SYSVAR_RENT_PUBKEY,
                },
                signers
            }
        );
    };

    placeBid = async (
        amount: number,
        payer: PublicKey | Keypair // payer is bidder
    ) => {
        const payerIsKeypair = isKp(payer);
        const _payer = payerIsKeypair ? (<Keypair>payer).publicKey : payer;

        // assert signers is non-empty array?
        const signers = [];
        if (payerIsKeypair) signers.push(<Keypair>payer);

        // todo: if state gets corrupted, we could run into issues here. this helps abstract details
        // from caller. but, maybe it's better to directly force caller to pass param.
        const auctionAmount = this.auction.amount ? this.auction.amount : 0;
        const leadingBidder =
            this.auction.leadingBidder !== undefined && auctionAmount > 0
                ? this.auction.leadingBidder
                : _payer;

        if (this.isVerbose) {
            console.log(
                `${_payer.toString()} place bid of ${amount} on auction with address ${this.auction.config.address.toString()}. payer: ${_payer.toString()} and ${
                    signers.length
                } signers`
            );
        }

        const seq = new anchor.BN(this.auction.sequence);
        await this.program.rpc.placeBid(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed,
            this.auction.config.bump,
            seq,
            new anchor.BN(amount),
            {
                accounts: {
                    bidder: _payer,
                    leadingBidder,
                    auctionFactory: this.auctionFactory.config.address,
                    auction: this.auction.config.address,
                    systemProgram: SystemProgram.programId,
                },
                signers,
            }
        );

        // update auction state after latest bid
        this.auction = {
            ...this.auction,
            leadingBidder: _payer as PublicKey,
            amount,
        };
    };

    settleAuction = async (
        bidderTokenAccount: TokenAccount,
        mint: PublicKey,
        payer: PublicKey | Keypair
    ) => {
        const payerIsKeypair = isKp(payer);
        const _payer = payerIsKeypair ? (<Keypair>payer).publicKey : payer;

        // assert signers is non-empty array?
        const signers = [];
        if (payerIsKeypair) signers.push(<Keypair>payer);

        if (this.isVerbose) {
            console.log(
                `settle auction with address ${this.auction.config.address.toString()}. payer: ${_payer.toString()} and ${
                    signers.length
                } signers`
            );
        }

        const metadata = await this.getMetadata(mint);
        const [auctionTokenAccount, _auctionTokenAccountBump] =
            await this.getAssociatedTokenAccountAddress(
                this.auction.config.address,
                mint
            );

        const seq = new anchor.BN(this.auction.sequence);

        const auctionAccount = await this.fetchAuction(this.auction.config.address);
        // make sure to add ixn to create bidder ATA account before attempting to transfer token
        const preInstructions =
            auctionAccount.amount.toNumber() > 0
                ? [
                      this.createAssociatedTokenAccount(
                          mint,
                          bidderTokenAccount.address,
                          auctionAccount.bidder, // owner
                          _payer as PublicKey // payer
                      ),
                  ]
                : [];

        await this.program.rpc.settleAuction(
            bidderTokenAccount.bump,
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed,
            this.auction.config.bump,
            seq,
            {
                accounts: {
                    payer: _payer,
                    treasury: this.auctionFactory.treasury,
                    metadata,
                    auctionFactory: this.auctionFactory.config.address,
                    auction: this.auction.config.address,
                    mint,
                    bidderTokenAccount: bidderTokenAccount.address,
                    auctionTokenAccount,
                    tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                },
                instructions: preInstructions,
                signers,
            }
        );
    };

    // warn: do not rely on client state for this function. caller can close any auction's state at any time.
    closeAuctionTokenAccount = async (
        auction: PublicKey,
        bump: number,
        sequence: number,
        auctionTokenAccount: PublicKey,
        payer: PublicKey | Keypair
    ) => {
        const payerIsKeypair = isKp(payer);
        const _payer = payerIsKeypair ? (<Keypair>payer).publicKey : payer;

        // assert signers is non-empty array?
        const signers = [];
        if (payerIsKeypair) signers.push(<Keypair>payer);

        if (this.isVerbose) {
            console.log(
                `closing auction ATA [${auctionTokenAccount.toString()}]. payer: ${_payer.toString()} and ${
                    signers.length
                } signers`
            );
        }

        await this.program.rpc.closeAuctionTokenAccount(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed,
            bump,
            new anchor.BN(sequence),
            {
                accounts: {
                    payer: _payer,
                    treasury: this.auctionFactory.treasury,
                    auctionFactory: this.auctionFactory.config.address,
                    auction,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    auctionTokenAccount,
                },
                signers,
            }
        );
    };

    // ============================================================================
    // config client
    // ============================================================================

    initializeConfig = async (
        config: PublicKey,
        bump: number,
        seed: string,
        maxSupply: number,
        payer: PublicKey | Keypair
    ) => {
        const payerIsKeypair = isKp(payer);
        const _payer = payerIsKeypair ? (<Keypair>payer).publicKey : payer;

        // assert signers is non-empty array?
        const signers = [];
        if (payerIsKeypair) signers.push(<Keypair>payer);

        if (this.isVerbose) {
            console.log(
                `calling initialize config with address ${config.toString()}. payer: ${_payer.toString()} and ${
                    signers.length
                } signers`
            );
        }

        await this.program.rpc.initializeConfig(
            bump,
            seed,
            maxSupply,
            {
                accounts: {
                    config,
                    payer: _payer,
                    systemProgram: SystemProgram.programId,
                },
                signers,
            }
        );

        this.maxSupply = maxSupply;
    };

    addConfig = async (data: string[], payer: PublicKey | Keypair) => {
        // if (!this.isAuctionFactoryValid() && !this.isConfigValid()) {
        //     throw new Error(
        //         "Initialize auction factory and config accounts before adding config"
        //     );
        // }

        const payerIsKeypair = isKp(payer);
        const _payer = payerIsKeypair ? (<Keypair>payer).publicKey : payer;

        // assert signers is non-empty array?
        const signers = [];
        if (payerIsKeypair) signers.push(<Keypair>payer);

        if (this.isVerbose) {
            console.log(
                `adding ${
                    data.length
                } items to config with address ${this.config.address.toString()}. payer: ${_payer.toString()} and ${
                    signers.length
                } signers`
            );
        }

        await this.program.rpc.addUrisToConfig(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed,
            this.config.bump,
            this.config.seed!,
            data,
            {
                accounts: {
                    auctionFactory: this.auctionFactory.config.address,
                    config: this.config.address,
                    payer: _payer,
                    systemProgram: SystemProgram.programId,
                },
                signers,
            }
        );
    };

    // ============================================================================
    // program state validation
    // ============================================================================

    validateAuctionFactory = (): void => {
        if (!this.isAuctionFactoryValid()) {
            throw new Error("Must initialize auction factory");
        }
    };

    isAuctionFactoryValid = (): boolean => {
        return (
            this.auctionFactory &&
            lodash.isNumber(this.auctionFactory.config.bump) &&
            !isBlank(this.auctionFactory.config.seed!)
        );
    };

    validateConfig = (): void => {
        if (!this.isConfigValid()) {
            throw new Error("Must initialize config");
        }
    };

    isConfigValid = (): boolean => {
        return (
            this.config &&
            lodash.isNumber(this.config.bump) &&
            !isBlank(this.config.seed!)
        );
    };

    validateAuction = (): void => {
        if (!this.isAuctionValid()) {
            throw new Error("Must initialize auction");
        }
    };

    isAuctionValid = (): boolean => {
        return (
            this.auction &&
            lodash.isNumber(this.auction.config.bump) &&
            lodash.isNumber(this.auction.sequence)
        );
    };
}
