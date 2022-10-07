import { useEffect, useState, useCallback, useRef } from "react";
import { ENV } from "@solana/spl-token-registry";
import { PublicKey, Connection } from "@solana/web3.js";
import Avatar from "boring-avatars";
import { Bid } from "@auction-factory/sdk";

import BidDetails from "../BidDetails";
import { toDisplayString } from "../../utils/address";
import { getFormattedBidAmount } from "../../utils/auction";
import { AVATAR_COLORS } from '../../utils/constants';
import { toDateSubString } from "../../utils/util";

import "./BidHistory.css";

export interface BidHistoryProps {
    title: string;
    bids: Bid[] | undefined;
    isVisible: boolean;
    onClose: () => void;
}

const BidHistory = (props: BidHistoryProps) => {
    const { title, bids, isVisible, onClose } = props;
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const _handleClickOutside = (e: any) => {
            if (
                isVisible &&
                modalRef.current &&
                !modalRef.current!.contains(e.target)
            ) {
                e.preventDefault();
                onClose();
            }
        };

        // bind the event listener
        document.addEventListener("mousedown", _handleClickOutside);

        return () => {
            // unbind the event listener on clean up
            document.removeEventListener("mousedown", _handleClickOutside);
        };
    }, [isVisible]);

    return (
        <div
            className={`bid--history--background ${
                isVisible ? "is--visible" : ""
            }`}
        >
            <div ref={modalRef} className="bid--history--wrapper">
                <h1 className="bid--history--title">{title}</h1>
                <p className="bid--history--descriptor">This auction has a total of {bids?.length} bids.</p>

                <ul className="bid--history--items">
                    {bids ? (
                        bids.slice().reverse().map((bid, idx) => {
                            return (
                                <li key={idx} className="bid--item">
                                    <BidDetails idx={idx} bidder={bid.bidder} amount={bid.amount} timestamp={bid.updatedAt} />
                                </li>
                            );
                        })
                    ) : (
                        <>No bids yet</>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default BidHistory;
