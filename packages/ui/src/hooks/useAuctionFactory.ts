import { createContext, useContext } from "react";
import { WalletContextState } from "@solana/wallet-adapter-react";
import {
    AuctionFactoryClient,
    Auction,
    AuctionFactory,
} from "@auction-factory/sdk";
import { BN } from "@project-serum/anchor";

export interface AuctionFactoryContextState {
    client: AuctionFactoryClient | undefined;
    auctionFactory: AuctionFactory | undefined;
    auction: Auction | undefined;
    requestProviderRefresh: () => void;
    createAuction: (wallet: WalletContextState) => Promise<any>;
    mintNftToAuctionWithRpcCall: (wallet: WalletContextState) => Promise<void>;
    placeBid: (amount: BN, wallet: WalletContextState) => Promise<any>;
    settleAuction: (wallet: WalletContextState) => Promise<any>;
    refreshNftMetadata: () => Promise<string|undefined>;
    incrementSequence: () => void;
    decrementSequence: () => void;
}

export const AuctionFactoryContext = createContext<AuctionFactoryContextState>(
    {} as AuctionFactoryContextState
);

export function useAuctionFactory(): AuctionFactoryContextState {
    return useContext(AuctionFactoryContext);
}
