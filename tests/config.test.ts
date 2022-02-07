import * as assert from "assert";

import { AuctionFactoryTestClient } from "./shared/driver.test";

import { RUN_ALL_TESTS } from "./shared/constants";
import { generateConfigs } from "./shared/helpers";
import { Network } from "./shared/types";
import { getAnchorEnv } from "./shared/utils";

if (getAnchorEnv() === Network.Localnet && RUN_ALL_TESTS) {
    // ============================================================================
    // test maxing out config with 100 items and config data len = 75
    //
    // this group of tests will validate that a user can create a config, an auction
    // factory, and then max out the config without any errors. i wanted to specifically
    // test this due to solana's max account size constraints.
    // ============================================================================
    describe("max out config with data", async () => {
        const client = new AuctionFactoryTestClient();

        const MAX_CONFIG_VEC_SIZE = 100;
        const durationInSeconds = 0;
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

        it("initialize auction factory", async () => {
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
        });

        it("max out config, insert 10 items at a time", async () => {
            let totalConfigSize = 0;
            const numConfigsToAddPerCall = 10;
            while (totalConfigSize <= MAX_CONFIG_VEC_SIZE) {
                console.log("config size: ", totalConfigSize);
                const new_uris_for_empty_config = generateConfigs(
                    numConfigsToAddPerCall,
                    75
                );
                totalConfigSize += numConfigsToAddPerCall;
                await client.addDataToConfig(new_uris_for_empty_config);
            }

            const configAccount = await client.fetchConfig(
                client.config.address
            );
            assert.ok(
                (configAccount.buffer as string[]).length ===
                    MAX_CONFIG_VEC_SIZE
            );
        });
    });
}
