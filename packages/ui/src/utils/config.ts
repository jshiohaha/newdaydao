import { Provider, Program } from "@project-serum/anchor";
import { Connection, Commitment } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";

import {
    AUX_FACTORY_PROGRAM_ID,
    AUCTION_FACTORY_PROGRAM,
    AUCTION_FACTORY_IDL,
    PROGRAM_ENDPOINT,
} from "./constants";

export const getConnection = () => {
    const endpoint = PROGRAM_ENDPOINT;
    const commitment: Commitment = "processed";
    return new Connection(endpoint, commitment);
};

export const getProvider = (withWallet: WalletContextState) => {
    let confirmOptions = {
        preflightCommitment: "processed" as Commitment
    };

    return new Provider(getConnection(), withWallet as any, confirmOptions);
};

export const getProgram = (
    wallet: WalletContextState
    /* @ts-ignore */
): Program<AUCTION_FACTORY_PROGRAM> => {
    const provider = getProvider(wallet);
    return new Program(
        AUCTION_FACTORY_IDL as any,
        AUX_FACTORY_PROGRAM_ID,
        provider
    );
};
