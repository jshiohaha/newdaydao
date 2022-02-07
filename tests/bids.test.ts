import * as lodash from "lodash";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as assert from "assert";

import { AuctionFactoryTestClient } from "./shared/driver.test";

import { RUN_ALL_TESTS } from "./shared/constants";
import {
    logConfigData,
    logBids,
    generateConfigs,
    logSupplyResourceData,
    waitForAuctionToEnd,
} from "./shared/helpers";
import { Network } from "./shared/types";
import { expectThrowsAsync, getAnchorEnv, sleep } from "./shared/utils";

if (getAnchorEnv() === Network.Localnet && RUN_ALL_TESTS) {
    // ============================================================================
    // test many bids
    //
    // this group of tests will validate that users can submit arbitrarily many
    // bids for an auction and that each auction will keep tracking of the n most recent
    // bids, where n is configurable. n is defined in the constant.rs file as MAX_BIDS_TO_RECORD.
    // ============================================================================
    describe("create an auction and test many bids", async () => {
        const client = new AuctionFactoryTestClient();

        const MAX_CONFIG_VEC_SIZE = 10;
        const MAX_BID_VEC_SIZE = 10;
        const durationInSeconds = 30;
        const timeBufferInSeconds = 0;
        const minBidPercentageIncrease = 5;
        const minReservePrice = 0;

        it("initialize config", async () => {
            await client.initConfig(MAX_CONFIG_VEC_SIZE);

            const configDetails = client.getConfigDetails();
            const configAccount = await client.fetchConfig(
                configDetails.address
            );

            assert.ok(configAccount.maxSupply === MAX_CONFIG_VEC_SIZE);
            assert.ok(configAccount.updateIdx === 0);
            assert.ok((configAccount.buffer as string[]).length === 0);
        });

        it("attempt to initialize auction factory with invalid seed", async () => {
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

            let auctionFactoryAccount = await client.fetchAuctionFactory(
                client.auctionFactory.config.address
            );
            assert.ok(!auctionFactoryAccount.isActive);

            await client.toggleAuctionFactoryStatus();

            auctionFactoryAccount = await client.fetchAuctionFactory(
                client.auctionFactory.config.address
            );
            assert.ok(auctionFactoryAccount.isActive);
        });

        it("max out config", async () => {
            const new_uris_for_empty_config =
                generateConfigs(MAX_CONFIG_VEC_SIZE);

            await client.addDataToConfig(new_uris_for_empty_config);

            const configAccount = await client.fetchConfig(
                client.config.address
            );
            assert.ok(
                configAccount.updateIdx ===
                    new_uris_for_empty_config.length % MAX_CONFIG_VEC_SIZE
            );
            assert.ok(
                (configAccount.buffer as string[]).length ===
                    new_uris_for_empty_config.length
            );

            logConfigData(configAccount, client.config.address);
        });

        it("initialize first auction & supply resource for auction", async () => {
            let auctionFactoryAccount = await client.fetchAuctionFactory(
                client.auctionFactory.config.address
            );

            const seq = auctionFactoryAccount.sequence.toNumber();
            await client.initAuction(seq);

            // generate accounts for mint
            const mint = Keypair.generate();
            const [tokenAccount, bump] =
                await client.getAssociatedTokenAccountAddress(
                    client.auction.config.address,
                    mint.publicKey
                );
            await client.mintNftToAuction(mint, {
                address: tokenAccount,
                bump,
            });

            await logSupplyResourceData(
                auctionFactoryAccount.sequence.toNumber(),
                client.auction.config.address,
                client.auctionFactory.config.address,
                mint.publicKey
            );

            const auctionAccount = await client.fetchAuction(
                client.auction.config.address
            );
            assert.ok(auctionAccount.resource !== null);
            assert.ok(
                auctionAccount.resource.toString() === mint.publicKey.toString()
            );

            // verify auction token account actually has a token in it
            const auctionTokenAmount =
                await client.getAuctionTokenAccountBalance(
                    client.auction.config.address,
                    mint.publicKey
                );
            assert.ok(auctionTokenAmount === 1);

            const configAccount = await client.fetchConfig(
                client.config.address
            );
            console.log("config buffer: ", configAccount.buffer as string[]);
        });

        it("submit a bunch of bids", async () => {
            const maxBids = 11;

            let auctionFactoryAccount = await client.fetchAuctionFactory(
                client.auctionFactory.config.address
            );
            const minBidPercentageIncrease =
                auctionFactoryAccount.data.minBidPercentageIncrease.toNumber();
            console.log("minBidPercentageIncrease: ", minBidPercentageIncrease);

            let localBids = [];
            let bidAmountInLamports = 100;
            for (let i = 0; i < maxBids; i++) {
                const bidder = await client.nodeWallet.createFundedWallet(
                    0.1 * LAMPORTS_PER_SOL
                );
                console.log(
                    `${bidder.publicKey.toString()} is submitting bid #${i + 1}`
                );

                let auctionAccount = await client.fetchAuction(
                    client.auction.config.address
                );
                const previousBid = auctionAccount.amount.toNumber();
                const auctionBalanceBefore = await client.getBalance(
                    client.auction.config.address
                );

                await client.placeBidOnAuction(bidAmountInLamports, bidder);
                auctionAccount = await client.fetchAuction(
                    client.auction.config.address
                );
                const updatedBid = auctionAccount.amount.toNumber();
                const auctionBalanceAfter = await client.getBalance(
                    client.auction.config.address
                );
                assert.ok(
                    auctionBalanceAfter - auctionBalanceBefore ===
                        updatedBid - previousBid
                );

                localBids.push(Math.floor(bidAmountInLamports));
                const minBidPercentageIncrease =
                    auctionFactoryAccount.data.minBidPercentageIncrease.toNumber();
                bidAmountInLamports *= 1 + minBidPercentageIncrease / 100;

                await sleep(500);
            }

            const auctionAccount = await client.fetchAuction(
                client.auction.config.address
            );

            const bids = auctionAccount.bids as any[];
            logBids(bids.reverse());

            const expectedBidVecSize = Math.min(MAX_BID_VEC_SIZE, maxBids);
            assert.ok(bids.length === expectedBidVecSize);

            const expectedVec =
                maxBids <= MAX_BID_VEC_SIZE
                    ? localBids
                    : localBids.slice(
                          localBids.length - MAX_BID_VEC_SIZE,
                          localBids.length
                      );
            assert.ok(
                lodash.isEqual(
                    bids.map((bid) => bid.amount.toNumber()),
                    expectedVec
                )
            );
        });

        it("spin and settle auction", async () => {
            // 1. spin until auction is over
            await waitForAuctionToEnd(
                client,
                client.auction.config.address,
                3,
                true
            );

            // 2. settle auction
            let auctionAccount = await client.fetchAuction(
                client.auction.config.address
            );
            const mint = new PublicKey(auctionAccount.resource);
            const [bidderTokenAccount, bidderTokenAccountBump] =
                await client.getAssociatedTokenAccountAddress(
                    auctionAccount.bidder,
                    mint
                );

            await client.settleCurrentAuction(
                {
                    address: bidderTokenAccount,
                    bump: bidderTokenAccountBump,
                },
                mint
            );

            auctionAccount = await client.fetchAuction(
                client.auction.config.address
            );
            assert.ok(auctionAccount.settled === true);
            assert.ok(
                auctionAccount.finalizedEndTime !== undefined &&
                    auctionAccount.finalizedEndTime.toNumber() !== 0
            );
            const auctionTokenAmount =
                await client.getAuctionTokenAccountBalance(
                    client.auction.config.address,
                    mint
                );
            assert.ok(auctionTokenAmount === 0);
        });
    });
}
