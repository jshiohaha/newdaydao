import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { BN_ZERO } from '@auction-factory/sdk';

import { useAuctionFactory } from "../../hooks/useAuctionFactory";
import { toDisplayString, getAddressLink } from "../../utils/address";

import "./ProofOf.css";
import { useConnection } from "@solana/wallet-adapter-react";
import { timestampToDateString, toDateSubString } from "../../utils/util";

const ProofOf = () => {
    const connection = useConnection();
    const { client, auction, auctionFactory } = useAuctionFactory();
    const [auctionAddress, setAuctionAddress] = useState<PublicKey>();

    useEffect(() => {
        const fetchAuctionAddress = async () => {
            if (!client) return;
            if (!auction) return;
            if (!auctionFactory) return;

            const [addr, _bump] = await client.findAuctionPda(
                auction.sequence,
                client.auctionFactory.config.address
            );

            setAuctionAddress(addr);
        };

        fetchAuctionAddress().catch((err) => console.log(err));
    }, [auction === undefined, auction?.sequence]);

    return (
        <>
            {auction && auction.sequence.gt(BN_ZERO) ? (
                <>
                    <h1 className="proof--of--header">Auction</h1>
                    {auctionAddress ? (
                        <span className="proof--of--auction">
                            Auction (<a className="proof--of--link" href={getAddressLink(auctionAddress)} target="_blank">{toDisplayString(auctionAddress)}</a>) is live
                            from {timestampToDateString(auction.startTime)} to {timestampToDateString(auction.endTime)} and is {auction.settled ? '' : ' not '}
                            settled.
                        </span>
                    ) : (
                        <span>Loading auction data...</span>
                    )}

                    <h1 className="proof--of--header">Token</h1>
                    {auction.resource ? (
                        <span className="proof--of--token">
                            The winning bidder will receive the NDD{" "}
                            {auction.sequence.toNumber()} NFT (<a className="proof--of--link" href={getAddressLink(auction.resource)} target="_blank">{toDisplayString(auction.resource)}</a>).
                        </span>
                    ) : (
                        <span>This auction does not have an NFT yet.</span>
                    )}
                </>
            ) : (
                <span>No auction data to show. Check back after an auction is created.</span>
            )}
        </>
    );
};

export default ProofOf;
