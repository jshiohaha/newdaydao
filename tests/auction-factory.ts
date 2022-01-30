import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import * as lodash from "lodash";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import * as assert from "assert";

import { PdaConfig } from "./types";
import {
    generateMintAccounts,
    generateConfigs,
    getAccountBalance,
    getAuctionAccountData,
    generateSupplyResourceAccounts,
    logSupplyResourceData,
    getAuctionData,
    waitForAuctionToEnd,
    getAnchorEnv,
    uuidFromPubkey,
} from "./helpers";
import {
    getAuctionFactoryAccountAddress,
    getAuctionAccountAddress,
    getConfigAddress,
    getTokenMintAccount,
    getMetadata,
} from "./account";
import { expectThrowsAsync } from "./utils";
import { TOKEN_METADATA_PROGRAM_ID } from "./constants";
import { AuctionFactory as AuctionFactoryProgram } from "../target/types/auction_factory";
import {
    createAssociatedTokenAccountIxns,
    generateMintIxns,
    buildCreateAuctionIxn,
} from "./ixn";

const provider = anchor.Provider.env();
anchor.setProvider(provider);

const program = anchor.workspace
    .AuctionFactory as Program<AuctionFactoryProgram>;

const network = getAnchorEnv();

const walletPath = "";
const myWallet = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(require("fs").readFileSync(walletPath, "utf8")))
);

