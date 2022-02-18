import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { useAuctionFactory } from "../../hooks/useAuctionFactory";
import "./SettleAuction.css";
import BeatLoader from "react-spinners/BeatLoader";
import { walletIsConnected } from "../../utils/util";

const SETTLE_AUCTION_TEXT = "Settle Auction";
const loadingColor = "#ffffff";
// Can be a string as well. Need to ensure each key-value pair ends with ;
const override = 'display: block; margin: 0 auto; border-color: red;';

const SettleAuction = () => {
    const { auction, settleAuction, requestProviderRefresh } = useAuctionFactory();
    const wallet = useWallet();

    const [settleAuctionButtonContent, _setSettleAuctionButtonContent] =
        useState(SETTLE_AUCTION_TEXT);
    const [isLoading, setIsLoading] = useState(false);

    const settleAuctionHandler = async (e: any) => {
        if (!auction) throw new Error("auction is undefined");
        if (!wallet.publicKey) throw new Error("wallet is not connected");

        setIsLoading(true);
        await settleAuction(wallet);
        setIsLoading(false);
        requestProviderRefresh();
    };

    return (
        <>
            <div className="settle--auction--input--group">
                <button
                    className={`settle--auction--button ${!walletIsConnected(wallet) && 'wallet--disconnected'}`}
                    onClick={settleAuctionHandler}
                    disabled={isLoading || !walletIsConnected(wallet)}
                >
                    {isLoading ? (
                        <BeatLoader color={loadingColor} loading={isLoading} css={override} size={10} speedMultiplier={0.75} />
                    ) : (
                        <>{settleAuctionButtonContent}</>
                    )}
                </button>
            </div>
        </>
    );
};

export default SettleAuction;
