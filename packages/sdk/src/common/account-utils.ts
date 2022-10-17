import * as anchor from "@project-serum/anchor";
import {
    Connection,
    PublicKey,
    SystemProgram,
    TransactionInstruction,
    SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID,
    Token,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { TOKEN_METADATA_PROGRAM_ID } from "./constant";

export interface ITokenData {
    tokenMint: PublicKey;
    tokenAcc: PublicKey;
    owner: PublicKey;
    token: Token;
}

export class AccountUtils {
    connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    }

    // ============================================================================
    // pda functions
    // ============================================================================

    findProgramAddress = async (
        programId: PublicKey,
        seeds: (PublicKey | Uint8Array | string)[]
    ): Promise<[PublicKey, number]> => {
        const seed_bytes = seeds.map((s) => {
            if (typeof s == "string") {
                return Buffer.from(s);
            } else if ("toBytes" in s) {
                return s.toBytes();
            } else {
                return s;
            }
        });

        return await PublicKey.findProgramAddress(seed_bytes, programId);
    };

    // ============================================================================
    // normal account functions
    // ============================================================================

    getBalance = async (publicKey: PublicKey): Promise<number> => {
        return this.connection.getBalance(publicKey);
    };

    getTokenBalance = async (
        publicKey: PublicKey
    ): Promise<anchor.web3.RpcResponseAndContext<anchor.web3.TokenAmount>> => {
        return this.connection.getTokenAccountBalance(publicKey);
    };

    // ============================================================================
    // associated token account functions
    // ============================================================================

    getAssociatedTokenAccountAddress = async (
        owner: PublicKey,
        mint: PublicKey
    ) => {
        return this.findProgramAddress(ASSOCIATED_TOKEN_PROGRAM_ID, [
            owner,
            TOKEN_PROGRAM_ID,
            mint,
        ]);
    };

    // ============================================================================
    // metadata token account functions
    // ============================================================================

    getMasterEdition = async (mint: PublicKey): Promise<PublicKey> => {
        return (
            await this.findProgramAddress(TOKEN_METADATA_PROGRAM_ID, [
                "metadata",
                TOKEN_METADATA_PROGRAM_ID,
                mint,
                "edition",
            ])
        )[0];
    };

    getMetadata = async (mint: PublicKey): Promise<PublicKey> => {
        return (
            await this.findProgramAddress(TOKEN_METADATA_PROGRAM_ID, [
                "metadata",
                TOKEN_METADATA_PROGRAM_ID,
                mint,
            ])
        )[0];
    };

    createAssociatedTokenAccount = (
        mint: PublicKey,
        associatedAccount: PublicKey,
        owner: PublicKey,
        payer: PublicKey
    ) => {
        let keys = [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: associatedAccount, isSigner: false, isWritable: true },
            { pubkey: owner, isSigner: false, isWritable: false },
            { pubkey: mint, isSigner: false, isWritable: false },
            {
                pubkey: SystemProgram.programId,
                isSigner: false,
                isWritable: false,
            },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            {
                pubkey: SYSVAR_RENT_PUBKEY,
                isSigner: false,
                isWritable: false,
            },
        ];
        return new TransactionInstruction({
            keys,
            programId: ASSOCIATED_TOKEN_PROGRAM_ID,
            data: Buffer.alloc(0),
        });
    };
}
