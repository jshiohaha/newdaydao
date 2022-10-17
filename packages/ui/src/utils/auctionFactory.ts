import { Connection } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { SignerWalletAdapter } from "@solana/wallet-adapter-base";
import { AuctionFactoryClient } from "@auction-factory/sdk";

import {
    AUX_FACTORY_PROGRAM_ID,
    CONFIG_ADDRESS,
    CONFIG_BUMP,
    CONFIG_SEED,
    AUX_FACTORY_ADDRESS,
    AUX_FACTORY_BUMP,
    AUX_FACTORY_SEED,
    AUX_FACTORY_TREASURY_ADDRESS,
    LEAKED_WALLET_KEYPAIR,
} from "./constants";
import idl from "../types/auction_factory.json";

export const createDefaultAuctionFactory = async (
    conn: Connection,
    wallet?: SignerWalletAdapter | WalletContextState
) => {
    return await initAuctionFactory(
        conn,
        wallet,
        {
            address: CONFIG_ADDRESS,
            bump: CONFIG_BUMP,
            seed: CONFIG_SEED,
        },
        {
            address: AUX_FACTORY_ADDRESS,
            bump: AUX_FACTORY_BUMP,
            seed: AUX_FACTORY_SEED,
            treasury: AUX_FACTORY_TREASURY_ADDRESS,
        }
    );
};

export const initAuctionFactory = async (
    conn: Connection,
    wallet?: SignerWalletAdapter | WalletContextState,
    config?: any,
    af?: any
): Promise<AuctionFactoryClient> => {
    const walletToUse = wallet ?? LEAKED_WALLET_KEYPAIR;
    const auctionFactoryClient = new AuctionFactoryClient(
        conn,
        walletToUse as any,
        idl as any, // anchor.Idl?
        AUX_FACTORY_PROGRAM_ID
    );

    if (config) {
        auctionFactoryClient.updateConfigDetails(
            config.address,
            config.bump,
            config.seed
        );
    }

    if (af) {
        auctionFactoryClient.setAuctionFactoryDetails(
            af.address,
            af.bump,
            af.seed,
            af.treasury
        );
    }

    return auctionFactoryClient;
};
