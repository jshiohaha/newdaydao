import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import BeatLoader from "react-spinners/BeatLoader";
import { BN } from "@project-serum/anchor";

import {
    computeMinimumNextBid,
    convertSolToLamports,
} from "../../utils/auction";
import { walletIsConnected } from "../../utils/util";
import { useAuctionFactory } from "../../hooks/useAuctionFactory";

import "./PlaceBid.css";

const BID_TEXT = "Bid";
const loadingColor = "#ffffff";
// Can be a string as well. Need to ensure each key-value pair ends with ;
const override = "display: block; margin: 0 auto; border-color: red;";

const PlaceBid = () => {
    const { auctionFactory, auction, placeBid, requestProviderRefresh } =
        useAuctionFactory();
    const wallet = useWallet();

    const [bidAmount, setBidAmount] = useState("");
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

        // todo: handle non-numeric bid
        const numericBidValue = +bidAmount;
        console.log("bidAmount: ", numericBidValue);
        const bidInLamports = convertSolToLamports(numericBidValue);
        if (bidInLamports.lte(minimumBidAmount)) {
            // todo: display invalid bid error with exact amount
            console.log("invalid bid");
        }

        // todo: handle issue when user tries to input less than actual amount
        setIsLoading(true);
        await placeBid(bidInLamports, wallet);
        setIsLoading(false);

        setBidAmount("");
        requestProviderRefresh();
    };

    // // placing bid transaction state hook
    // useEffect(() => {
    //   switch (!auctionEnded && placeBidState.status) {
    //     case 'None':
    //       setBidButtonContent({
    //         loading: false,
    //         content: 'Bid',
    //       });
    //       break;
    //     case 'Mining':
    //       setBidButtonContent({ loading: true, content: '' });
    //       break;
    //     case 'Fail':
    //       setModal({
    //         title: 'Transaction Failed',
    //         message: placeBidState.errorMessage ? placeBidState.errorMessage : 'Please try again.',
    //         show: true,
    //       });
    //       setBidButtonContent({ loading: false, content: 'Bid' });
    //       break;
    //     case 'Exception':
    //       setModal({
    //         title: 'Error',
    //         message: placeBidState.errorMessage ? placeBidState.errorMessage : 'Please try again.',
    //         show: true,
    //       });
    //       setBidButtonContent({ loading: false, content: 'Bid' });
    //       break;
    //   }
    // }, [placeBidState, auctionEnded, setModal]);

    return (
        <>
            <div className="place--bid--input--group">
                <input
                    aria-label="Place bid input"
                    aria-describedby="basic-addon1"
                    className="bid--input"
                    type="text"
                    min={minimumBidAmount.toNumber()}
                    onChange={changeBidHandler}
                    value={bidAmount}
                    placeholder={`Min bid is ${minimumBidAmount}`}
                />

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
                            color={loadingColor}
                            loading={isLoading}
                            css={override}
                            size={10}
                            speedMultiplier={0.75}
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