describe("execute basic auction factory functions", async () => {
    // warn: if this treasury has not been initialized, the settle auction test will fail
    // due to 0 lamport balance
    const treasury = Keypair.generate();
    const updatedTreasury = Keypair.generate();
    const bidder = Keypair.generate();

    const uuid = uuidFromPubkey(Keypair.generate().publicKey);
    console.log("auction factory uuid: ", uuid);
    const [auctionFactoryAddress, auctionFactoryBump] =
        await getAuctionFactoryAccountAddress(uuid);
    const auctionFactory: PdaConfig = {
        address: auctionFactoryAddress,
        bump: auctionFactoryBump,
    };

    const [configAccountAddress, configBump] = await getConfigAddress();
    const uriConfig: PdaConfig = {
        address: configAccountAddress,
        bump: configBump,
    };

    const MAX_CONFIG_VEC_SIZE = 100;
    const MAX_URI_LENGTH = 75;
    const durationInSeconds = 10;
    const timeBufferInSeconds = 2;
    const minBidPercentageIncrease = 1;
    const minReservePrice = 0;

    it("initialize config", async () => {
        await program.rpc.initializeConfig(configBump, MAX_CONFIG_VEC_SIZE, {
            accounts: {
                config: uriConfig.address,
                payer: myWallet.publicKey,
                systemProgram: SystemProgram.programId,
            },
            signers: [myWallet],
        });

        const configAccount = await program.account.config.fetch(
            uriConfig.address
        );

        assert.ok(configAccount.maxSupply === MAX_CONFIG_VEC_SIZE);
        assert.ok(configAccount.updateIdx === 0);
        assert.ok((configAccount.buffer as string[]).length === 0);
    });

    it("attempt to initialize auction factory with invalid uuid", async () => {
        expectThrowsAsync(async () => {
            await program.rpc.initializeAuctionFactory(
                auctionFactory.bump,
                "INVALID", // bad length
                configBump,
                {
                    duration: new anchor.BN(durationInSeconds),
                    timeBuffer: new anchor.BN(timeBufferInSeconds), // currently unused
                    minBidPercentageIncrease: new anchor.BN(
                        minBidPercentageIncrease
                    ), // percentage points
                    minReservePrice: new anchor.BN(minReservePrice),
                },
                {
                    accounts: {
                        auctionFactory: auctionFactory.address,
                        config: uriConfig.address,
                        payer: myWallet.publicKey,
                        treasury: treasury.publicKey,
                        systemProgram: SystemProgram.programId,
                    },
                    signers: [myWallet],
                }
            );
        });
    });

    it("initialize auction factory", async () => {
        await program.rpc.initializeAuctionFactory(
            auctionFactory.bump,
            uuid,
            configBump,
            {
                duration: new anchor.BN(durationInSeconds),
                timeBuffer: new anchor.BN(timeBufferInSeconds), // currently unused
                minBidPercentageIncrease: new anchor.BN(
                    minBidPercentageIncrease
                ), // percentage points
                minReservePrice: new anchor.BN(minReservePrice),
            },
            {
                accounts: {
                    auctionFactory: auctionFactory.address,
                    config: uriConfig.address,
                    payer: myWallet.publicKey,
                    treasury: treasury.publicKey,
                    systemProgram: SystemProgram.programId,
                },
                // anchor account macro prevents from using a treasury that does not have any lamports,
                // aka has not been created yet?
                instructions: [
                    SystemProgram.createAccount({
                        fromPubkey: myWallet.publicKey,
                        newAccountPubkey: treasury.publicKey,
                        space: 5,
                        lamports:
                            await provider.connection.getMinimumBalanceForRentExemption(
                                5
                            ),
                        programId: TOKEN_PROGRAM_ID,
                    }),
                ],
                signers: [myWallet, treasury],
            }
        );
    });

    it("attempt to create first auction while auction factory is inactive", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 0);
        const auctionsData = await getAuctionAccountData(
            program,
            auctionFactory
        );
        const auction = getAuctionData(auctionsData);

        expectThrowsAsync(async () => {
            await program.rpc.createFirstAuction(
                auctionFactory.bump,
                uuid,
                auction.bump,
                auctionFactoryAccount.sequence,
                {
                    accounts: {
                        auctionFactory: auctionFactory.address,
                        payer: myWallet.publicKey,
                        auction: auction.address,
                        systemProgram: SystemProgram.programId,
                    },
                    signers: [myWallet],
                }
            );
        });

        auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 0);
    });

    it("activate auction factory", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );

        await program.rpc.toggleAuctionFactoryStatus(
            auctionFactory.bump,
            uuid,
            {
                accounts: {
                    payer: myWallet.publicKey,
                    auctionFactory: auctionFactory.address,
                },
                signers: [myWallet],
            }
        );

        auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );
        assert.ok(auctionFactoryAccount.isActive === true);
    });

    it("non-authority attempts to modify auction factory", async () => {
        const fake_authority = Keypair.generate();

        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );

        const status_before_program_invocation = auctionFactoryAccount.isActive;

        expectThrowsAsync(async () => {
            await program.rpc.toggleAuctionFactoryStatus(
                auctionFactory.bump,
                uuid,
                {
                    accounts: {
                        payer: fake_authority.publicKey,
                        auctionFactory: auctionFactory.address,
                    },
                    signers: [fake_authority],
                }
            );
        });

        auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );

        // verify status did not change
        assert.ok(
            status_before_program_invocation === auctionFactoryAccount.isActive
        );
    });

    it("modify auction factory data", async () => {
        const updatedMinReservePrice = 1;
        const updatedMinBidPercentageIncrease = 2;

        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );

        await program.rpc.modifyAuctionFactoryData(
            auctionFactory.bump,
            uuid,
            {
                duration: new anchor.BN(auctionFactoryAccount.data.duration),
                timeBuffer: new anchor.BN(
                    auctionFactoryAccount.data.timeBuffer
                ),
                minBidPercentageIncrease: new anchor.BN(
                    updatedMinBidPercentageIncrease
                ),
                minReservePrice: new anchor.BN(updatedMinReservePrice),
            },
            {
                accounts: {
                    payer: myWallet.publicKey,
                    auctionFactory: auctionFactory.address,
                },
                signers: [myWallet],
            }
        );

        auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );

        assert.ok(
            auctionFactoryAccount.data.minReservePrice.toNumber() ===
                updatedMinReservePrice
        );
        assert.ok(
            auctionFactoryAccount.data.minBidPercentageIncrease.toNumber() ===
                updatedMinBidPercentageIncrease
        );
    });

    it("update auction factory treasury", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );

        await program.rpc.updateTreasury(auctionFactory.bump, uuid, {
            accounts: {
                payer: myWallet.publicKey,
                auctionFactory: auctionFactory.address,
                treasury: updatedTreasury.publicKey,
            },
            // ensure treasury account is initialized
            instructions: [
                SystemProgram.createAccount({
                    fromPubkey: myWallet.publicKey,
                    newAccountPubkey: updatedTreasury.publicKey,
                    space: 5,
                    lamports:
                        await provider.connection.getMinimumBalanceForRentExemption(
                            5
                        ),
                    programId: TOKEN_PROGRAM_ID,
                }),
            ],
            // we only provide treasury sig to create account. in "real" client side call,
            // user should only provide treasury that has been established.
            signers: [myWallet, updatedTreasury],
        });

        auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );

        assert.ok(
            auctionFactoryAccount.treasury.toString() ===
                updatedTreasury.publicKey.toString()
        );
    });

    it("attempt to initialize auction without any config", async () => {
        const payer = myWallet.publicKey;
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );

        const auctionsData = await getAuctionAccountData(
            program,
            auctionFactory
        );
        const auction = getAuctionData(auctionsData);
        const mintAccounts = await generateMintAccounts(auction.address);

        expectThrowsAsync(async () => {
            await program.rpc.supplyResourceToAuction(
                auctionFactory.bump,
                uuid,
                auction.bump,
                uriConfig.bump,
                auctionFactoryAccount.sequence,
                {
                    accounts: await generateSupplyResourceAccounts(
                        payer,
                        uriConfig.address,
                        auctionFactory.address,
                        auction.address,
                        mintAccounts
                    ),
                    // ixns to invoke before the supply resource to auction ix.
                    // we should use preInstructions, but this project's current version of anchor
                    // does not use it. so, using instructions for now.
                    // source: https://github.com/project-serum/anchor/blob/5e8d335599f39357a2d1b6a1f4702275eecfc68b/ts/src/program/context.ts#L30-L41
                    instructions: [
                        await buildCreateAuctionIxn(
                            program,
                            myWallet,
                            auctionFactory,
                            uuid,
                            auctionsData
                        ),
                        ...(await generateMintIxns(
                            program,
                            payer,
                            mintAccounts.mint.publicKey,
                            mintAccounts.tokenAccount,
                            auction.address,
                            auctionFactory.address,
                            auctionFactory.bump,
                            uuid,
                            auctionFactoryAccount.sequence.toNumber(),
                            auction.address,
                            auction.bump
                        )),
                    ],
                    signers: [mintAccounts.mint],
                }
            );
        });
    });

    it("attempt to add config data exceeding max element length", async () => {
        const new_uris_for_empty_config = generateConfigs(
            1,
            MAX_URI_LENGTH + 1
        );

        expectThrowsAsync(async () => {
            await program.rpc.addUrisToConfig(
                auctionFactory.bump,
                uuid,
                configBump,
                new_uris_for_empty_config,
                {
                    accounts: {
                        auctionFactory: auctionFactory.address,
                        config: uriConfig.address,
                        payer: myWallet.publicKey,
                        systemProgram: SystemProgram.programId,
                    },
                    signers: [myWallet],
                }
            );
        });
    });

    it("fill up half of config", async () => {
        const new_uris_for_empty_config = generateConfigs(
            Math.round(MAX_CONFIG_VEC_SIZE / 2)
        );

        await program.rpc.addUrisToConfig(
            auctionFactory.bump,
            uuid,
            configBump,
            new_uris_for_empty_config,
            {
                accounts: {
                    auctionFactory: auctionFactory.address,
                    config: uriConfig.address,
                    payer: myWallet.publicKey,
                    systemProgram: SystemProgram.programId,
                },
                signers: [myWallet],
            }
        );

        const configAccount = await program.account.config.fetch(
            uriConfig.address
        );

        assert.ok(configAccount.updateIdx === new_uris_for_empty_config.length);
        assert.ok(
            (configAccount.buffer as string[]).length ===
                new_uris_for_empty_config.length
        );
    });

    // TODO: double check creation of auctions & sequence values
    it("initialize first auction & supply resource for auction", async () => {
        const payer = myWallet.publicKey;
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );

        const auctionsData = await getAuctionAccountData(
            program,
            auctionFactory
        );
        const auction = getAuctionData(auctionsData);
        const mintAccounts = await generateMintAccounts(auction.address);

        await logSupplyResourceData(
            program,
            auction.address,
            auctionFactory.address,
            mintAccounts
        );

        await program.rpc.supplyResourceToAuction(
            auctionFactory.bump,
            uuid,
            auction.bump,
            uriConfig.bump,
            auctionFactoryAccount.sequence,
            {
                accounts: await generateSupplyResourceAccounts(
                    payer,
                    uriConfig.address,
                    auctionFactory.address,
                    auction.address,
                    mintAccounts
                ),
                // ixns to invoke before the supply resource to auction ix.
                // we should use preInstructions, but this project's current version of anchor
                // does not use it. so, using instructions for now.
                // source: https://github.com/project-serum/anchor/blob/5e8d335599f39357a2d1b6a1f4702275eecfc68b/ts/src/program/context.ts#L30-L41
                instructions: [
                    await buildCreateAuctionIxn(
                        program,
                        myWallet,
                        auctionFactory,
                        uuid,
                        auctionsData
                    ),
                    ...(await generateMintIxns(
                        program,
                        payer,
                        mintAccounts.mint.publicKey,
                        mintAccounts.tokenAccount,
                        auction.address,
                        auctionFactory.address,
                        auctionFactory.bump,
                        uuid,
                        auctionFactoryAccount.sequence.toNumber(),
                        auction.address,
                        auction.bump
                    )),
                ],
                signers: [mintAccounts.mint],
            }
        );

        const auctionAccount = await program.account.auction.fetch(
            auction.address
        );

        assert.ok(auctionAccount.resource !== null);
        assert.ok(
            auctionAccount.resource.toString() ===
                mintAccounts.mint.publicKey.toString()
        );

        // verify auction token account actually has a token in it
        const auctionTokenAmount =
            await program.provider.connection.getTokenAccountBalance(
                mintAccounts.tokenAccount
            );
        assert.ok(+auctionTokenAmount["value"]["amount"] === 1);

        const configAccount = await program.account.config.fetch(
            uriConfig.address
        );
        console.log("config buffer: ", configAccount.buffer as string[]);
    });

    it("attempt to initialize first auction again, and fail 😈", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);

        const initialSequence = 0;
        const [auctionAddress, auctionBump] = await getAuctionAccountAddress(
            initialSequence,
            auctionFactory.address
        );

        expectThrowsAsync(async () => {
            await program.rpc.createFirstAuction(
                auctionFactory.bump,
                uuid,
                auctionBump,
                new anchor.BN(initialSequence),
                {
                    accounts: {
                        payer: myWallet.publicKey,
                        auctionFactory: auctionFactory.address,
                        auction: auctionAddress,
                        systemProgram: SystemProgram.programId,
                    },
                    signers: [myWallet],
                }
            );
        });

        auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);
    });

    it("attempt to supply resource for auction again, and fail 😈", async () => {
        const payer = myWallet.publicKey;
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );

        const auctionsData = await getAuctionAccountData(
            program,
            auctionFactory
        );
        const auction = getAuctionData(auctionsData);
        const mintAccounts = await generateMintAccounts(auction.address);

        expectThrowsAsync(async () => {
            await program.rpc.supplyResourceToAuction(
                auctionFactory.bump,
                uuid,
                auction.bump,
                uriConfig.bump,
                auctionFactoryAccount.sequence,
                {
                    accounts: await generateSupplyResourceAccounts(
                        payer,
                        uriConfig.address,
                        auctionFactory.address,
                        auction.address,
                        mintAccounts
                    ),
                    // ixns to invoke before the supply resource to auction ix.
                    // we should use preInstructions, but this project's current version of anchor
                    // does not use it. so, using instructions for now.
                    // source: https://github.com/project-serum/anchor/blob/5e8d335599f39357a2d1b6a1f4702275eecfc68b/ts/src/program/context.ts#L30-L41
                    instructions: [
                        ...(await generateMintIxns(
                            program,
                            payer,
                            mintAccounts.mint.publicKey,
                            mintAccounts.tokenAccount,
                            auction.address,
                            auctionFactory.address,
                            auctionFactory.bump,
                            uuid,
                            auctionFactoryAccount.sequence.toNumber(),
                            auction.address,
                            auction.bump
                        )),
                    ],
                    signers: [mintAccounts.mint],
                }
            );
        });
    });

    it("attempt to create a new auction during an active auction, and fail 😈", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);

        const auctionsData = await getAuctionAccountData(
            program,
            auctionFactory
        );
        const currentAuctionAccount = await program.account.auction.fetch(
            auctionsData.currentAuction
        );

        expectThrowsAsync(async () => {
            await program.rpc.createNextAuction(
                auctionFactory.bump,
                uuid,
                auctionsData.currentAuctionBump,
                auctionsData.nextAuctionBump,
                currentAuctionAccount.sequence,
                new anchor.BN(currentAuctionAccount.sequence.toNumber() + 1),
                {
                    accounts: {
                        payer: myWallet.publicKey,
                        auctionFactory: auctionFactory.address,
                        currentAuction: auctionsData.currentAuction,
                        nextAuction: auctionsData.nextAuction,
                        systemProgram: SystemProgram.programId,
                    },
                    signers: [myWallet],
                }
            );
        });

        auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);
    });

    it("add n + 1 data to config", async () => {
        let configAccount = await program.account.config.fetch(
            uriConfig.address
        );

        const num_config_data_to_add =
            configAccount.maxSupply -
            (configAccount.buffer as string[]).length +
            1;
        const new_uris_for_empty_config = generateConfigs(
            num_config_data_to_add
        );

        await program.rpc.addUrisToConfig(
            auctionFactory.bump,
            uuid,
            configBump,
            new_uris_for_empty_config,
            {
                accounts: {
                    auctionFactory: auctionFactory.address,
                    config: uriConfig.address,
                    payer: myWallet.publicKey,
                    systemProgram: SystemProgram.programId,
                },
                signers: [myWallet],
            }
        );

        configAccount = await program.account.config.fetch(uriConfig.address);

        const configUris = configAccount.buffer as string[];
        assert.ok(configUris.length === configAccount.maxSupply);
        assert.ok(configAccount.updateIdx === 1);
        // verify config wrapped
        assert.ok(
            configUris[0] ===
                new_uris_for_empty_config[new_uris_for_empty_config.length - 1]
        );
    });

    it("attempt to add data to config, no config change", async () => {
        let configAccount = await program.account.config.fetch(
            uriConfig.address
        );
        const configUrisBeforeCall = configAccount.buffer as string[];
        const updatedIdxBeforeCall = configAccount.updateIdx;

        await program.rpc.addUrisToConfig(
            auctionFactory.bump,
            uuid,
            configBump,
            generateConfigs(10),
            {
                accounts: {
                    auctionFactory: auctionFactory.address,
                    config: uriConfig.address,
                    payer: myWallet.publicKey,
                    systemProgram: SystemProgram.programId,
                },
                signers: [myWallet],
            }
        );

        configAccount = await program.account.config.fetch(uriConfig.address);
        const configUrisAfterCall = configAccount.buffer as string[];
        const updatedIdxAfterCall = configAccount.updateIdx;

        assert.ok(updatedIdxBeforeCall === updatedIdxAfterCall);
        assert.ok(lodash.isEqual(configUrisBeforeCall, configUrisAfterCall));
    });

    it("spin until auction can be settled", async () => {
        const auctionsData = await getAuctionAccountData(
            program,
            auctionFactory
        );

        await waitForAuctionToEnd(program, auctionsData.currentAuction);
    });

    it("settle auction with no bids", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );
        const treasuryBalanceBefore = await getAccountBalance(
            program,
            auctionFactoryAccount.treasury
        );
        const auctionsData = await getAuctionAccountData(
            program,
            auctionFactory
        );
        let auctionAccount = await program.account.auction.fetch(
            auctionsData.currentAuction
        );
        const mintKey = new PublicKey(auctionAccount.resource.toString());
        const [bidderTokenAccount, bidderTokenAccountBump] =
            await getTokenMintAccount(auctionAccount.bidder, mintKey);
        const metadata = await getMetadata(mintKey);
        const [auctionTokenAccount, _auctionTokenAccountBump] =
            await getTokenMintAccount(auctionsData.currentAuction, mintKey);

        await program.rpc.settleAuction(
            bidderTokenAccountBump,
            auctionFactory.bump,
            uuid,
            auctionsData.currentAuctionBump,
            auctionAccount.sequence,
            {
                accounts: {
                    payer: myWallet.publicKey,
                    treasury: auctionFactoryAccount.treasury,
                    metadata,
                    auctionFactory: auctionFactory.address,
                    auction: auctionsData.currentAuction,
                    mint: mintKey,
                    tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    bidderTokenAccount: bidderTokenAccount,
                    auctionTokenAccount,
                },
                signers: [myWallet],
            }
        );

        auctionAccount = await program.account.auction.fetch(
            auctionsData.currentAuction
        );

        assert.ok(auctionAccount.settled === true);
        assert.ok(
            auctionAccount.finalizedEndTime !== undefined &&
                auctionAccount.finalizedEndTime.toNumber() !== 0
        );

        // verify treasury balance has not changed
        const treasuryBalanceAfter = await getAccountBalance(
            program,
            auctionFactoryAccount.treasury
        );
        assert.ok(treasuryBalanceAfter === treasuryBalanceBefore);

        const auctionTokenAmount =
            await program.provider.connection.getTokenAccountBalance(
                auctionTokenAccount
            );
        assert.ok(+auctionTokenAmount["value"]["amount"] === 0);
    });

    it("attempt to settle auction again, and fail", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );
        const auctionsData = await getAuctionAccountData(
            program,
            auctionFactory
        );
        let auctionAccount = await program.account.auction.fetch(
            auctionsData.currentAuction
        );
        const mintKey = new PublicKey(auctionAccount.resource.toString());
        const [bidderTokenAccount, bidderTokenAccountBump] =
            await getTokenMintAccount(auctionAccount.bidder, mintKey);
        const metadata = await getMetadata(mintKey);
        const [auctionTokenAccount, _auctionTokenAccountBump] =
            await getTokenMintAccount(auctionsData.currentAuction, mintKey);
        expectThrowsAsync(async () => {
            await program.rpc.settleAuction(
                bidderTokenAccountBump,
                auctionFactory.bump,
                uuid,
                auctionsData.currentAuctionBump,
                auctionAccount.sequence,
                {
                    accounts: {
                        payer: myWallet.publicKey,
                        treasury: auctionFactoryAccount.treasury,
                        metadata,
                        auctionFactory: auctionFactory.address,
                        auction: auctionsData.currentAuction,
                        mint: mintKey,
                        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                        bidderTokenAccount: bidderTokenAccount,
                        auctionTokenAccount,
                    },
                    // do not recreate token account because it should already exist
                    signers: [myWallet],
                }
            );
        });
    });

    it("close first auction's token account after token removed", async () => {
        const firstAcutionSequence = 0;
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );
        const treasuryBalanceBefore = await getAccountBalance(
            program,
            auctionFactoryAccount.treasury
        );
        const [auctionAddress, auctionBump] = await getAuctionAccountAddress(
            firstAcutionSequence,
            auctionFactory.address
        );
        let auctionAccount = await program.account.auction.fetch(
            auctionAddress
        );
        const mintKey = new PublicKey(auctionAccount.resource);

        const [auctionTokenAccount, _auctionTokenAccountBump] =
            await getTokenMintAccount(auctionAddress, mintKey);

        await program.rpc.closeAuctionTokenAccount(
            auctionFactory.bump,
            uuid,
            auctionBump,
            new anchor.BN(firstAcutionSequence),
            {
                accounts: {
                    payer: myWallet.publicKey,
                    treasury: auctionFactoryAccount.treasury,
                    auctionFactory: auctionFactory.address,
                    auction: auctionAddress,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    auctionTokenAccount,
                },
                signers: [myWallet],
            }
        );

        auctionAccount = await program.account.auction.fetch(auctionAddress);

        // verify treasury balance has not changed
        const treasuryBalanceAfter = await getAccountBalance(
            program,
            auctionFactoryAccount.treasury
        );
        assert.ok(treasuryBalanceAfter > treasuryBalanceBefore);
        let tokenAccountClosed = false;
        try {
            await program.provider.connection.getTokenAccountBalance(
                auctionTokenAccount
            );
        } catch (e: any) {
            tokenAccountClosed = lodash.includes(
                e.message,
                "could not find account"
            );
        }
        assert.ok(tokenAccountClosed === true);
    });

    it("first auction is over. create a new auction.", async () => {
        const payer = myWallet.publicKey;
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);

        const auctionsData = await getAuctionAccountData(
            program,
            auctionFactory
        );
        const auction = getAuctionData(auctionsData);
        const mintAccounts = await generateMintAccounts(auction.address);

        await logSupplyResourceData(
            program,
            auction.address,
            auctionFactory.address,
            mintAccounts
        );

        await program.rpc.supplyResourceToAuction(
            auctionFactory.bump,
            uuid,
            auction.bump,
            uriConfig.bump,
            auctionFactoryAccount.sequence,
            {
                accounts: await generateSupplyResourceAccounts(
                    payer,
                    uriConfig.address,
                    auctionFactory.address,
                    auction.address,
                    mintAccounts
                ),
                // ixns to invoke before the supply resource to auction ix.
                // we should use preInstructions, but this project's current version of anchor
                // does not use it. so, using instructions for now.
                // source: https://github.com/project-serum/anchor/blob/5e8d335599f39357a2d1b6a1f4702275eecfc68b/ts/src/program/context.ts#L30-L41
                instructions: [
                    await buildCreateAuctionIxn(
                        program,
                        myWallet,
                        auctionFactory,
                        uuid,
                        auctionsData
                    ),
                    ...(await generateMintIxns(
                        program,
                        payer,
                        mintAccounts.mint.publicKey,
                        mintAccounts.tokenAccount,
                        auction.address,
                        auctionFactory.address,
                        auctionFactory.bump,
                        uuid,
                        auctionFactoryAccount.sequence.toNumber(),
                        auction.address,
                        auction.bump
                    )),
                ],
                signers: [mintAccounts.mint],
            }
        );

        auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 2);

        const auctionAccount = await program.account.auction.fetch(
            auction.address
        );

        assert.ok(auctionAccount.sequence.toNumber() === 1);
        assert.ok(auctionAccount.amount.toNumber() === 0);
        assert.ok(auctionAccount.resource !== null);
        assert.ok(
            auctionAccount.resource.toString() ===
                mintAccounts.mint.publicKey.toString()
        );

        // verify auction token account actually has a token in it
        const auctionTokenAmount =
            await program.provider.connection.getTokenAccountBalance(
                mintAccounts.tokenAccount
            );
        assert.ok(+auctionTokenAmount["value"]["amount"] === 1);
    });

    it("place a valid bid", async () => {
        const auctionsData = await getAuctionAccountData(
            program,
            auctionFactory
        );
        let auctionAccount = await program.account.auction.fetch(
            auctionsData.currentAuction
        );
        const auctionBalanceBefore = await getAccountBalance(
            program,
            auctionsData.currentAuction
        );
        const bidAmountInLamports = 100;

        await program.rpc.placeBid(
            auctionFactory.bump,
            uuid,
            auctionsData.currentAuctionBump,
            auctionAccount.sequence,
            new anchor.BN(bidAmountInLamports),
            {
                accounts: {
                    bidder: bidder.publicKey,
                    leadingBidder: myWallet.publicKey,
                    auctionFactory: auctionFactory.address,
                    auction: auctionsData.currentAuction,
                    systemProgram: SystemProgram.programId,
                },
                instructions: [
                    SystemProgram.transfer({
                        fromPubkey: myWallet.publicKey,
                        toPubkey: bidder.publicKey,
                        lamports: bidAmountInLamports * 1.5,
                    }),
                ],
                signers: [bidder],
            }
        );

        const auctionBalanceAfter = await getAccountBalance(
            program,
            auctionsData.currentAuction
        );
        assert.ok(auctionBalanceAfter > auctionBalanceBefore);

        auctionAccount = await program.account.auction.fetch(
            auctionsData.currentAuction
        );
        const bids = auctionAccount.bids as any[];
        assert.ok(bids.length === 1);
        const winning_bid = bids[0];
        assert.ok(winning_bid.amount.toNumber() === bidAmountInLamports);
        assert.ok(
            winning_bid.bidder.toString() === bidder.publicKey.toString()
        );
    });

    it("current winning bidder attempts to place another bid, but fails since bidder is already winning", async () => {
        const auctionsData = await getAuctionAccountData(
            program,
            auctionFactory
        );
        let auctionAccount = await program.account.auction.fetch(
            auctionsData.currentAuction
        );

        const bidAmountInLamports = 105;

        expectThrowsAsync(async () => {
            await program.rpc.placeBid(
                auctionFactory.bump,
                uuid,
                auctionsData.currentAuctionBump,
                auctionAccount.sequence,
                new anchor.BN(bidAmountInLamports),
                {
                    accounts: {
                        bidder: bidder.publicKey,
                        leadingBidder: auctionAccount.bidder,
                        auctionFactory: auctionFactory.address,
                        auction: auctionsData.currentAuction,
                        systemProgram: SystemProgram.programId,
                    },
                    signers: [bidder],
                }
            );
        });

        auctionAccount = await program.account.auction.fetch(
            auctionsData.currentAuction
        );
        const bids = auctionAccount.bids as any[];
        // bid wasn't added to list of bids
        assert.ok(bids.length === 1);
    });

    it("place another valid bid", async () => {
        const auctionsData = await getAuctionAccountData(
            program,
            auctionFactory
        );
        let auctionAccount = await program.account.auction.fetch(
            auctionsData.currentAuction
        );

        const auctionBalanceBefore = await getAccountBalance(
            program,
            auctionsData.currentAuction
        );

        const leadingBidAmount = auctionAccount.amount.toNumber();

        const bidAmountInLamports = 102;

        await program.rpc.placeBid(
            auctionFactory.bump,
            uuid,
            auctionsData.currentAuctionBump,
            auctionAccount.sequence,
            new anchor.BN(bidAmountInLamports),
            {
                accounts: {
                    bidder: myWallet.publicKey,
                    leadingBidder: auctionAccount.bidder,
                    auctionFactory: auctionFactory.address,
                    auction: auctionsData.currentAuction,
                    systemProgram: SystemProgram.programId,
                },
                signers: [myWallet],
            }
        );

        const auctionBalanceAfter = await getAccountBalance(
            program,
            auctionsData.currentAuction
        );

        assert.ok(
            auctionBalanceAfter - auctionBalanceBefore ===
                bidAmountInLamports - leadingBidAmount
        );

        auctionAccount = await program.account.auction.fetch(
            auctionsData.currentAuction
        );
        const bids = auctionAccount.bids as any[];
        assert.ok(bids.length === 2);
        const winning_bid = bids[1];
        assert.ok(winning_bid.amount.toNumber() === bidAmountInLamports);
        assert.ok(
            winning_bid.bidder.toString() === myWallet.publicKey.toString()
        );
    });

    // place invalid bid, not big enough % diff
    it("new bidder attempts to place another bid, but fails due to invalid bid amount 😈", async () => {
        const auctionsData = await getAuctionAccountData(
            program,
            auctionFactory
        );
        let auctionAccount = await program.account.auction.fetch(
            auctionsData.currentAuction
        );

        const bidAmountInLamports = 103;

        const new_bidder = Keypair.generate();

        expectThrowsAsync(async () => {
            await program.rpc.placeBid(
                auctionFactory.bump,
                uuid,
                auctionsData.currentAuctionBump,
                auctionAccount.sequence,
                new anchor.BN(bidAmountInLamports),
                {
                    accounts: {
                        bidder: new_bidder.publicKey,
                        leadingBidder: auctionAccount.bidder,
                        auctionFactory: auctionFactory.address,
                        auction: auctionsData.currentAuction,
                        systemProgram: SystemProgram.programId,
                    },
                    instructions: [
                        SystemProgram.transfer({
                            fromPubkey: myWallet.publicKey,
                            toPubkey: new_bidder.publicKey,
                            lamports: bidAmountInLamports * 1.5,
                        }),
                    ],
                    signers: [new_bidder],
                }
            );
        });

        auctionAccount = await program.account.auction.fetch(
            auctionsData.currentAuction
        );
        const bids = auctionAccount.bids as any[];
        // verify bid wasn't aadded
        assert.ok(bids.length === 2);
    });

    it("spin until auction can be settled", async () => {
        const auctionsData = await getAuctionAccountData(
            program,
            auctionFactory
        );

        await waitForAuctionToEnd(program, auctionsData.currentAuction);
    });

    it("attempt to place a valid bid after auction is over", async () => {
        const auctionsData = await getAuctionAccountData(
            program,
            auctionFactory
        );
        let auctionAccount = await program.account.auction.fetch(
            auctionsData.currentAuction
        );

        const winningAmountBeforeBidAttempt = auctionAccount.amount.toNumber();
        const winningBidderBeforeBidAttempt = auctionAccount.bidder.toString();

        const bidAmountInLamports = 110;
        const outOfTimeBidder = Keypair.generate();

        expectThrowsAsync(async () => {
            await program.rpc.placeBid(
                auctionFactory.bump,
                uuid,
                auctionsData.currentAuctionBump,
                auctionAccount.sequence,
                new anchor.BN(bidAmountInLamports),
                {
                    accounts: {
                        bidder: outOfTimeBidder.publicKey,
                        leadingBidder: myWallet.publicKey,
                        auctionFactory: auctionFactory.address,
                        auction: auctionsData.currentAuction,
                        systemProgram: SystemProgram.programId,
                    },
                    instructions: [
                        SystemProgram.transfer({
                            fromPubkey: myWallet.publicKey,
                            toPubkey: outOfTimeBidder.publicKey,
                            lamports: bidAmountInLamports * 1.5,
                        }),
                    ],
                    signers: [outOfTimeBidder],
                }
            );
        });

        auctionAccount = await program.account.auction.fetch(
            auctionsData.currentAuction
        );

        const winningAmountAfterBidAttempt = auctionAccount.amount.toNumber();
        const winningBidderAfterBidAttempt = auctionAccount.bidder.toString();

        assert.ok(
            winningAmountBeforeBidAttempt === winningAmountAfterBidAttempt
        );
        assert.ok(
            winningBidderBeforeBidAttempt === winningBidderAfterBidAttempt
        );
    });

    it("attempt to settle wrong auction", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );

        const auctionsData = await getAuctionAccountData(
            program,
            auctionFactory
        );
        let auctionAccount = await program.account.auction.fetch(
            auctionsData.currentAuction
        );

        const mintKey = new PublicKey(auctionAccount.resource.toString());
        const [bidderTokenAccount, bidderTokenAccountBump] =
            await getTokenMintAccount(auctionAccount.bidder, mintKey);

        const metadata = await getMetadata(mintKey);

        const [auctionTokenAccount, _] = await getTokenMintAccount(
            auctionsData.currentAuction,
            mintKey
        );

        const [auxAddress, auxBump] = await getAuctionAccountAddress(
            3,
            auctionFactory.address
        );

        expectThrowsAsync(async () => {
            await program.rpc.settleAuction(
                bidderTokenAccountBump,
                auctionFactory.bump,
                uuid,
                auxBump,
                new anchor.BN(3),
                {
                    accounts: {
                        payer: myWallet.publicKey,
                        treasury: auctionFactoryAccount.treasury,
                        metadata,
                        auctionFactory: auctionFactory.address,
                        auction: auxAddress,
                        mint: mintKey,
                        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                        bidderTokenAccount: bidderTokenAccount,
                        auctionTokenAccount,
                    },
                    instructions: [
                        createAssociatedTokenAccountIxns(
                            mintKey,
                            bidderTokenAccount,
                            auctionAccount.bidder, // owner
                            myWallet.publicKey // payer
                        ),
                    ],
                    signers: [myWallet],
                }
            );
        });
    });

    it("attempt to settle auction with invalid treasury", async () => {
        const auctionsData = await getAuctionAccountData(
            program,
            auctionFactory
        );
        let auctionAccount = await program.account.auction.fetch(
            auctionsData.currentAuction
        );

        const mintKey = new PublicKey(auctionAccount.resource.toString());
        const [bidderTokenAccount, bidderTokenAccountBump] =
            await getTokenMintAccount(auctionAccount.bidder, mintKey);

        const metadata = await getMetadata(mintKey);

        const [auctionTokenAccount, _] = await getTokenMintAccount(
            auctionsData.currentAuction,
            mintKey
        );

        expectThrowsAsync(async () => {
            await program.rpc.settleAuction(
                bidderTokenAccountBump,
                auctionFactory.bump,
                uuid,
                auctionsData.currentAuctionBump,
                auctionAccount.sequence,
                {
                    accounts: {
                        payer: myWallet.publicKey,
                        treasury: Keypair.generate().publicKey,
                        metadata,
                        auctionFactory: auctionFactory.address,
                        auction: auctionsData.currentAuction,
                        mint: mintKey,
                        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                        bidderTokenAccount: bidderTokenAccount,
                        auctionTokenAccount,
                    },
                    instructions: [
                        createAssociatedTokenAccountIxns(
                            mintKey,
                            bidderTokenAccount,
                            auctionAccount.bidder, // owner
                            myWallet.publicKey // payer
                        ),
                    ],
                    signers: [myWallet],
                }
            );
        });
    });

    it("attempt to settle auction with invalid bidder token account", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );

        const auctionsData = await getAuctionAccountData(
            program,
            auctionFactory
        );
        let auctionAccount = await program.account.auction.fetch(
            auctionsData.currentAuction
        );

        const mintKey = new PublicKey(auctionAccount.resource.toString());

        const fakeAuctionWinner = Keypair.generate();
        const [bidderTokenAccount, bidderTokenAccountBump] =
            await getTokenMintAccount(fakeAuctionWinner.publicKey, mintKey);

        const metadata = await getMetadata(mintKey);

        const [auctionTokenAccount, _] = await getTokenMintAccount(
            auctionsData.currentAuction,
            mintKey
        );

        expectThrowsAsync(async () => {
            await program.rpc.settleAuction(
                bidderTokenAccountBump,
                auctionFactory.bump,
                uuid,
                auctionsData.currentAuctionBump,
                auctionAccount.sequence,
                {
                    accounts: {
                        payer: myWallet.publicKey,
                        treasury: auctionFactoryAccount.treasury,
                        metadata,
                        auctionFactory: auctionFactory.address,
                        auction: auctionsData.currentAuction,
                        mint: mintKey,
                        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                        bidderTokenAccount: bidderTokenAccount,
                        auctionTokenAccount,
                    },
                    instructions: [
                        createAssociatedTokenAccountIxns(
                            mintKey,
                            bidderTokenAccount,
                            fakeAuctionWinner.publicKey, // owner
                            myWallet.publicKey // payer
                        ),
                    ],
                    signers: [myWallet],
                }
            );
        });
    });

    it("settle auction", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactory.address
        );
        const treasuryBalanceBefore = await getAccountBalance(
            program,
            auctionFactoryAccount.treasury
        );

        const auctionsData = await getAuctionAccountData(
            program,
            auctionFactory
        );
        let auctionAccount = await program.account.auction.fetch(
            auctionsData.currentAuction
        );

        const mintKey = new PublicKey(auctionAccount.resource.toString());
        const [bidderTokenAccount, bidderTokenAccountBump] =
            await getTokenMintAccount(auctionAccount.bidder, mintKey);

        const metadata = await getMetadata(mintKey);

        const [auctionTokenAccount, _auctionTokenAccountBump] =
            await getTokenMintAccount(auctionsData.currentAuction, mintKey);

        const settleAuctionPreInstructions =
            auctionAccount.amount.toNumber() > 0
                ? [
                      createAssociatedTokenAccountIxns(
                          mintKey,
                          bidderTokenAccount,
                          auctionAccount.bidder, // owner
                          myWallet.publicKey // payer
                      ),
                  ]
                : [];

        await program.rpc.settleAuction(
            bidderTokenAccountBump,
            auctionFactory.bump,
            uuid,
            auctionsData.currentAuctionBump,
            auctionAccount.sequence,
            {
                accounts: {
                    payer: myWallet.publicKey,
                    treasury: auctionFactoryAccount.treasury,
                    metadata,
                    auctionFactory: auctionFactory.address,
                    auction: auctionsData.currentAuction,
                    mint: mintKey,
                    tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    bidderTokenAccount: bidderTokenAccount,
                    auctionTokenAccount,
                },
                instructions: settleAuctionPreInstructions,
                signers: [myWallet],
            }
        );

        auctionAccount = await program.account.auction.fetch(
            auctionsData.currentAuction
        );

        assert.ok(auctionAccount.settled === true);
        assert.ok(
            auctionAccount.finalizedEndTime !== undefined &&
                auctionAccount.finalizedEndTime.toNumber() !== 0
        );

        // verify treasury balance has not changed
        const treasuryBalanceAfter = await getAccountBalance(
            program,
            auctionFactoryAccount.treasury
        );
        assert.ok(
            treasuryBalanceAfter - treasuryBalanceBefore ===
                auctionAccount.amount.toNumber()
        );

        // verify token accounts have correct balances, aka token is in winner account and not auction account
        const bidderTokenAmount =
            await program.provider.connection.getTokenAccountBalance(
                bidderTokenAccount
            );
        assert.ok(+bidderTokenAmount["value"]["amount"] === 1);

        const auctionTokenAmount =
            await program.provider.connection.getTokenAccountBalance(
                auctionTokenAccount
            );
        assert.ok(+auctionTokenAmount["value"]["amount"] === 0);
    });

    // done with main auction lifecycle 🙂
    // run: `cargo test buffer_tests` to test config buffer util tests
    // run: `cargo test update_vec_tests` to test vec util tests
});

