import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import {
    AUX_FACTORY_PROGRAM_ID,
    AUX_SEED,
    AUX_FAX_SEED,
    URI_CONFIG_SEED,
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    TOKEN_METADATA_PROGRAM_ID
} from "./constants";

export const getAuctionFactoryAccountAddress = async (uuid: string) => {
    return await PublicKey.findProgramAddress(
        [Buffer.from(AUX_FAX_SEED), Buffer.from(uuid)],
        AUX_FACTORY_PROGRAM_ID
    );
};

export const getAuctionAccountAddress = async (
    sequence: number,
    auctionFactory: PublicKey
) => {
    return await PublicKey.findProgramAddress(
        [
            Buffer.from(AUX_SEED),
            auctionFactory.toBytes(),
            Buffer.from(sequence.toString()),
        ],
        AUX_FACTORY_PROGRAM_ID
    );
};

// maybe we should allow to chnage config
export const getConfigAddress = async (
    uuid: string
) => {
    return await PublicKey.findProgramAddress(
        [
            Buffer.from(URI_CONFIG_SEED),
            Buffer.from(uuid)
        ],
        AUX_FACTORY_PROGRAM_ID
    );
};

const getAssociatedTokenAccountAddress = async (
    owner: PublicKey,
    mint: PublicKey
) => {
    return await PublicKey.findProgramAddress(
        [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    );
};

export const getTokenMintAccount = async (
    owner: PublicKey,
    cardMint: PublicKey
) => {
    return await getAssociatedTokenAccountAddress(owner, cardMint);
};

export const getMasterEdition = async (mint: PublicKey): Promise<PublicKey> => {
    return (
        await PublicKey.findProgramAddress(
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

export const getMetadata = async (mint: PublicKey): Promise<PublicKey> => {
    return (
        await PublicKey.findProgramAddress(
            [
                Buffer.from("metadata"),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mint.toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
        )
    )[0];
};