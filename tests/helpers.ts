import { PublicKey } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import IDL from "../target/idl/auction_factory.json";
import { AuctionFactory } from "../target/types/auction_factory";

import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import {
    AUX_FACTORY_PROGRAM_ID,
    AUX_SEED,
    AUX_FAX_SEED,
    TOKEN_METADATA_PROGRAM_ID,
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
} from "./utils";

export const getAuctionFactoryAccountAddress = async (
    authority: anchor.web3.PublicKey
) => {
    return await PublicKey.findProgramAddress(
        [Buffer.from(AUX_FAX_SEED), authority.toBytes()],
        AUX_FACTORY_PROGRAM_ID
    );
};

export const getAuctionAccountAddress = async (
    sequence: number,
    authority: anchor.web3.PublicKey
) => {
    return await PublicKey.findProgramAddress(
        [
            Buffer.from(AUX_SEED),
            authority.toBytes(),
            Buffer.from(sequence.toString()),
        ],
        AUX_FACTORY_PROGRAM_ID
    );
};

export const getMasterEdition = async (
    mint: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> => {
    return (
        await anchor.web3.PublicKey.findProgramAddress(
            [
                Buffer.from("metadata"),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mint.toBuffer(),
                Buffer.from("edition"),
            ],
            TOKEN_METADATA_PROGRAM_ID
        )
    )[0];
};

export const getMetadata = async (
    mint: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> => {
    return (
        await anchor.web3.PublicKey.findProgramAddress(
            [
                Buffer.from("metadata"),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mint.toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
        )
    )[0];
};

export const getTokenWallet = async (
    wallet: anchor.web3.PublicKey,
    mint: anchor.web3.PublicKey
) => {
    return (
        await anchor.web3.PublicKey.findProgramAddress(
            [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
        )
    )[0];
};

export const createAssociatedTokenAccountInstruction = (
    associatedTokenAddress: anchor.web3.PublicKey,
    payer: anchor.web3.PublicKey,
    walletAddress: anchor.web3.PublicKey,
    splTokenMintAddress: anchor.web3.PublicKey
) => {
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
        { pubkey: walletAddress, isSigner: false, isWritable: false },
        { pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
        {
            pubkey: anchor.web3.SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        {
            pubkey: anchor.web3.SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
    ];
    return new anchor.web3.TransactionInstruction({
        keys,
        programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
        data: Buffer.from([]),
    });
};

////////

export const getAuthorAccount = async (user: PublicKey) => {
    const [authorAccount, bump] =
        await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from("author"), user.toBytes()],
            AUX_FACTORY_PROGRAM_ID
        );

    return { bump, authorAccount };
};

export const getAuctionFactoryAuthority = () => {
    return PublicKey.findProgramAddress(
        [Buffer.from("authority")],
        AUX_FACTORY_PROGRAM_ID
    );
};