// if (network === Network.Localnet) {
//     describe("create auction factory, max out config", async () => {
//         const treasury = Keypair.generate();
//         const auctionFactoryAuthorityWallet = Keypair.generate();
//         const auctionFactoryAuthority = auctionFactoryAuthorityWallet.publicKey;
//         const [auctionFactoryAddress, auctionFactoryBump] =
//             await getAuctionFactoryAccountAddress(auctionFactoryAuthority);
//         const auctionFactory: PdaConfig = {
//             address: auctionFactoryAddress,
//             bump: auctionFactoryBump
//         };

//         const [configAccountAddress, configBump] = await getConfigAddress();
//         const uriConfig: PdaConfig = {
//             address: configAccountAddress,
//             bump: configBump
//         };

//         const MAX_CONFIG_VEC_SIZE = 100;
//         const durationInSeconds = 0;
//         const timeBufferInSeconds = 0;
//         const minBidPercentageIncrease = 0;
//         const minReservePrice = 0;

//         it("initialize config", async () => {
//             await program.rpc.initializeConfig(configBump, MAX_CONFIG_VEC_SIZE, {
//                 accounts: {
//                     config: uriConfig.address,
//                     payer: auctionFactoryAuthority,
//                     systemProgram: SystemProgram.programId,
//                 },
//                 // note: on local net, transfer SOL every test. otherwise, tests will fail.
//                 instructions: [
//                     SystemProgram.transfer({
//                         fromPubkey: myWallet.publicKey,
//                         toPubkey: auctionFactoryAuthority,
//                         lamports: 1 * LAMPORTS_PER_SOL,
//                     }),
//                 ],
//                 signers: [auctionFactoryAuthorityWallet],
//             });

