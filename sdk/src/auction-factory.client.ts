import * as anchor from "@project-serum/anchor";
import { Idl, Program, Provider, Wallet, BN } from "@project-serum/anchor";
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import * as lodash from "lodash";
import { TOKEN_PROGRAM_ID, Token, MintLayout } from "@solana/spl-token";

import { isBlank, getSignersFromPayer } from "./common/util";
import { AuctionFactory as AuctionFactoryProgram } from "./types/auction_factory";
import { AccountUtils } from "./common/account-utils";
import {
    AUX_FAX_SEED,
    AUX_SEED,
    URI_CONFIG_SEED,
    TOKEN_METADATA_PROGRAM_ID,
} from "./common";
import {
    AuctionFactoryConfig,
    Config,
    AuctionFactoryData,
    TokenAccount,
    AuctionPdaData,
} from "./common/types";
import { BN_ZERO, BN_ONE } from "./common/constant";

export class AuctionFactoryClient extends AccountUtils {
    wallet: anchor.Wallet;
    provider: anchor.Provider;
    program: anchor.Program<AuctionFactoryProgram>;

    auctionFactory: AuctionFactoryConfig;
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
    }

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

    fetchAuctionWithSequence = async (sequence: BN) => {
        const addr = await this.getAuctionAddressWithSequence(sequence);
        return this.program.account.auction.fetch(addr);
    };

    fetchCurrentAuction = async () => {
        const auctionFactory = await this.fetchAuctionFactory(
            this.auctionFactory.config.address
        );
        return await this.fetchAuctionWithSequence(auctionFactory.sequence);
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

    findAuctionPda = async (sequence: BN, auctionFactory: PublicKey) => {
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

    fetchAuctionPdaData = async (sequence: BN): Promise<AuctionPdaData> => {
        const [addr, bump] = await this.findAuctionPda(
            sequence,
            this.auctionFactory.config.address
        );

        return {
            addr,
            bump,
        } as AuctionPdaData;
    };

    getAuctionAddressWithSequence = async (sequence: BN) => {
        const [addr, _bump] = await this.findAuctionPda(
            sequence,
            this.auctionFactory.config.address
        );

        return addr;
    };

    // ============================================================================
    // account balances
    // ============================================================================

    getTreasuryBalance = async () => {
        // verify treasury balance has not changed
        return await this.getBalance(this.auctionFactory.treasury);
    };

    getAuctionFactoryBalance = async () => {
        // verify treasury balance has not changed
        return await this.getBalance(this.auctionFactory.config.address);
    };

    // getAuctionBalance();
    // getAuctionFactoryBalance();
    // ============================================================================
    // auction factory client
    // ============================================================================

    updateConfigDetails = (address: PublicKey, bump: number, seed: string) => {
        this.config = {
            address,
            bump,
            seed,
        };
    };

    setAuctionFactoryDetails = (
        address: PublicKey,
        bump: number,
        seed: string,
        treasury: PublicKey
    ) => {
        this.auctionFactory = {
            config: {
                address,
                bump,
                seed,
            },
            treasury
        };
    };

    updateAuctionFactoryDetails = (
        address: PublicKey,
        bump: number,
        seed?: string,
        treasury?: PublicKey
    ) => {
        if (!this.auctionFactory) {
            this.auctionFactory = {} as any;
        }

        this.auctionFactory.config = {
            address,
            bump,
            seed,
        };

        if (treasury) {
            this.auctionFactory.treasury = treasury;
        }
    };

    initialize = async (
        auctionFactory: PublicKey,
        bump: number,
        seed: string,
        config: AuctionFactoryData,
        treasury: PublicKey,
        payer: PublicKey | Keypair
    ) => {
        const signerInfo = getSignersFromPayer(payer);

        this.validateConfig();
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
                    payer: signerInfo.payer,
                    treasury,
                    systemProgram: SystemProgram.programId,
                },
                signers: signerInfo.signers,
            }
        );

        this.setAuctionFactoryDetails(auctionFactory, bump, seed, treasury);
    };

    toggleStatus = async (payer: PublicKey | Keypair) => {
        const signerInfo = getSignersFromPayer(payer);

        this.validateAuctionFactory();
        await this.program.rpc.toggleAuctionFactoryStatus(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed,
            {
                accounts: {
                    payer: signerInfo.payer,
                    auctionFactory: this.auctionFactory.config.address,
                },
                signers: signerInfo.signers,
            }
        );
    };

    modify = async (config: AuctionFactoryData, payer: PublicKey | Keypair) => {
        const signerInfo = getSignersFromPayer(payer);

        this.validateAuctionFactory();
        await this.program.rpc.modifyAuctionFactoryData(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed,
            config,
            {
                accounts: {
                    payer: signerInfo.payer,
                    auctionFactory: this.auctionFactory.config.address,
                },
                signers: signerInfo.signers,
            }
        );
    };

    updateTreasury = async (
        treasury: PublicKey,
        payer: PublicKey | Keypair
    ) => {
        const signerInfo = getSignersFromPayer(payer);

        this.validateAuctionFactory();
        await this.program.rpc.updateTreasury(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed,
            {
                accounts: {
                    payer: signerInfo.payer,
                    auctionFactory: this.auctionFactory.config.address,
                    treasury,
                },
                signers: signerInfo.signers,
            }
        );

        // update state config
        this.updateAuctionFactoryDetails(
            this.auctionFactory.config.address,
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed,
            treasury
        );
    };

    updateAuthority = async (
        authority: PublicKey,
        payer: PublicKey | Keypair
    ) => {
        const signerInfo = getSignersFromPayer(payer);

        this.validateAuctionFactory();
        await this.program.rpc.updateAuthority(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed,
            {
                accounts: {
                    payer: signerInfo.payer,
                    auctionFactory: this.auctionFactory.config.address,
                    newAuthority: authority,
                },
                signers: signerInfo.signers,
            }
        );
    };

    transferLamports = async (dest: PublicKey, payer: PublicKey | Keypair) => {
        const signerInfo = getSignersFromPayer(payer);

        this.validateAuctionFactory();
        await this.program.rpc.transferLamportsToTreasury(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed,
            {
                accounts: {
                    payer: signerInfo.payer,
                    auctionFactory: this.auctionFactory.config.address,
                    treasury: dest,
                },
                signers: signerInfo.signers,
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
        sequence: BN,
        payer: PublicKey | Keypair
    ) => {
        const signerInfo = getSignersFromPayer(payer);

        this.validateAuctionFactory();
        this.validateConfig();

        if (sequence.eq(BN_ONE)) {
            await this.program.rpc.createFirstAuction(
                this.auctionFactory.config.bump,
                this.auctionFactory.config.seed,
                bump,
                sequence,
                {
                    accounts: {
                        payer: signerInfo.payer,
                        auctionFactory: this.auctionFactory.config.address,
                        auction,
                        systemProgram: SystemProgram.programId,
                    },
                    signers: signerInfo.signers,
                }
            );
        } else {
            const [currentAuction, currentAuctionBump] =
                await this.findAuctionPda(
                    sequence.sub(BN_ONE),
                    this.auctionFactory.config.address
                );

            await this.program.rpc.createNextAuction(
                this.auctionFactory.config.bump,
                this.auctionFactory.config.seed,
                currentAuctionBump,
                bump,
                sequence.sub(BN_ONE),
                sequence,
                {
                    accounts: {
                        payer: signerInfo.payer,
                        auctionFactory: this.auctionFactory.config.address,
                        currentAuction,
                        nextAuction: auction,
                        systemProgram: SystemProgram.programId,
                    },
                    signers: signerInfo.signers,
                }
            );
        }

        return;
    };

    buildMintToAuctionInstruction = async (
        sequence: BN,
        mint: PublicKey,
        tokenMintAccount: PublicKey
    ) => {
        this.validateAuctionFactory();
        const pdaData = await this.fetchAuctionPdaData(sequence);

        return this.program.instruction.mintToAuction(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed,
            pdaData.bump,
            new anchor.BN(sequence),
            {
                accounts: {
                    mint,
                    tokenMintAccount,
                    auctionFactory: this.auctionFactory.config.address,
                    auction: pdaData.addr,
                    tokenProgram: TOKEN_PROGRAM_ID,
                },
            }
        );
    };

    mintTokenToAuction = async (
        sequence: BN,
        mint: Keypair,
        payer: PublicKey | Keypair
    ) => {
        const signerInfo = getSignersFromPayer(payer);

        console.log(
            `create token with mint ${mint.publicKey.toString()} to auction with address. payer: ${signerInfo.payer.toString()}. payer and mint as signers.`
        );

        const pdaData = await this.fetchAuctionPdaData(sequence);
        const [auctionTokenAccount, _auctionTokenAccountBump] =
            await this.getAssociatedTokenAccountAddress(
                pdaData.addr,
                mint.publicKey
            );

        this.validateAuctionFactory();
        await this.program.rpc.mintToAuction(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed,
            pdaData.bump,
            sequence,
            {
                accounts: {
                    mint: mint.publicKey,
                    tokenMintAccount: auctionTokenAccount,
                    auctionFactory: this.auctionFactory.config.address,
                    auction: pdaData.addr,
                    tokenProgram: TOKEN_PROGRAM_ID,
                },
                instructions: [
                    SystemProgram.createAccount({
                        fromPubkey: signerInfo.payer,
                        newAccountPubkey: mint.publicKey,
                        space: MintLayout.span,
                        lamports:
                            await this.program.provider.connection.getMinimumBalanceForRentExemption(
                                MintLayout.span
                            ),
                        programId: TOKEN_PROGRAM_ID,
                    }),
                    Token.createInitMintInstruction(
                        TOKEN_PROGRAM_ID,
                        mint.publicKey,
                        0,
                        pdaData.addr,
                        pdaData.addr
                    ),
                    this.createAssociatedTokenAccount(
                        mint.publicKey,
                        auctionTokenAccount,
                        pdaData.addr, // owner
                        signerInfo.payer // payer
                    ),
                ],
                signers: [...signerInfo.signers, mint],
            }
        );
    };

    supplyResource = async (
        sequence: BN,
        mint: PublicKey,
        payer: PublicKey | Keypair
    ) => {
        this.validateConfig();
        this.validateAuctionFactory();

        const signerInfo = getSignersFromPayer(payer);
        const metadata = await this.getMetadata(mint);
        const masterEdition = await this.getMasterEdition(mint);
        const pdaData = await this.fetchAuctionPdaData(sequence);

        await this.program.rpc.supplyResourceToAuction(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed,
            pdaData.bump,
            this.config.bump,
            this.config.seed,
            sequence,
            {
                accounts: {
                    payer: signerInfo.payer,
                    config: this.config.address,
                    auction: pdaData.addr,
                    auctionFactory: this.auctionFactory.config.address,
                    metadata,
                    masterEdition,
                    mint,
                    tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    rent: SYSVAR_RENT_PUBKEY,
                },
                signers: signerInfo.signers,
            }
        );
    };

    placeBid = async (
        sequence: BN,
        amount: BN,
        payer: PublicKey | Keypair // payer is bidder
    ) => {
        this.validateAuctionFactory();

        const signerInfo = getSignersFromPayer(payer);

        const pdaData = await this.fetchAuctionPdaData(sequence);
        const auction = await this.fetchAuction(pdaData.addr);
        const auctionAmount: BN = auction.amount ? auction.amount : BN_ZERO;
        const leadingBidder =
            auction.bidder !== undefined && auctionAmount.gt(BN_ZERO)
                ? auction.bidder
                : signerInfo.payer;

        await this.program.rpc.placeBid(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed,
            pdaData.bump,
            sequence,
            new anchor.BN(amount),
            {
                accounts: {
                    bidder: signerInfo.payer,
                    leadingBidder,
                    auctionFactory: this.auctionFactory.config.address,
                    auction: pdaData.addr,
                    systemProgram: SystemProgram.programId,
                },
                signers: signerInfo.signers,
            }
        );
    };

    settleAuction = async (
        sequence: BN,
        bidderTokenAccount: TokenAccount | undefined,
        mint: PublicKey,
        payer: PublicKey | Keypair
    ) => {
        this.validateAuctionFactory();

        const signerInfo = getSignersFromPayer(payer);
        const pdaData = await this.fetchAuctionPdaData(sequence);
        const metadata = await this.getMetadata(mint);
        const [auctionTokenAccount, _auctionTokenAccountBump] =
            await this.getAssociatedTokenAccountAddress(pdaData.addr, mint);

        const auctionAccount = await this.fetchAuction(pdaData.addr);
        const randomKeypair = Keypair.generate();
        const [randomBidderAccount, _randomBidderAccountBump] =
            await this.getAssociatedTokenAccountAddress(
                randomKeypair.publicKey,
                mint
            );
        const bidderTokenAccountData = {
            address: bidderTokenAccount
                ? bidderTokenAccount.address
                : randomBidderAccount,
            bump: bidderTokenAccount ? bidderTokenAccount.bump : 0,
        };

        // make sure to add ixn to create bidder ATA account before attempting to transfer token
        const preInstructions = bidderTokenAccount // if not init, don't use it
            ? [
                  this.createAssociatedTokenAccount(
                      mint,
                      bidderTokenAccountData.address,
                      auctionAccount.bidder, // owner
                      signerInfo.payer // payer
                  ),
              ]
            : [];

        await this.program.rpc.settleAuction(
            bidderTokenAccountData.bump,
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed,
            pdaData.bump,
            sequence,
            {
                accounts: {
                    payer: signerInfo.payer,
                    treasury: this.auctionFactory.treasury,
                    metadata,
                    auctionFactory: this.auctionFactory.config.address,
                    auction: pdaData.addr,
                    mint,
                    bidderTokenAccount: bidderTokenAccountData.address,
                    auctionTokenAccount,
                    tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                },
                instructions: preInstructions,
                signers: signerInfo.signers,
            }
        );

        // no need to update auction config
    };

    // warn: do not rely on client state for this function. caller can close any auction's state at any time.
    closeAuctionTokenAccount = async (
        auction: PublicKey,
        bump: number,
        sequence: BN,
        auctionTokenAccount: PublicKey,
        payer: PublicKey | Keypair
    ) => {
        this.validateAuctionFactory();

        const signerInfo = getSignersFromPayer(payer);

        await this.program.rpc.closeAuctionTokenAccount(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed,
            bump,
            sequence,
            {
                accounts: {
                    payer: signerInfo.payer,
                    treasury: this.auctionFactory.treasury,
                    auctionFactory: this.auctionFactory.config.address,
                    auction,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    auctionTokenAccount,
                },
                signers: signerInfo.signers,
            }
        );
    };

    // ============================================================================
    // config client
    // ============================================================================

    initializeConfig = async (
        address: PublicKey,
        bump: number,
        seed: string,
        maxSupply: number,
        payer: PublicKey | Keypair
    ) => {
        const signerInfo = getSignersFromPayer(payer);

        await this.program.rpc.initializeConfig(bump, seed, maxSupply, {
            accounts: {
                config: address,
                payer: signerInfo.payer,
                systemProgram: SystemProgram.programId,
            },
            signers: signerInfo.signers,
        });

        // update auction state var
        this.config = {
            bump,
            address,
            seed,
        };

        this.maxSupply = maxSupply;
    };

    addConfig = async (data: string[], payer: PublicKey | Keypair) => {
        this.validateConfig();
        const signerInfo = getSignersFromPayer(payer);

        await this.program.rpc.addUrisToConfig(
            this.auctionFactory.config.bump,
            this.auctionFactory.config.seed,
            this.config.bump,
            this.config.seed,
            data,
            {
                accounts: {
                    auctionFactory: this.auctionFactory.config.address,
                    config: this.config.address,
                    payer: signerInfo.payer,
                    systemProgram: SystemProgram.programId,
                },
                signers: signerInfo.signers,
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
            !isBlank(this.auctionFactory.config.seed)
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
            !isBlank(this.config.seed)
        );
    };
}
