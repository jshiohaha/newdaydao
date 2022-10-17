import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";

import { useAuctionFactory } from "../../hooks/useAuctionFactory";
import "./SettleAuction.css";
import BeatLoader from "react-spinners/BeatLoader";
import { publishToastMessage, walletIsConnected } from "../../utils/util";
import { LOADING_COLOR, LOADING_SPEED_MULTIPLIER, LOADING_STATE_SIZE, OVERRIDE } from "../../utils/constants";

const SETTLE_AUCTION_TEXT = "Settle Auction";

const SettleAuction = () => {
    const { auction, settleAuction, requestProviderRefresh } =
        useAuctionFactory();
    const wallet = useWallet();

    const [settleAuctionButtonContent, _setSettleAuctionButtonContent] =
        useState(SETTLE_AUCTION_TEXT);
    const [isLoading, setIsLoading] = useState(false);

    const settleAuctionHandler = async (e: any) => {
        if (!auction) throw new Error("auction is undefined");
        if (!wallet.publicKey) throw new Error("wallet is not connected");

        setIsLoading(true);

        try {
            await settleAuction(wallet);
        } catch (e: any) {
            publishToastMessage(e.message);
        }

        setIsLoading(false);
        requestProviderRefresh();
    };

    return (
        <>
            <div className="settle--auction--input--group">
                <button
                    className={`settle--auction--button ${
                        !walletIsConnected(wallet) && "wallet--disconnected"
                    }`}
                    onClick={settleAuctionHandler}
                    disabled={isLoading || !walletIsConnected(wallet)}
                >
                    {isLoading ? (
                        <BeatLoader
                            color={LOADING_COLOR}
                            loading={isLoading}
                            css={OVERRIDE}
                            size={LOADING_STATE_SIZE}
                            speedMultiplier={LOADING_SPEED_MULTIPLIER}
                        />
                    ) : (
                        <>{settleAuctionButtonContent}</>
                    )}
                </button>
            </div>
        </>
    );
};

export default SettleAuction;
