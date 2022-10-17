import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import BeatLoader from "react-spinners/BeatLoader";
import { BN } from "@project-serum/anchor";
import toast from "react-hot-toast";
import { isNumber } from "lodash";

import {
    computeMinimumNextBid,
    convertSolToLamports,
    getFormattedBidAmount,
} from "../../utils/auction";
import { publishToastMessage, walletIsConnected } from "../../utils/util";
import { useAuctionFactory } from "../../hooks/useAuctionFactory";

import "./PlaceBid.css";
import {
    LOADING_COLOR,
    LOADING_SPEED_MULTIPLIER,
    LOADING_STATE_SIZE,
    OVERRIDE,
} from "../../utils/constants";

export const BID_TEXT = "Bid";

const PlaceBid = () => {
    const { auctionFactory, auction, placeBid, requestProviderRefresh } =
        useAuctionFactory();
    const wallet = useWallet();

    const [bidAmount, setBidAmount] = useState("");
    const [isValidInput, setIsValidInput] = useState(true);

    const [minimumBidAmount, setMinimumBidAmount] = useState<BN>(() => {
        const minBid = computeMinimumNextBid(
            auction && auction.amount
                ? auction.amount.toNumber()
                : auctionFactory
                ? auctionFactory.data.minReservePrice.toNumber()
                : 0,
            auctionFactory
                ? auctionFactory.data.minBidPercentageIncrease.toNumber()
                : 0
        );

        return new BN(minBid);
    });

    const [bidButtonContent, _setBidButtonContent] = useState<string>(BID_TEXT);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const changeBidHandler = (e: any) => setBidAmount(e.target.value);

    const placeBidHandler = async () => {
        if (!bidAmount) throw new Error("must enter bid amount");
        if (!auction) throw new Error("auction is undefined");
        if (!wallet.publicKey) throw new Error("wallet is not connected");

        try {
            const numericBidValue = +bidAmount;
            if (!isNumber(numericBidValue)) {
                setIsValidInput(false);
                return;
            }

            const bidInLamports = convertSolToLamports(numericBidValue);
            if (bidInLamports.lte(minimumBidAmount)) {
                setIsValidInput(false);
                return;
            }

            setIsValidInput(true);
            setIsLoading(true);
            await placeBid(bidInLamports, wallet);
            setBidAmount("");
            requestProviderRefresh();
        } catch (e: any) {
            publishToastMessage(e.message);
        }

        setIsLoading(false);
    };

    return (
        <>
            <div className="place--bid--input--group">
                <div>
                    <input
                        aria-label="Place bid input"
                        aria-describedby="basic-addon1"
                        className="bid--input"
                        type="text"
                        min={minimumBidAmount.toNumber()}
                        onChange={changeBidHandler}
                        value={bidAmount}
                        placeholder={`More than ◎${getFormattedBidAmount(
                            minimumBidAmount
                        )}`}
                    />
                    {!isValidInput && (
                        <span className="input--amount--error">{`Bid must be a number higher than ◎${getFormattedBidAmount(
                            minimumBidAmount,
                            false,
                            4
                        )}`}</span>
                    )}
                </div>

                <span className="custom--placeholder">SOL</span>
                <button
                    className={`bid--button ${
                        !walletIsConnected(wallet) && "wallet--disconnected"
                    }`}
                    onClick={placeBidHandler}
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
                        bidButtonContent
                    )}
                </button>
            </div>
        </>
    );
};

export default PlaceBid;
