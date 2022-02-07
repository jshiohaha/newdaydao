import { PublicKey } from "@solana/web3.js";
import * as assert from "assert";
import { DEFAULT_ALPHABET } from "./constants";
import { sleep } from "./utils";

import { AccountUtils } from "../../sdk/src";

export const waitForAuctionToEnd = async (
    client: any,
    auction: PublicKey,
    sleepTimeoutInSeconds: number = 3,
    verbose: boolean = false
) => {
    let auctionAccount = await client.fetchAuction(auction);
    // loop until auction is over
    let currentTimestamp = new Date().getTime() / 1000;
    const auctionEndTime = auctionAccount.endTime.toNumber();

    if (verbose) {
        const readableAauctionEndTime = new Date(auctionEndTime * 1000);
        console.log(
            `Spinning until auction is over at ${readableAauctionEndTime}`
        );
    }

    for (;;) {
        if (verbose) {
            console.log(`Sleeping ${sleepTimeoutInSeconds} seconds`);
        }
        await sleep(sleepTimeoutInSeconds * 1000); // sleep for 3 seconds at a time, until auction is over
        if (currentTimestamp >= auctionEndTime) {
            break;
        }
        currentTimestamp = new Date().getTime() / 1000;
    }
    assert.ok(currentTimestamp >= auctionEndTime);

    return;
};

// ============================================================================
// generative functions
// ============================================================================

export const generateConfigs = (n: number, configLen: number = 10) => {
    return Array(n)
        .fill(0)
        .map((_el, _idx) => generateId(configLen));
};

export const generateRandomNumber = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// ============================================================================
// state/account loggers
// ============================================================================

export const logBids = (bids: any[]) => {
    const bidsReversed = bids.reverse();
    console.log(`=== ${bidsReversed.length} BIDS ===`);
    for (let i = 0; i < bidsReversed.length; i++) {
        const bid = bidsReversed[i];
        const dateTime = new Date(bid.updatedAt.toNumber() * 1000);
        console.log("> idx: ", i + 1);
        console.log("bidder: ", bid.bidder.toString());
        console.log("udpatedAt: ", dateTime);
        console.log("amount: ", bid.amount.toNumber());
    }
};

export const logConfigData = async (account: any, config: PublicKey) => {
    console.log("===== [CONFIG] ======");
    console.log("config: ", config.toString());
    console.log("updateIdx: ", account.updateIdx);
    console.log("isUpdated: ", account.isUpdated);
    const buffer = account.buffer as string[];
    console.log("buffer len: ", buffer.length);
    console.log("max supply: ", account.maxSupply);
    console.log("buffer: ", buffer);
};

export const logSupplyResourceData = async (
    auctionFactorySequence: number,
    auction: PublicKey,
    auctionFactoryAddress: PublicKey,
    mint: PublicKey
) => {
    // don't need connection to
    const accountUtils = new AccountUtils(undefined);
    const ata = await accountUtils.getAssociatedTokenAccountAddress(
        auction,
        mint
    );

    console.log(
        "================ SUPPLY RESOURCE FOR AUCTION ================"
    );
    console.log(
        "metadata: ",
        (await accountUtils.getMetadata(mint)).toString()
    );
    console.log(
        "master edition: ",
        (await accountUtils.getMasterEdition(mint)).toString()
    );
    console.log("mint key: ", mint.toString());
    console.log("auction token account: ", ata.toString());
    console.log("auction: ", auction.toString());
    console.log("auction factory ", auctionFactoryAddress.toString());
    console.log("auction factory sequence ", auctionFactorySequence);
    console.log("============================================================");
};

// ============================================================================
// private functions
// ============================================================================

// https://stackoverflow.com/a/55837120
const generateId = (idDesiredLength: number, alphabet = DEFAULT_ALPHABET) => {
    /**
     * Create n-long array and map it to random chars from given alphabet.
     * Then join individual chars as string
     */
    return Array.from({ length: idDesiredLength })
        .map(() => {
            return getRandomCharFromAlphabet(alphabet);
        })
        .join("");
};

const getRandomCharFromAlphabet = (alphabet: string) => {
    return alphabet.charAt(Math.floor(Math.random() * alphabet.length));
};
