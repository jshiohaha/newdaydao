import {
    PublicKey,
    TransactionInstruction,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import { ASSOCIATED_PROGRAM_ID } from "./constants";

export const createAssociatedTokenAccountInstruction = (
    mint: PublicKey,
    associatedAccount: PublicKey,
    owner: PublicKey,
    payer: PublicKey
) => {
    const data = Buffer.alloc(0);
    let keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: associatedAccount, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({
        keys,
        programId: ASSOCIATED_PROGRAM_ID,
        data,
    });
};

export const getAssociatedTokenAccountAddress = async (
    owner: PublicKey,
    mint: PublicKey
) => {
    return (
        await PublicKey.findProgramAddress(
            [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            ASSOCIATED_PROGRAM_ID
        )
    )[0];
};