//             const configAccount = await program.account.config.fetch(
//                 uriConfig.address
//             );

//             assert.ok(configAccount.maxSupply === MAX_CONFIG_VEC_SIZE);
//             assert.ok(configAccount.updateIdx === 0);
//             assert.ok((configAccount.buffer as string[]).length === 0);
//         });

//         it("initialize auction factory", async () => {
//             await program.rpc.initializeAuctionFactory(
//                 auctionFactory.bump,
//                 configBump,
//                 {
//                     duration: new anchor.BN(durationInSeconds),
//                     timeBuffer: new anchor.BN(timeBufferInSeconds), // currently unused
//                     minBidPercentageIncrease: new anchor.BN(
//                         minBidPercentageIncrease
//                     ), // percentage points
//                     minReservePrice: new anchor.BN(minReservePrice),
//                 },
//                 {
//                     accounts: {
//                         auctionFactory: auctionFactory.address,
//                         config: uriConfig.address,
//                         payer: auctionFactoryAuthority,
//                         treasury: treasury.publicKey,
//                         systemProgram: SystemProgram.programId,
//                     },
//                     instructions: [
//                         SystemProgram.transfer({
//                             fromPubkey: myWallet.publicKey,
//                             toPubkey: auctionFactoryAuthority,
//                             lamports: 1 * LAMPORTS_PER_SOL,
//                         }),
//                     ],
//                     signers: [auctionFactoryAuthorityWallet],
//                 }
//             );
//         });

