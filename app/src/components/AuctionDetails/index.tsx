import { useState } from 'react';
import { Auction } from '@auction-factory/sdk';

import ProofOf from "../ProofOf";
import BidInfo from "../BidInfo";

import "./AuctionDetails.css";
import AuctionSummary from '../AuctionSummary';
import { useAuctionFactory } from '../../hooks/useAuctionFactory';

export enum AuctionDisplayTab {
    BIDS = "Bids",
    DETAILS = "Details",
    PROOF_OF = "Proof of"
}

const AuctionDetails = () => {
    const { auction, auctionFactory } = useAuctionFactory();
    const [tab, setTab] = useState<AuctionDisplayTab>(AuctionDisplayTab.BIDS);

    const onTabChange = (e: any) => {
        const target: string = e.target.getAttribute("value");

        let updatedTabValue = tab;
        if (target === AuctionDisplayTab.BIDS) {
            updatedTabValue = AuctionDisplayTab.BIDS;
        } else if (target === AuctionDisplayTab.DETAILS) {
            updatedTabValue = AuctionDisplayTab.DETAILS;
        } else if (target === AuctionDisplayTab.PROOF_OF) {
            updatedTabValue = AuctionDisplayTab.PROOF_OF;
        } // else, keep same value

        setTab(updatedTabValue);
    }

    const isTabActive = (target: string) => {
        return tab.toString() === target;
    }

    const renderTabContent = () => {
        if (tab === AuctionDisplayTab.BIDS) {
            return <BidInfo />;
        } else if (tab === AuctionDisplayTab.DETAILS) {
            return <AuctionSummary sequence={auctionFactory?.sequence} />;
        } else if (tab === AuctionDisplayTab.PROOF_OF) {
            return <ProofOf />;
        }
    }

    return (
        <div className="auction--details--wrapper">
            <ul className="auction--details--tabs">
                {Object.entries(AuctionDisplayTab).map(([k, v], idx) => {
                    return (
                        <li key={idx} className={`tab--text ${isTabActive(v) ? `active--tab` : ''}`} onClick={onTabChange} value={v}>{v}</li>
                    )
                })}
            </ul>

            {renderTabContent()}
        </div>
    );
}

export default AuctionDetails;