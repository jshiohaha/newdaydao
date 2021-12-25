import * as anchor from "@project-serum/anchor";
import {
    PublicKey,
    SystemProgram,
    TransactionInstruction,
    Keypair,
    SYSVAR_RENT_PUBKEY
} from "@solana/web3.js";
import { Program } from "@project-serum/anchor";

import { TOKEN_PROGRAM_ID, Token, MintLayout } from "@solana/spl-token";

import {
    AUX_FACTORY_PROGRAM_ID,
    AUX_SEED,
    AUX_FAX_SEED,
    TOKEN_METADATA_PROGRAM_ID,
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
} from "./utils";

import { AuctionFactory as AuctionFactoryProgram } from "../target/types/auction_factory";

export const sleep = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getAuctionFactoryAccountAddress = async (authority: PublicKey) => {
    return await PublicKey.findProgramAddress(
        [anchor.utils.bytes.utf8.encode(AUX_FAX_SEED), authority.toBytes()],
        AUX_FACTORY_PROGRAM_ID
    );
};

export const getAuctionAccountAddress = async (
    sequence: number,
    authority: PublicKey
) => {
    return await PublicKey.findProgramAddress(
        [
            anchor.utils.bytes.utf8.encode(AUX_SEED),
            authority.toBytes(),
            anchor.utils.bytes.utf8.encode(sequence.toString()),
        ],
        AUX_FACTORY_PROGRAM_ID
    );
};

export const getMasterEdition = async (mint: PublicKey): Promise<PublicKey> => {
    return (
        await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("metadata"),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mint.toBuffer(),
                anchor.utils.bytes.utf8.encode("edition"),
            ],
            TOKEN_METADATA_PROGRAM_ID
        )
    )[0];
};

export const getMetadata = async (mint: PublicKey): Promise<PublicKey> => {
    return (
        await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("metadata"),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mint.toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
        )
    )[0];
};

export const getTokenWallet = async (wallet: PublicKey, mint: PublicKey) => {
    return (
        await PublicKey.findProgramAddress(
            [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
        )
    )[0];
};

export const createAssociatedTokenAccountInstruction = (
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

////////

export const getAuctionFactoryAuthority = () => {
    return PublicKey.findProgramAddress(
        [anchor.utils.bytes.utf8.encode("authority")],
        AUX_FACTORY_PROGRAM_ID
    );
};

export const getAssociatedTokenAccountAddress = async (
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

export const generate_mint_ixns = async (
    program: Program<AuctionFactoryProgram>,
    payer: PublicKey,
    mint: PublicKey,
    token_account: PublicKey,
    owner: PublicKey,
    auctionFactoryAddress: PublicKey,
    auctionFactoryBump: any,
    afAuthority: PublicKey,
    afSequence: number,
    auctionAddress: PublicKey,
    auctionBump: any
) => {
    return [
        SystemProgram.createAccount({
            fromPubkey: payer, // mintConfig.authority
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
        createAssociatedTokenAccountInstruction(
            mint,
            token_account,
            owner, // owner
            payer // payer
        ),
        program.instruction.mintToAuction(
            auctionFactoryBump,
            auctionBump,
            new anchor.BN(afSequence),
            {
                accounts: {
                    mint: mint,
                    authority: afAuthority,
                    tokenMintAccount: token_account,
                    auctionFactory: auctionFactoryAddress,
                    auction: auctionAddress,
                    tokenProgram: TOKEN_PROGRAM_ID,
                },
            }
        ),
    ];
};

export const generate_mint_accounts = async (auction: PublicKey) => {
    const mint = Keypair.generate();
    const metadata = await getMetadata(mint.publicKey);
    const masterEdition = await getMasterEdition(mint.publicKey);
    const [tokenAccount, bump] = await getTokenMintAccount(
        auction,
        mint.publicKey
    );

    return {
        mint,
        metadata,
        masterEdition,
        tokenAccount,
        tokenAccountBump: bump,
    };
};

export const getCurrentAuctionFactorySequence = async (
    program: Program<AuctionFactoryProgram>,
    auctionFactoryAddress: PublicKey
) => {
    const auctionFactoryAccount = await program.account.auctionFactory.fetch(
        auctionFactoryAddress
    );

    return Math.max(auctionFactoryAccount.sequence.toNumber() - 1, 0);
};
