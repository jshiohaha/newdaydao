import { useState } from "react";

import BidDetails from "../BidDetails";
import AuctionAction from "../AuctionAction";
import BidHistory from "../BidHistory";

import { useAuctionFactory } from "../../hooks/useAuctionFactory";

import "./BidInfo.css";
import { Bid, BN_ZERO } from "@auction-factory/sdk";

const BidInfo = () => {
    const { auction, auctionFactory } = useAuctionFactory();

    const [bidHistoryVisbility, setBidHistoryVisbility] =
        useState<boolean>(false);

    const _onBidHistoryOpened = () => setBidHistoryVisbility(true);

    const _onBidHistoryClosed = () => setBidHistoryVisbility(false);

    const showBidHistory = (e: any) => {
        console.log("showBidHistory");
    };

    const displayLeadingBidder = (bids: Bid[]) => {
        const lastBid = bids[bids.length - 1];
        return (
            <BidDetails
                bidder={lastBid.bidder}
                amount={lastBid.amount}
                timestamp={lastBid.updatedAt}
            />
        );
    };

    return (
        <>
            <div className="bid--info--wrapper">
                {!auction ? (
                    auctionFactory && auctionFactory.sequence.eq(BN_ZERO) ? (
                        <>No auction has been created yet.</>
                    ) : (
                        <>Loading auction data...</>
                    )
                ) : auction.bids.length > 0 ? (
                    <>
                        <span>
                            {auction.settled ? "Winning " : "Leading "} bid
                        </span>
                        {auction?.bids.length > 0 && (
                            <span
                                className="see--more--bids--text"
                                onClick={_onBidHistoryOpened}
                            >
                                See more bids
                            </span>
                        )}
                        {displayLeadingBidder(auction.bids)}
                    </>
                ) : (
                    <span className="no--bid--text">
                        No one has bid on this auction yet. Once a valid bid has
                        been placed, you will see the leading bid info.
                    </span>
                )}

                <AuctionAction />
            </div>

            <BidHistory
                title={`Auction ${auction?.sequence} Bid History`}
                isVisible={bidHistoryVisbility}
                bids={auction?.bids}
                onClose={_onBidHistoryClosed}
            />
        </>
    );
};

export default BidInfo;
