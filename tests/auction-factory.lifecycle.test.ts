import * as anchor from "@project-serum/anchor";
import * as lodash from "lodash";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
    PublicKey,
    SystemProgram,
    Keypair,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as assert from "assert";

import { AuctionFactoryTestClient } from "./shared/driver.test";

import { TOKEN_METADATA_PROGRAM_ID } from "./shared/constants";
import {
    generateConfigs,
    logSupplyResourceData,
    waitForAuctionToEnd,
} from "./shared/helpers";
import { expectThrowsAsync } from "./shared/utils";
import { BN_ZERO } from "../app/node_modules/@auction-factory/sdk/src";
import { BN_ONE } from "../app/node_modules/@auction-factory/sdk/src";
import { BN } from "@project-serum/anchor";

// due to complex auction lifecylce, prefer consecutive tests over fully independent tests.
// the former could be more difficult to update/debut but the latter will take much longer.
describe("execute basic auction factory functions", async () => {
    const client = new AuctionFactoryTestClient();

    const MAX_CONFIG_VEC_SIZE = 10; // 100;
    const MAX_URI_LENGTH = 75;
    const durationInSeconds = 5;
    const timeBufferInSeconds = 2;
    const minBidPercentageIncrease = 1;
    const minReservePrice = 0;

    it("initialize config", async () => {
        await client.initConfig(MAX_CONFIG_VEC_SIZE);

        const configDetails = client.getConfigDetails();
        const configAccount = await client.fetchConfig(configDetails.address);

        assert.ok(configAccount.maxSupply === MAX_CONFIG_VEC_SIZE);
        assert.ok(configAccount.updateIdx === 0);
        assert.ok((configAccount.buffer as string[]).length === 0);
    });

    it("attempt to initialize auction factory with seed of invalid len", async () => {
        expectThrowsAsync(async () => {
            await client.initializeAuctionFactory(
                durationInSeconds,
                timeBufferInSeconds,
                minBidPercentageIncrease,
                minReservePrice,
                "INVALID"
            );
        }, "Uuid must be length 5");
    });

    it("initialize and activate auction factory", async () => {
        await client.initializeAuctionFactory(
            durationInSeconds,
            timeBufferInSeconds,
            minBidPercentageIncrease,
            minReservePrice
        );

        let auctionFactoryAccount = await client.getAuctionFactory();
        assert.ok(!auctionFactoryAccount.isActive);

        await client.toggleAuctionFactoryStatus();

        auctionFactoryAccount = await client.getAuctionFactory();
        assert.ok(auctionFactoryAccount.isActive);
    });

    it("non-authority attempts to modify auction factory", async () => {
        const fakeAuthority = await client.nodeWallet.createFundedWallet(
            0.1 * LAMPORTS_PER_SOL
        );

        let auctionFactoryAccount = await client.getAuctionFactory();
        const reservePriceBeforeUpdate =
            auctionFactoryAccount.data.minReservePrice.toNumber();

        const updatedMinReservePrice: number = 10;
        expectThrowsAsync(async () => {
            await client.modifyAuctionFactory(
                auctionFactoryAccount.data.duration.toNumber(),
                auctionFactoryAccount.data.timeBuffer.toNumber(),
                auctionFactoryAccount.data.minBidPercentageIncrease.toNumber(),
                updatedMinReservePrice,
                fakeAuthority
            );
        });
        auctionFactoryAccount = await client.getAuctionFactory();
        const reservePriceAfterUpdate =
            auctionFactoryAccount.data.minReservePrice.toNumber();

        // verify reserve price did not change
        assert.ok(reservePriceBeforeUpdate === reservePriceAfterUpdate);
    });

    it("modify auction factory data", async () => {
        let auctionFactoryAccount = await client.getAuctionFactory();
        const updatedMinReservePrice = 1;
        const updatedMinBidPercentageIncrease = 2;
        await client.modifyAuctionFactory(
            auctionFactoryAccount.data.duration.toNumber(),
            auctionFactoryAccount.data.timeBuffer.toNumber(),
            updatedMinBidPercentageIncrease,
            updatedMinReservePrice
        );

        auctionFactoryAccount = await client.getAuctionFactory();
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
        const updatedTreasury = await client.nodeWallet.createFundedWallet(
            0.1 * LAMPORTS_PER_SOL
        );
        let auctionFactoryAccount = await client.getAuctionFactory();

        await client.changeTreasury(updatedTreasury.publicKey);

        auctionFactoryAccount = await client.getAuctionFactory();

        assert.ok(
            auctionFactoryAccount.treasury.toString() ===
                updatedTreasury.publicKey.toString()
        );
    });

    it("Transfer excess auction factory lamports to treasury", async () => {
        const amountToTransfer = 0.3 * LAMPORTS_PER_SOL;
        await client.addFundsToAuctionFactory(amountToTransfer);

        const afAccountBalanceBefore = await client.getAuctionFactoryBalance();
        const treasuryAccountBalanceBefore = await client.getTreasuryBalance();

        await client.dumpLamportsToTreasury();

        const afAccountBalanceAfter = await client.getAuctionFactoryBalance();
        const treasuryAccountBalanceAfter = await client.getTreasuryBalance();
        assert.ok(
            afAccountBalanceBefore - afAccountBalanceAfter === amountToTransfer
        );
        assert.ok(
            treasuryAccountBalanceAfter - treasuryAccountBalanceBefore ===
                amountToTransfer
        );
    });

    it("attempt to add config data exceeding max element length", async () => {
        const new_uris_for_empty_config = generateConfigs(
            1,
            MAX_URI_LENGTH + 1
        );

        expectThrowsAsync(async () => {
            await client.addDataToConfig(new_uris_for_empty_config);
        }, "Config element too long. Must be less than max length!");
    });

    it("fill up half of config", async () => {
        const new_uris_for_empty_config = generateConfigs(
            Math.round(MAX_CONFIG_VEC_SIZE / 2)
        );

        await client.addDataToConfig(new_uris_for_empty_config);

        const configAccount = await client.fetchConfig(client.config.address);
        assert.ok(configAccount.updateIdx === new_uris_for_empty_config.length);
        assert.ok(
            (configAccount.buffer as string[]).length ===
                new_uris_for_empty_config.length
        );
    });

    it("initialize first auction & supply resource for auction", async () => {
        let auctionFactoryAccount = await client.getAuctionFactory();
        let seq = auctionFactoryAccount.sequence;

        assert.ok(seq.eq(BN_ZERO));
        seq = seq.add(BN_ONE);

        await client.initAuction(seq);

        // generate accounts for mint
        const mint = Keypair.generate();
        await client.mintNftToAuction(seq, mint);

        const auctionAddr = await client.getAuctionAddressWithSequence(seq);
        await logSupplyResourceData(
            auctionFactoryAccount.sequence,
            auctionAddr,
            client.auctionFactory.config.address,
            mint.publicKey
        );

        const auctionAccount = await client.fetchAuction(auctionAddr);
        assert.ok(auctionAccount.resource !== null);
        assert.ok(
            auctionAccount.resource.toString() === mint.publicKey.toString()
        );

        // verify auction token account actually has a token in it
        const auctionTokenAmount = await client.getAuctionTokenAccountBalance(
            auctionAddr,
            mint.publicKey
        );
        assert.ok(auctionTokenAmount === 1);
    });

    it("attempt to initialize first auction again, and fail 😈", async () => {
        let auctionFactoryAccount = await client.getAuctionFactory();
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);

        expectThrowsAsync(async () => {
            await client.initAuction(BN_ONE);
        });

        auctionFactoryAccount = await client.getAuctionFactory();
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);
    });

    it("attempt to supply resource for auction again, and fail 😈", async () => {
        let auctionFactoryAccount = await client.getAuctionFactory();
        const seq = auctionFactoryAccount.sequence;

        // generate accounts for mint
        const mint = Keypair.generate();
        expectThrowsAsync(async () => {
            await client.mintNftToAuction(seq, mint);
        }, "Auction resource can only be generated once.");
    });

    it("attempt to create a new auction during an active auction, and fail 😈", async () => {
        let auctionFactoryAccount = await client.getAuctionFactory();
        const seq = auctionFactoryAccount.sequence;
        assert.ok(seq.eq(BN_ONE));

        expectThrowsAsync(async () => {
            await client.initAuction(seq.add(BN_ONE));
        }, "Must settle any ongoing auction before creating a new auction.");

        auctionFactoryAccount = await client.getAuctionFactory();
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);
    });

    it("add n + 1 data to config", async () => {
        let configAccount = await client.fetchConfig(client.config.address);
        const numConfigBeforeUpdate = (configAccount.buffer as string[]).length;
        const new_uris_for_empty_config = generateConfigs(
            configAccount.maxSupply - numConfigBeforeUpdate + 1
        );

        await client.addDataToConfig(new_uris_for_empty_config);

        configAccount = await client.fetchConfig(client.config.address);
        assert.ok(
            configAccount.updateIdx ===
                (new_uris_for_empty_config.length + numConfigBeforeUpdate) %
                    configAccount.maxSupply
        );
        assert.ok(configAccount.updateIdx === 1);

        const configUris = configAccount.buffer as string[];
        // verify config wrapped, did not exceed max supply
        assert.ok(configUris.length === configAccount.maxSupply);
        assert.ok(
            configUris[0] ===
                new_uris_for_empty_config[new_uris_for_empty_config.length - 1]
        );
    });

    it("attempt to add data to config, no config change", async () => {
        let configAccount = await client.fetchConfig(client.config.address);
        const configUrisBeforeCall = configAccount.buffer as string[];
        const updatedIdxBeforeCall = configAccount.updateIdx;

        await client.addDataToConfig(generateConfigs(10));

        configAccount = await client.fetchConfig(client.config.address);
        const configUrisAfterCall = configAccount.buffer as string[];
        const updatedIdxAfterCall = configAccount.updateIdx;

        assert.ok(updatedIdxBeforeCall === updatedIdxAfterCall);
        assert.ok(lodash.isEqual(configUrisBeforeCall, configUrisAfterCall));
    });

    it("spin until auction can be settled", async () => {
        await waitForAuctionToEnd(client, 3, true);
    });

    it("settle auction with no bids", async () => {
        let auctionFactoryAccount = await client.getAuctionFactory();
        const treasuryBalanceBefore = await client.getTreasuryBalance();
        const auction = await client.getCurrentAuctionAddress();
        let auctionAccount = await client.fetchAuction(auction);
        const mint = new PublicKey(auctionAccount.resource);
        const [bidderTokenAccount, bidderTokenAccountBump] =
            await client.getAssociatedTokenAccountAddress(
                auctionAccount.bidder,
                mint
            );

        await client.settleCurrentAuction(
            auctionFactoryAccount.sequence,
            {
                address: bidderTokenAccount,
                bump: bidderTokenAccountBump,
            },
            mint
        );

        auctionAccount = await client.fetchAuction(auction);
        assert.ok(auctionAccount.settled === true);
        assert.ok(
            auctionAccount.finalizedEndTime !== undefined &&
                auctionAccount.finalizedEndTime.toNumber() !== 0
        );

        // verify treasury balance has not changed
        const treasuryBalanceAfter = await client.getTreasuryBalance();
        assert.ok(treasuryBalanceAfter === treasuryBalanceBefore);

        const auctionTokenAmount = await client.getAuctionTokenAccountBalance(
            auction,
            mint
        );
        assert.ok(auctionTokenAmount === 0);
    });

    it("attempt to settle auction again, and fail", async () => {
        let auctionFactoryAccount = await client.getAuctionFactory();
        const auction = await client.getCurrentAuctionAddress();
        let auctionAccount = await client.fetchAuction(auction);
        const mint = new PublicKey(auctionAccount.resource.toString());
        const [bidderTokenAccount, bidderTokenAccountBump] =
            await client.getAssociatedTokenAccountAddress(
                auctionAccount.bidder,
                mint
            );

        // no custom error here because anchor macros should prevent call from even executing.
        // e.g. Error: failed to send transaction: Transaction simulation failed: Error processing Instruction 0: custom program error: 0x7d3
        expectThrowsAsync(async () => {
            await client.settleCurrentAuction(
                auctionFactoryAccount.sequence,
                {
                    address: bidderTokenAccount,
                    bump: bidderTokenAccountBump,
                },
                mint
            );
        });
    });

    it("close first auction's token account after token removed", async () => {
        const treasuryBalanceBefore = await client.getTreasuryBalance();
        const auction = await client.getCurrentAuctionAddress();
        let auctionAccount = await client.fetchAuction(auction);
        const mint = new PublicKey(auctionAccount.resource);

        await client.closeCurrentAuctionATA();

        auctionAccount = await client.fetchAuction(auction);

        const treasuryBalanceAfter = await client.getTreasuryBalance();
        assert.ok(treasuryBalanceAfter > treasuryBalanceBefore);
        let tokenAccountClosed = false;
        try {
            const auctionTokenAmount =
                await client.getAuctionTokenAccountBalance(auction, mint);
            tokenAccountClosed = auctionTokenAmount === 0;
        } catch (e: any) {
            tokenAccountClosed = lodash.includes(
                e.message,
                "could not find account"
            );
        }
        assert.ok(tokenAccountClosed === true);
    });

    it("first auction is over. create a new auction.", async () => {
        let auctionFactoryAccount = await client.getAuctionFactory();
        const seq = auctionFactoryAccount.sequence.add(BN_ONE);

        await client.initAuction(seq);
        const auction = await client.getAuctionAddressWithSequence(seq);
        const mint = Keypair.generate();
        await client.mintNftToAuction(seq, mint);

        await logSupplyResourceData(
            seq,
            auction,
            client.auctionFactory.config.address,
            mint.publicKey
        );

        auctionFactoryAccount = await client.getAuctionFactory();
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 2);

        const auctionAccount = await client.fetchAuction(auction);
        assert.ok(auctionAccount.resource !== null);
        assert.ok(
            auctionAccount.resource.toString() === mint.publicKey.toString()
        );
        assert.ok(
            auctionAccount.sequence.toNumber() === seq.toNumber() &&
                seq.toNumber() === 2
        );
        assert.ok(auctionAccount.amount.toNumber() === 0);
        assert.ok(auctionAccount.resource !== null);
        assert.ok(
            auctionAccount.resource.toString() === mint.publicKey.toString()
        );

        // verify auction token account actually has a token in it
        const auctionTokenAmount = await client.getAuctionTokenAccountBalance(
            auction,
            mint.publicKey
        );
        assert.ok(auctionTokenAmount === 1);
    });

    it("place a valid bid and fail to place a follow up bid", async () => {
        const auctionFactoryAccount = await client.getAuctionFactory();
        const seq = auctionFactoryAccount.sequence;
        const auction = await client.getAuctionAddressWithSequence(seq);
        const auctionBalanceBefore = await client.getBalance(auction);

        const bidder = await client.nodeWallet.createFundedWallet(
            0.1 * LAMPORTS_PER_SOL
        );
        const bidAmountInLamports = new BN(100);
        await client.placeBidOnAuction(seq, bidAmountInLamports, bidder);

        const auctionBalanceAfter = await client.getBalance(auction);
        assert.ok(auctionBalanceAfter > auctionBalanceBefore);

        let auctionAccount = await client.fetchAuction(auction);
        let bids = auctionAccount.bids as any[];
        assert.ok(bids.length === 1);
        const winning_bid = bids[0];
        assert.ok(winning_bid.amount.eq(bidAmountInLamports));
        assert.ok(
            winning_bid.bidder.toString() === bidder.publicKey.toString()
        );
        assert.ok(
            auctionAccount.bidder.toString() === bidder.publicKey.toString()
        );

        // compute?
        const newBidAmountInLamports = new BN(105);
        expectThrowsAsync(async () => {
            await client.placeBidOnAuction(seq, newBidAmountInLamports, bidder);
        });

        auctionAccount = await client.fetchAuction(auction);
        bids = auctionAccount.bids as any[];
        // bid wasn't added to list of bids
        assert.ok(bids.length === 1);
    });

    it("place another valid bid", async () => {
        let auctionFactoryAccount = await client.getAuctionFactory();
        const seq = auctionFactoryAccount.sequence;
        const auction = await client.getAuctionAddressWithSequence(seq);
        const auctionBalanceBefore = await client.getBalance(auction);
        let auctionAccount = await client.fetchAuction(auction);
        const leadingBidder = auctionAccount.bidder.toString();
        const bidder = await client.nodeWallet.createFundedWallet(
            0.1 * LAMPORTS_PER_SOL
        );
        const bidAmountInLamports = new BN(105);

        await client.placeBidOnAuction(seq, bidAmountInLamports, bidder);

        const auctionBalanceAfter = await client.getBalance(auction);
        assert.ok(auctionBalanceAfter > auctionBalanceBefore);
        assert.ok(
            new BN(auctionBalanceAfter - auctionBalanceBefore).eq(bidAmountInLamports.sub(auctionAccount.amount))
        );

        auctionAccount = await client.fetchAuction(auction);
        const bids = auctionAccount.bids as any[];
        assert.ok(bids.length === 2);
        const winning_bid = bids[1];
        assert.ok(winning_bid.amount.eq(bidAmountInLamports));
        assert.ok(
            winning_bid.bidder.toString() === bidder.publicKey.toString()
        );
        assert.ok(
            auctionAccount.bidder.toString() === bidder.publicKey.toString()
        );

        // assert most recent losing bidder is at idx === 1 in bids arr
        assert.ok(leadingBidder === bids[0].bidder.toString());
    });

    it("new bidder attempts to place another bid, but fails due to invalid bid amount [not big enough % diff] 😈", async () => {
        let auctionFactoryAccount = await client.getAuctionFactory();
        const seq = auctionFactoryAccount.sequence;
        const auction = await client.getAuctionAddressWithSequence(seq);
        let auctionAccount = await client.fetchAuction(auction);
        const leadingBidder = auctionAccount.bidder.toString();

        const bidder = await client.nodeWallet.createFundedWallet(
            0.1 * LAMPORTS_PER_SOL
        );

        expectThrowsAsync(async () => {
            await client.placeBidOnAuction(
                seq,
                auctionAccount.amount, // same bid amount
                bidder
            );
        }, "Bid must be a non-negative, non-zero amount. Bid must also beat previous bid by some percent.");

        auctionAccount = await client.fetchAuction(auction);

        // verify bid wasn't added
        assert.ok((auctionAccount.bids as any[]).length === 2);
        assert.ok(auctionAccount.bidder.toString() === leadingBidder);
        assert.ok(auctionAccount.amount.eq(auctionAccount.amount));
    });

    it("spin until auction can be settled", async () => {
        await waitForAuctionToEnd(client, 3, true);
    });

    it("attempt to place a valid bid after auction is over", async () => {
        let auctionFactoryAccount = await client.getAuctionFactory();
        let auctionAccount = await client.fetchCurrentAuction();

        const winningAmountBeforeBidAttempt = auctionAccount.amount.toNumber();
        const winningBidderBeforeBidAttempt = auctionAccount.bidder.toString();

        const bidder = await client.nodeWallet.createFundedWallet(
            0.1 * LAMPORTS_PER_SOL
        );
        const newValidBidAmount = Math.round(
            auctionAccount.amount.toNumber() *
                (1 +
                    auctionFactoryAccount.data.minBidPercentageIncrease.toNumber() /
                        100)
        );
        expectThrowsAsync(async () => {
            await client.placeBidOnAuction(
                auctionFactoryAccount.sequence,
                new BN(newValidBidAmount),
                bidder
            );
        }, "Auction is not in a state to perform such action.");

        auctionAccount = await client.fetchAuctionWithSequence(auctionFactoryAccount.sequence);
        assert.ok(
            winningAmountBeforeBidAttempt === auctionAccount.amount.toNumber()
        );
        assert.ok(
            winningBidderBeforeBidAttempt === auctionAccount.bidder.toString()
        );
    });

    // override normal client model to force supplying an invalid auction
    it("attempt to settle wrong auction", async () => {
        const settler = await client.nodeWallet.createFundedWallet(
            0.1 * LAMPORTS_PER_SOL
        );

        let auctionAccount = await client.fetchCurrentAuction();
        const mint = new PublicKey(auctionAccount.resource);
        const [bidderTokenAccount, bidderTokenAccountBump] =
            await client.getAssociatedTokenAccountAddress(
                auctionAccount.bidder,
                mint
            );

        const wrongSequence = new BN(100);
        const [auction, auctionBump] = await client.findAuctionPda(
            wrongSequence,
            client.auctionFactory.config.address
        );

        const metadata = await client.getMetadata(mint);
        const [auctionTokenAccount, _auctionTokenAccountBump] =
            await client.getAssociatedTokenAccountAddress(auction, mint);

        // unable to get custom error here. ixn wrong or anchor macro?
        expectThrowsAsync(async () => {
            await client.program.rpc.settleAuction(
                bidderTokenAccountBump,
                client.auctionFactory.config.bump,
                client.auctionFactory.config.seed,
                auctionBump,
                new anchor.BN(wrongSequence),
                {
                    accounts: {
                        payer: settler.publicKey,
                        treasury: client.auctionFactory.treasury,
                        metadata,
                        auctionFactory: client.auctionFactory.config.address,
                        auction,
                        mint,
                        bidderTokenAccount: bidderTokenAccount,
                        auctionTokenAccount,
                        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                    },
                    signers: [settler],
                }
            );
        });
    });

    it("attempt to settle auction with invalid treasury", async () => {
        const settler = await client.nodeWallet.createFundedWallet(
            0.1 * LAMPORTS_PER_SOL
        );
        const wrongTreasury = await client.nodeWallet.createFundedWallet(
            0.1 * LAMPORTS_PER_SOL
        );

        const auctionAccount = await client.fetchCurrentAuction();
        const auctionPda = await client.fetchAuctionPdaData(
            auctionAccount.sequence
        );
        const mint = new PublicKey(auctionAccount.resource);
        const [bidderTokenAccount, bidderTokenAccountBump] =
            await client.getAssociatedTokenAccountAddress(
                auctionAccount.bidder,
                mint
            );
        const metadata = await client.getMetadata(mint);
        const [auctionTokenAccount, _auctionTokenAccountBump] =
            await client.getAssociatedTokenAccountAddress(
                auctionPda.addr,
                mint
            );
        const seq = new anchor.BN(auctionAccount.sequence);
        expectThrowsAsync(async () => {
            await client.program.rpc.settleAuction(
                bidderTokenAccountBump,
                client.auctionFactory.config.bump,
                client.auctionFactory.config.seed,
                auctionPda.bump,
                seq,
                {
                    accounts: {
                        payer: settler.publicKey,
                        treasury: wrongTreasury.publicKey,
                        metadata,
                        auctionFactory: client.auctionFactory.config.address,
                        auction: auctionPda.addr,
                        mint,
                        bidderTokenAccount: bidderTokenAccount,
                        auctionTokenAccount,
                        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                    },
                    signers: [settler],
                }
            );
        });
    });

    it("attempt to settle auction with invalid bidder token account", async () => {
        const auctionAccount = await client.fetchCurrentAuction();
        const mint = new PublicKey(auctionAccount.resource);
        const fakeAuctionWinner = Keypair.generate();
        const [bidderTokenAccount, bidderTokenAccountBump] =
            await client.getAssociatedTokenAccountAddress(
                fakeAuctionWinner.publicKey,
                mint
            );

        expectThrowsAsync(async () => {
            await client.settleCurrentAuction(
                auctionAccount.sequence,
                {
                    address: bidderTokenAccount,
                    bump: bidderTokenAccountBump,
                },
                mint
            );
        }, "Account does not have correct owner!");
    });

    it("settle auction", async () => {
        const treasuryBalanceBefore = await client.getTreasuryBalance();
        const auction = await client.getCurrentAuctionAddress();
        let auctionAccount = await client.fetchCurrentAuction();
        const mint = new PublicKey(auctionAccount.resource);
        const [bidderTokenAccount, bidderTokenAccountBump] =
            await client.getAssociatedTokenAccountAddress(
                auctionAccount.bidder,
                mint
            );

        await client.settleCurrentAuction(
            auctionAccount.sequence,
            {
                address: bidderTokenAccount,
                bump: bidderTokenAccountBump,
            },
            mint
        );

        auctionAccount = await client.fetchCurrentAuction();
        assert.ok(auctionAccount.settled === true);
        assert.ok(
            auctionAccount.finalizedEndTime !== undefined &&
                auctionAccount.finalizedEndTime.toNumber() !== 0
        );

        // verify treasury balance has not changed
        const treasuryBalanceAfter = await client.getTreasuryBalance();
        assert.ok(
            treasuryBalanceAfter - treasuryBalanceBefore ===
                auctionAccount.amount.toNumber()
        );

        // verify token accounts have correct balances, aka token is in winner account and not auction account
        const bidderTokenAmount = await client.getTokenBalance(
            bidderTokenAccount
        );
        assert.ok(+bidderTokenAmount["value"]["amount"] === 1);

        const auctionTokenAmount = await client.getAuctionTokenAccountBalance(
            auction,
            mint
        );
        assert.ok(auctionTokenAmount === 0);
    });

    // done with main auction lifecycle 🙂
});
