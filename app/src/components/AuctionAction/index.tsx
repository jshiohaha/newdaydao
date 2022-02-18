import { useCallback } from "react";
import { BN_ZERO } from "@auction-factory/sdk";

import PlaceBid from "../PlaceBid";
import CreateAuction from "../CreateAuction";
import SettleAuction from "../SettleAuction";
import { useAuctionFactory } from "../../hooks/useAuctionFactory";
import { isAuctionLive } from "../../utils/auction";

import "./AuctionAction.css";

// TODO: handle loading & success states + error message displays
// try {} catch (e: any) {}
// todo: add spinner state?
// todo: display error message after possible timeout
// todo: try to do somehting while wallet is not connected
const AuctionAction = () => {
    const { auction, auctionFactory } = useAuctionFactory();

    const isAuctionInCreateState = (): boolean => {
        if (auctionFactory?.sequence.eq(BN_ZERO)) return true;
        if (auction && auction.settled) return true;
        if (auction && !auction.resource) return true;

        return false;

    }
    const renderAuctionAction = useCallback(() => {
        if (!auctionFactory) return <></>;

        // create a mint option?

        if (isAuctionInCreateState()) {
            return <CreateAuction />;
        } else if (isAuctionLive(auction)) {
            return <PlaceBid />;
        // by virtue of above check, we know auction is not live. we can thus avoid a re-check.
        } else if (auction && !auction.settled) {
            return <SettleAuction />;
        }

        // return <SettleAuction />;
        // return <CreateAuction />;

        // placeholder button
        return <></>;
        // TODO: does this cause component to refresh in case of refresh?
    }, [auctionFactory, auction]);

    return renderAuctionAction();
};

export default AuctionAction;
