import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import BeatLoader from "react-spinners/BeatLoader";
import { BN_ZERO } from "@auction-factory/sdk";
import toast from "react-hot-toast";

import { useAuctionFactory } from "../../hooks/useAuctionFactory";
import { publishToastMessage, walletIsConnected } from "../../utils/util";

import "./CreateAuction.css";
import {
    LOADING_COLOR,
    LOADING_SPEED_MULTIPLIER,
    LOADING_STATE_SIZE,
    OVERRIDE,
} from "../../utils/constants";

const CREATE_AUCTION_TEXT = "Create Auction";
const CREATE_FIRST_AUCTION_TEXT = "Create First Auction";
const CREATE_NEXT_AUCTION_TEXT = "Create Next Auction";
const MINT_AUCTION_NFT_TEXT = "Mint Auction NFT";

const CreateAuction = () => {
    const {
        auction,
        auctionFactory,
        createAuction,
        mintNftToAuctionWithRpcCall,
        requestProviderRefresh,
    } = useAuctionFactory();
    const wallet = useWallet();

    const [createAuctionButtonContent, setCreateAuctionButtonContent] =
        useState<string>(CREATE_AUCTION_TEXT);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        if (!auction) return;

        // is auction started, not settled, and resource null?
        if (!auction.settled && !auction.resource) {
            setCreateAuctionButtonContent(MINT_AUCTION_NFT_TEXT);
        } else {
            if (auction.sequence.eq(BN_ZERO)) {
                setCreateAuctionButtonContent(CREATE_FIRST_AUCTION_TEXT);
            } else {
                setCreateAuctionButtonContent(CREATE_NEXT_AUCTION_TEXT);
            }
        }
    }, [auction && auction?.sequence]);

    // todo: split out actions into separate components? or combine everything into 1?
    const createAuctionHandler = async (e: any) => {
        if (!wallet.publicKey) throw new Error("wallet is not connected");

        try {
            setIsLoading(true);

            let sig;
            // allows users to retry in the case that 1 call fails
            if (!auction || (auction && auction.settled)) {
                sig = await createAuction(wallet);
            } else {
                sig = await mintNftToAuctionWithRpcCall(wallet);
            }

            // verify sig is cnfirmed
            // todo: getParsedProgramAccounts

            setIsLoading(false);
            requestProviderRefresh();
        } catch (e: any) {
            publishToastMessage(e.message);
        }

        setIsLoading(false);
    };

    const isButtonDisabled = () => {
        return (
            !walletIsConnected(wallet) ||
            auction?.sequence.lt(auctionFactory!.sequence)
        );
    };

    return (
        <>
            {auction?.sequence.lt(auctionFactory!.sequence) ? (
                <></>
            ) : (
                <div className="create--auction--input--group">
                    <button
                        className={`create--auction--button ${
                            isButtonDisabled() && "wallet--disconnected"
                        }`}
                        onClick={createAuctionHandler}
                        disabled={isLoading || isButtonDisabled()}
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
                            <>{createAuctionButtonContent}</>
                        )}
                    </button>
                </div>
            )}
        </>
    );
};

export default CreateAuction;