//         it("max out config, insert 10 items at a time", async () => {
//             let totalConfigSize = 0;
//             const numConfigsToAddPerCall = 10;
//             while (totalConfigSize <= MAX_CONFIG_VEC_SIZE) {
//                 console.log('config size: ',  totalConfigSize);
//                 const new_uris_for_empty_config = generateConfigs(
//                     numConfigsToAddPerCall,
//                     75
//                 );
//                 totalConfigSize += numConfigsToAddPerCall;
//                 await program.rpc.addUrisToConfig(
//                     auctionFactory.bump,
//                     configBump,
//                     new_uris_for_empty_config,
//                     {
//                         accounts: {
//                             auctionFactory: auctionFactory.address,
//                             config: uriConfig.address,
//                             payer: auctionFactoryAuthority,
//                             systemProgram: SystemProgram.programId,
//                         },
//                         instructions: [
//                             SystemProgram.transfer({
//                                 fromPubkey: myWallet.publicKey,
//                                 toPubkey: auctionFactoryAuthority,
//                                 lamports: 1 * LAMPORTS_PER_SOL,
//                             }),
//                         ],
//                         signers: [auctionFactoryAuthorityWallet],
//                     }
//                 );
//             }

//             const configAccount = await program.account.config.fetch(
//                 uriConfig.address
//             );

//             assert.ok((configAccount.buffer as string[]).length === MAX_CONFIG_VEC_SIZE);
//         });
//     });
// }
