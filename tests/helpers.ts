import {
    PublicKey,
    SystemProgram,
    Keypair,
    SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { Program } from "@project-serum/anchor";
import * as assert from "assert";
import * as lodash from "lodash";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import { PdaConfig, AuctionsData, Network } from "./types";
import {
    TOKEN_METADATA_PROGRAM_ID,
    DEFAULT_ALPHABET,
    AUCTION_FACTORY_UUID_LEN,
    CONFIG_UUID_LEN
} from "./constants";
import {
    getAuctionAccountAddress,
    getTokenMintAccount,
    getMetadata,
    getMasterEdition
} from './account';
import { AuctionFactory as AuctionFactoryProgram } from "../target/types/auction_factory";
import { sleep } from './utils';

export function auctionFactoryUuidFromPubkey(account: PublicKey) {
    return account.toBase58().slice(0, AUCTION_FACTORY_UUID_LEN);
}

export function configUuidFromPubkey(account: PublicKey) {
    return account.toBase58().slice(0, CONFIG_UUID_LEN);
}

export const generateMintAccounts = async (auction: PublicKey) => {
    const mint = Keypair.generate();
    const metadata = await getMetadata(mint.publicKey);
    const masterEdition = await getMasterEdition(mint.publicKey);
    const [tokenAccount, bump] = await getTokenMintAccount(
        auction,
        mint.publicKey
    );

    return {
        mint,
        metadata,
        masterEdition,
        tokenAccount,
        tokenAccountBump: bump,
    };
};

export const getCurrentAuctionFactorySequence = async (
    program: Program<AuctionFactoryProgram>,
    auctionFactoryAddress: PublicKey
) => {
    const auctionFactoryAccount = await program.account.auctionFactory.fetch(
        auctionFactoryAddress
    );

    return Math.max(auctionFactoryAccount.sequence.toNumber() - 1, 0);
};

export const getRandomCharFromAlphabet = (alphabet: string) => {
    return alphabet.charAt(Math.floor(Math.random() * alphabet.length));
};

// https://stackoverflow.com/a/55837120
export const generateId = (
    idDesiredLength: number,
    alphabet = DEFAULT_ALPHABET
) => {
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

export const generateConfigs = (n: number, configLen: number = 10) => {
    return Array(n)
        .fill(0)
        .map((_el, _idx) => generateId(configLen));
};

export const generateRandomNumber = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const logBids = (bids: any[]) => {
    const reversedBids = bids.reverse();
    console.log(`=== ${reversedBids.length} BIDS ===`);
    for (let i = 0; i < reversedBids.length; i++) {
        const bid = reversedBids[i];
        const dateTime = new Date(bid.updatedAt.toNumber() * 1000);
        console.log('> idx: ', i+1);
        console.log('bidder: ', bid.bidder.toString());
        console.log('udpatedAt: ', dateTime);
        console.log('amount: ', bid.amount.toNumber());

    }
}

export const getAccountBalance = async (
    program: Program<AuctionFactoryProgram>,
    address: PublicKey
) => {
    return await program.provider.connection.getBalance(address);
};

export const logConfigData = async (
    program: Program<AuctionFactoryProgram>,
    config: PublicKey
) => {
    const configAccount = await program.account.config.fetch(
        config
    );

    console.log("===== [CONFIG] ======");
    console.log('updateIdx: ', configAccount.updateIdx);
    console.log('isUpdated: ', configAccount.isUpdated);
    const buffer = configAccount.buffer as string[];
    console.log('buffer len: ', buffer.length);
    console.log('max supply: ', configAccount.maxSupply);
    console.log('buffer: ', buffer);
}

export const logAuctionAccountData = async (
    program: Program<AuctionFactoryProgram>,
    auction: PublicKey
) => {
    const auctionAccount = await program.account.auction.fetch(auction);

    console.log("===== [AUCTION] ======");
    console.log("sequence: ", auctionAccount.sequence.toNumber());
    console.log("authority: ", auctionAccount.authority.toString());
    console.log("startTime: ", auctionAccount.startTime.toNumber());
    console.log("endTime: ", auctionAccount.endTime.toNumber());
    console.log(
        "finalizedEndTime: ",
        auctionAccount.finalizedEndTime.toNumber()
    );
    console.log("settled: ", auctionAccount.settled);
    console.log("amount: ", auctionAccount.amount.toNumber());
    console.log("bidder: ", auctionAccount.bidder.toString());
    console.log("bidTime: ", auctionAccount.bidTime.toNumber());
    console.log("resource: ", auctionAccount.resource.toString());
};

export const getAuctionAccountData = async (
    program: Program<AuctionFactoryProgram>,
    auctionFactory: PdaConfig
): Promise<AuctionsData> => {
    const auctionFactoryAccount = await program.account.auctionFactory.fetch(
        auctionFactory.address
    );

    const currentSequence = await getCurrentAuctionFactorySequence(
        program,
        auctionFactory.address
    );

    const [auctionAddress, auctionBump] = await getAuctionAccountAddress(
        currentSequence,
        auctionFactory.address
    );

    if (auctionFactoryAccount.sequence.toNumber() === 0) {
        return {
            currentAuction: auctionAddress,
            currentAuctionBump: auctionBump,
            nextAuction: undefined,
            nextAuctionBump: undefined,
        } as AuctionsData;
    }

    const [nextAuctionAddress, nextAuctionBump] =
        await getAuctionAccountAddress(
            auctionFactoryAccount.sequence.toNumber(),
            auctionFactory.address
        );

    return {
        currentAuction: auctionAddress,
        currentAuctionBump: auctionBump,
        nextAuction: nextAuctionAddress,
        nextAuctionBump: nextAuctionBump,
    };
};

export const getCurrentAuction = (auctionsData: AuctionsData): PdaConfig => {
    return {
        address: auctionsData.currentAuction,
        bump: auctionsData.currentAuctionBump,
    };
}

// used primarily when creating auctions. in the case we are on the first auction, we want the current auction.
// else, we want the next auction. not useful when performing operations on the current auction, e.g.
// submitting bids. this is because we *always* want the current auction in these cases.
// note: a bit confusing now that i think about it more. refactor later?
export const getNextOrCurrentAuction = (auctionsData: AuctionsData): PdaConfig => {
    return auctionsData.nextAuction === undefined
        ? {
              address: auctionsData.currentAuction,
              bump: auctionsData.currentAuctionBump,
          }
        : {
              address: auctionsData.nextAuction,
              bump: auctionsData.nextAuctionBump,
          };
};

export const generateSupplyResourceAccounts = async (
    payer: PublicKey,
    config: PublicKey,
    auctionFactory: PublicKey,
    auction: PublicKey,
    mintAccounts: any
) => {
    return {
        payer,
        config,
        auction,
        auctionFactory,
        metadata: mintAccounts.metadata,
        masterEdition: mintAccounts.masterEdition,
        mint: mintAccounts.mint.publicKey,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
    } as any;
};

export const logSupplyResourceData = async (
    program: Program<AuctionFactoryProgram>,
    auctionAddress: PublicKey,
    auctionFactoryAddress: PublicKey,
    mintAccounts: any
) => {
    const auctionFactoryAccount = await program.account.auctionFactory.fetch(
        auctionFactoryAddress
    );

    console.log(
        "================ SUPPLY RESOURCE FOR AUCTION ================"
    );
    console.log("metadata: ", mintAccounts.metadata.toString());
    console.log("master edition: ", mintAccounts.masterEdition.toString());
    console.log("mint key: ", mintAccounts.mint.publicKey.toString());
    console.log(
        "auction token account: ",
        mintAccounts.tokenAccount.toString()
    );
    console.log("auction: ", auctionAddress.toString());
    console.log("auction factory ", auctionFactoryAddress.toString());
    console.log(
        "auction factory sequence ",
        auctionFactoryAccount.sequence.toNumber()
    );
    console.log("============================================================");
};

export const waitForAuctionToEnd = async (
    program: Program<AuctionFactoryProgram>,
    auction: PublicKey,
    sleepTimeoutInSeconds: number = 3,
    verbose: boolean = false
) => {
    let auctionAccount = await program.account.auction.fetch(auction);

    // loop until auction is over
    let currentTimestamp = new Date().getTime() / 1000;
    const auctionEndTime = auctionAccount.endTime.toNumber();

    if (verbose) {
        const readableAauctionEndTime = new Date(auctionEndTime * 1000);
        console.log(`Spinning until auction is over at ${readableAauctionEndTime}`);
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

export const getAnchorEnv = () => {
    const providerUrl = process.env.ANCHOR_PROVIDER_URL;

    if (lodash.includes(providerUrl, "testnet")) {
        return Network.Testnet;
    } else if (lodash.includes(providerUrl, "devnet")) {
        return Network.Devnet;
    } else if (lodash.includes(providerUrl, "mainnet")) {
        return Network.Mainnet;
    } else {
        return Network.Localnet;
    }
};
