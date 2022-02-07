import { Keypair } from "@solana/web3.js";
import * as assert from "assert";

import { AuctionFactoryTestClient } from "./shared/driver.test";

import { RUN_ALL_TESTS } from "./shared/constants";
import {
    logConfigData,
    generateRandomNumber,
    generateConfigs,
    waitForAuctionToEnd,
} from "./shared/helpers";
import { Network } from "./shared/types";
import { expectThrowsAsync, getAnchorEnv } from "./shared/utils";

if (getAnchorEnv() === Network.Localnet && RUN_ALL_TESTS) {
    // ============================================================================
    // test many auctions
    //
    // this group of tests will validate that the circular buffer and relationship
    // between the config and auction accounts are working as expected.
    // how it works:
    //      - continuously generate new auctions, wait for them to expire, and settle them.
    //      - when we reach config's updateIdx, we generate m more config where 1 < m < max_supply
    // ideally, we should reach end of for loop and never get insufficient config error.
    // ============================================================================
    describe("create and settle a bunch of auctions", async () => {
        const client = new AuctionFactoryTestClient();

        const MAX_CONFIG_VEC_SIZE = 10;
        const durationInSeconds = 1;
        const timeBufferInSeconds = 0;
        const minBidPercentageIncrease = 0;
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

        it("add random elements to config", async () => {
            const numConfig = generateRandomNumber(1, MAX_CONFIG_VEC_SIZE);
            console.log(`=== ADDING ${numConfig} CONFIG ===`);

            const new_uris_for_empty_config = generateConfigs(numConfig);
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

        it("init, spin, settle n auctions", async () => {
            // upper bound arbitrarily set. change as you please.
            const numAuctions = generateRandomNumber(
                1,
                MAX_CONFIG_VEC_SIZE * 2
            );

            console.log(`=== RUNNING ${numAuctions} AUCTIONS ===`);
            for (let i = 0; i < numAuctions; i++) {
                console.log(`=== STARTING AUCTION CYCLE ${i} ===`);
                const configAccount = await client.fetchConfig(
                    client.config.address
                );

                // note: comment this out, and we will get insufficient config error.
                if (
                    i > 0 &&
                    i % MAX_CONFIG_VEC_SIZE === configAccount.updateIdx
                ) {
                    const auctionFactoryAccount =
                        await client.fetchAuctionFactory(
                            client.auctionFactory.config.address
                        );

                    const adjSequence =
                        auctionFactoryAccount.sequence.toNumber() %
                        MAX_CONFIG_VEC_SIZE;

                    const numAdditionalConfig = generateRandomNumber(
                        1,
                        MAX_CONFIG_VEC_SIZE
                    );
                    console.log(
                        `=== ADDING ${numAdditionalConfig} MORE CONFIG AT ADJ SEQ ${adjSequence} ===`
                    );

                    logConfigData(configAccount, client.config.address);

                    await client.addDataToConfig(
                        generateConfigs(numAdditionalConfig)
                    );

                    // todo(opt): add some validation here about pre/post update_idx stats?

                    logConfigData(
                        await client.fetchConfig(client.config.address),
                        client.config.address
                    );
                }

                const auctionFactoryAccount = await client.fetchAuctionFactory(
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

                let auctionAccount = await client.fetchAuction(
                    client.auction.config.address
                );
                assert.ok(auctionAccount.resource !== null);
                // verify auction token account actually has a token in it
                let auctionTokenAmount =
                    await client.getAuctionTokenAccountBalance(
                        client.auction.config.address,
                        mint.publicKey
                    );
                assert.ok(auctionTokenAmount === 1);

                // 2. spin until auction is over. removing this will cause tests to fail with error
                // `Auction is live and cannot be settled.`
                await waitForAuctionToEnd(
                    client,
                    client.auction.config.address,
                    1,
                    true
                );

                // 3. settle auction
                const [bidderTokenAccount, bidderTokenAccountBump] =
                    await client.getAssociatedTokenAccountAddress(
                        auctionAccount.bidder,
                        mint.publicKey
                    );

                await client.settleCurrentAuction(
                    {
                        address: bidderTokenAccount,
                        bump: bidderTokenAccountBump,
                    },
                    mint.publicKey
                );

                auctionAccount = await client.fetchAuction(
                    client.auction.config.address
                );
                assert.ok(auctionAccount.settled === true);
                assert.ok(
                    auctionAccount.finalizedEndTime !== undefined &&
                        auctionAccount.finalizedEndTime.toNumber() !== 0
                );

                auctionTokenAmount = await client.getAuctionTokenAccountBalance(
                    client.auction.config.address,
                    mint.publicKey
                );
                assert.ok(auctionTokenAmount === 0);
                // yay
            }

            const auctionFactoryAccount = await client.fetchAuctionFactory(
                client.auctionFactory.config.address
            );
            assert.ok(auctionFactoryAccount.sequence.toNumber() == numAuctions);
        });
    });
}
