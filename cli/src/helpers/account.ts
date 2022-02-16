import {
    Keypair,
    PublicKey,
} from "@solana/web3.js";
import fs from "fs";
import log from "loglevel";
import { Auction, Bid } from "@auction-factory/sdk";

export const loadWalletKey = (keypair: string): Keypair => {
    if (!keypair || keypair == "") {
        throw new Error("Keypair is required!");
    }
    const loaded = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(keypair).toString()))
    );
    log.info(`wallet public key: ${loaded.publicKey}`);
    return loaded;
}

export const logAuctionData = (
    addr: PublicKey,
    bump: number,
    auction: Auction
) => {
        log.info("===========================================");
        log.info("Auction address:", addr.toString());
        log.info("Auction bump:", bump);
        log.info("===========================================");
        log.info("Auction");
        log.info("Sequence: ", auction.sequence.toNumber());
        log.info("Authority: ", auction.authority.toString());
        log.info("Start time: ", epochToDateString(auction.startTime.toNumber()));
        log.info("End time: ", epochToDateString(auction.endTime.toNumber()));
        log.info("Finalized end time: ", epochToDateString(auction.finalizedEndTime.toNumber()));
        log.info("Settled: ", auction.settled);
        log.info("Leading bid amount: ", auction.amount.toNumber());
        log.info("Leading bidder: ", auction.bidder.toString());
        log.info("Leading bid time: ", epochToDateString(auction.bidTime.toNumber()));
        log.info("Auction resource: ", auction.resource?.toString());

        const bids = auction.bids as Bid[];
        log.info("Number of bids: ", bids.length);
        bids.forEach((bid, idx) => {
            log.info(
                `Bid #${
                    idx + 1
                }\n\tBidder: ${bid.bidder.toString()}\n\tAmount: ${bid.amount.toNumber()}\n\tUpdated At: ${bid.updatedAt.toNumber()}`
            );
        });
}

export const epochToDateString = (
    ts: number | undefined
): Date | undefined => {
    if (!ts || ts === 0) return undefined;

    let timestamp = ts;
    if (ts.toString().length === 10) {
        timestamp = ts * 1000;
    }
    return new Date(timestamp);
}