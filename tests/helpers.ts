import { PublicKey } from "@solana/web3.js";
import { Program } from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import IDL from "../target/idl/auction_factory.json";
import { AuctionFactory } from "../target/types/auction_factory";

import { TOKEN_PROGRAM_ID, Token, MintLayout } from "@solana/spl-token";

import {
    AUX_FACTORY_PROGRAM_ID,
    AUX_SEED,
    AUX_FAX_SEED,
    TOKEN_METADATA_PROGRAM_ID,
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    AUX_TREASURY_SEED
} from "./utils";

import { AuctionFactory as AuctionFactoryProgram } from "../target/types/auction_factory";

export const sleep = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const getAuctionFactoryAccountAddress = async (
    authority: anchor.web3.PublicKey
) => {
    return await PublicKey.findProgramAddress(
        [anchor.utils.bytes.utf8.encode(AUX_FAX_SEED), authority.toBytes()],
        AUX_FACTORY_PROGRAM_ID
    );
};

export const getAuctionAccountAddress = async (
    sequence: number,
    authority: anchor.web3.PublicKey
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

export const getMasterEdition = async (
    mint: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> => {
    return (
        await anchor.web3.PublicKey.findProgramAddress(
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

export const getMetadata = async (
    mint: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> => {
    return (
        await anchor.web3.PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("metadata"),
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
        data: Buffer.alloc(0),
    });
};

////////

export const getAuthorAccount = async (user: PublicKey) => {
    const [authorAccount, bump] =
        await anchor.web3.PublicKey.findProgramAddress(
            [anchor.utils.bytes.utf8.encode("author"), user.toBytes()],
            AUX_FACTORY_PROGRAM_ID
        );

    return { bump, authorAccount };
};

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
    )
};

export const getTokenMintAccount = async (owner: PublicKey, cardMint: PublicKey) => {
    return await getAssociatedTokenAccountAddress(owner, cardMint);
};


export const generate_mint_ixns = async (
    program: Program<AuctionFactoryProgram>,
    payer: anchor.web3.PublicKey,
    mint: anchor.web3.PublicKey,
    token_account: anchor.web3.PublicKey,
    owner: anchor.web3.PublicKey,
) => {
    return [
        anchor.web3.SystemProgram.createAccount({
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
        program.instruction.mintToAuction({
            accounts: {
                auction: owner,
                mint: mint,
                tokenMintAccount: token_account,
                tokenProgram: TOKEN_PROGRAM_ID,
            },
        }),
    ];
}

export const generate_mint_accounts = async (
    auction: anchor.web3.PublicKey,
) => {
    const mint = anchor.web3.Keypair.generate();
    const metadata = await getMetadata(mint.publicKey);
    const masterEdition = await getMasterEdition(mint.publicKey);
    const [tokenAccount, bump] = await getTokenMintAccount(auction, mint.publicKey);

    return {
        mint,
        metadata,
        masterEdition,
        tokenAccount,
        tokenAccountBump: bump
    }
}

export const getAuctionTreasuryAddress = async (
    auction: anchor.web3.PublicKey,
    auctionFactory: anchor.web3.PublicKey
) => {
    return await PublicKey.findProgramAddress(
        [
            anchor.utils.bytes.utf8.encode(AUX_TREASURY_SEED),
            auction.toBytes(),
            auctionFactory.toBytes()
        ],
        AUX_FACTORY_PROGRAM_ID
    );
};