import * as anchor from "@project-serum/anchor";
import {
    PublicKey,
    SystemProgram,
    TransactionInstruction,
    SYSVAR_RENT_PUBKEY,
    Keypair
} from "@solana/web3.js";
import { Program } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID, Token, MintLayout } from "@solana/spl-token";

import { PdaConfig, AuctionsData } from "./types";
import {
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
} from "./constants";
import { getCurrentAuctionFactorySequence } from './helpers';
import { AuctionFactory as AuctionFactoryProgram } from "../target/types/auction_factory";

export const createAssociatedTokenAccountIxns = (
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
        programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
        data: Buffer.alloc(0),
    });
};

export const generateMintIxns = async (
    program: Program<AuctionFactoryProgram>,
    payer: PublicKey,
    mint: PublicKey,
    token_account: PublicKey,
    owner: PublicKey,
    auctionFactoryAddress: PublicKey,
    auctionFactoryBump: any,
    uuid: string,
    afSequence: number,
    auctionAddress: PublicKey,
    auctionBump: any
) => {
    return [
        SystemProgram.createAccount({
            fromPubkey: payer,
            newAccountPubkey: mint,
            space: MintLayout.span,
            lamports:
                await program.provider.connection.getMinimumBalanceForRentExemption(
                    MintLayout.span
                ),
            programId: TOKEN_PROGRAM_ID,
        }),
        //init the mint
        Token.createInitMintInstruction(
            TOKEN_PROGRAM_ID,
            mint,
            0,
            owner,
            owner
        ),
        // create token account for new token
        createAssociatedTokenAccountIxns(
            mint,
            token_account,
            owner, // owner
            payer // payer
        ),
        program.instruction.mintToAuction(
            auctionFactoryBump,
            uuid,
            auctionBump,
            new anchor.BN(afSequence),
            {
                accounts: {
                    mint: mint,
                    tokenMintAccount: token_account,
                    auctionFactory: auctionFactoryAddress,
                    auction: auctionAddress,
                    tokenProgram: TOKEN_PROGRAM_ID,
                },
            }
        ),
    ];
};

export const buildCreateAuctionIxn = async (
    program: Program<AuctionFactoryProgram>,
    wallet: Keypair,
    auctionFactory: PdaConfig,
    uuid: String,
    auctionsData: AuctionsData
) => {
    const auctionFactoryAccount = await program.account.auctionFactory.fetch(
        auctionFactory.address
    );

    if (auctionsData.nextAuction === undefined) {
        return await program.instruction.createFirstAuction(
            auctionFactory.bump,
            uuid,
            auctionsData.currentAuctionBump,
            auctionFactoryAccount.sequence, // first auction sequence == 0
            {
                accounts: {
                    payer: wallet.publicKey,
                    auctionFactory: auctionFactory.address,
                    auction: auctionsData.currentAuction,
                    systemProgram: SystemProgram.programId,
                },
                signers: [wallet],
            }
        );
    }

    const currentSequence = await getCurrentAuctionFactorySequence(
        program,
        auctionFactory.address
    );

    return await program.instruction.createNextAuction(
        auctionFactory.bump,
        uuid,
        auctionsData.currentAuctionBump,
        auctionsData.nextAuctionBump,
        new anchor.BN(currentSequence),
        auctionFactoryAccount.sequence,
        {
            accounts: {
                payer: wallet.publicKey,
                auctionFactory: auctionFactory.address,
                currentAuction: auctionsData.currentAuction,
                nextAuction: auctionsData.nextAuction,
                systemProgram: SystemProgram.programId,
            },
            signers: [wallet],
        }
    );
};