import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import BeatLoader from "react-spinners/BeatLoader";
import { BN_ZERO } from "@auction-factory/sdk";

import { useAuctionFactory } from "../../hooks/useAuctionFactory";
import { walletIsConnected } from '../../utils/util';

import "./CreateAuction.css";

const CREATE_AUCTION_TEXT = "Create Auction";
const CREATE_FIRST_AUCTION_TEXT = "Create First Auction";
const CREATE_NEXT_AUCTION_TEXT = "Create Next Auction";
const MINT_AUCTION_NFT_TEXT = "Mint Auction NFT";

const loadingColor = "#ffffff";
// Can be a string as well. Need to ensure each key-value pair ends with ;
const override = 'display: block; margin: 0 auto; border-color: red;';

const CreateAuction = () => {
    const {
        auction,
        auctionFactory,
        createAuction,
        mintNftToAuctionWithRpcCall,
        requestProviderRefresh
    } = useAuctionFactory();
    const wallet = useWallet();

    const [createAuctionButtonContent, setCreateAuctionButtonContent] = useState<string>(CREATE_AUCTION_TEXT);
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

    const createAuctionHandler = async (e: any) => {
        if (!wallet.publicKey) throw new Error("wallet is not connected");

        try {
            setIsLoading(true);
            // allows users to retry in the case that 1 call fails
            if (!auction || auction && auction.settled) {
                await createAuction(wallet);
            }
            await mintNftToAuctionWithRpcCall(wallet);

            setIsLoading(false);
            requestProviderRefresh();
        } catch (e: any) {
            // todo: parse error?
            setIsLoading(false);
            alert(e.message);
            console.log(e);
        }
    };

    return (
        <>
            <div className="create--auction--input--group">
                <button
                    className={`create--auction--button ${!walletIsConnected(wallet) && 'wallet--disconnected'}`}
                    onClick={createAuctionHandler}
                    disabled={isLoading || !walletIsConnected(wallet)}
                >
                    {isLoading ? (
                        <BeatLoader color={loadingColor} loading={isLoading} css={override} size={10} speedMultiplier={0.75} />
                    ) : (
                        <>{createAuctionButtonContent}</>
                    )}
                </button>
            </div>
        </>
    );
};

export default CreateAuction;
