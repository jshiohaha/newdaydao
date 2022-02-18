import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import Countdown from "../Countdown/index";
import BidHistory from "../BidHistory/index";

import Bid from "../Bid/index";
import { getFormattedDate } from "../../utils/util";
import { isAuctionLive } from "../../utils/auction";
import AuctionAsset from "../AuctionAsset";
import AuctionInfo from "../AuctionInfo";

import "./AuctionDisplay.css";

const AuctionDisplay = () => {
    return (
        <div>
            <div className="auction--display--wrapper">
                {/* todo:
                        = update after refactor to read md uri directly from auction.
                            = prevents us from pulling token metadata
                            = parsing & then pulling image

                    // todo pull from props

                    auction ? auction.resource?.toString() : undefined
                */}
                <AuctionInfo />
            </div>
        </div>
    );
};

export default AuctionDisplay;
