import * as anchor from "@project-serum/anchor";
import {
    PublicKey,
    SystemProgram,
    TransactionInstruction,
    Keypair,
    SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { Program } from "@project-serum/anchor";
import * as assert from "assert";
import * as lodash from 'lodash';

import { TOKEN_PROGRAM_ID, Token, MintLayout } from "@solana/spl-token";

import { PdaConfig, AuctionsData, Network } from './types';
import {
    AUX_FACTORY_PROGRAM_ID,
    AUX_SEED,
    AUX_FAX_SEED,
    TOKEN_METADATA_PROGRAM_ID,
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    URI_CONFIG_SEED,
    DEFAULT_ALPHABET,
} from "./utils";

import { AuctionFactory as AuctionFactoryProgram } from "../target/types/auction_factory";

export const sleep = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getAuctionFactoryAccountAddress = async (authority: PublicKey) => {
    return await PublicKey.findProgramAddress(
        [
            anchor.utils.bytes.utf8.encode(AUX_FAX_SEED), authority.toBytes()],
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

// maybe we should allow to chnage config
export const getConfigAddress = async (
    // authority: PublicKey
) => {
    return await PublicKey.findProgramAddress(
        [anchor.utils.bytes.utf8.encode(URI_CONFIG_SEED)],
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

export const getRandomCharFromAlphabet = (alphabet: string) => {
    return alphabet.charAt(Math.floor(Math.random() * alphabet.length));
};

// https://stackoverflow.com/a/55837120
export const generateId = (
    idDesiredLength: number,
    alphabet = DEFAULT_ALPHABET
) => {
    /**
     * Create n-long array and map it to random chars from given alphabet.
     * Then join individual chars as string
     */
    return Array.from({ length: idDesiredLength })
        .map(() => {
            return getRandomCharFromAlphabet(alphabet);
        })
        .join("");
};

export const generateConfigs = (
    n: number,
    configLen: number = 10
) => {
    return Array(n).fill(0).map((_el,_idx) => generateId(configLen));
}

// =============================

export const getAccountBalance = async (
    program: Program<AuctionFactoryProgram>,
    address: PublicKey
) => {
    return await program.provider.connection.getBalance(address);
};

export const logAuctionAccountData = async (
    program: Program<AuctionFactoryProgram>,
    auction: PublicKey
) => {
    const auctionAccount = await program.account.auction.fetch(auction);

    console.log("===== [AUCTION] ======");
    console.log("sequence: ", auctionAccount.sequence.toNumber());
    console.log("authority: ", auctionAccount.authority.toString());
    console.log("startTime: ", auctionAccount.startTime.toNumber());
    console.log("endTime: ", auctionAccount.endTime.toNumber());
    console.log(
        "finalizedEndTime: ",
        auctionAccount.finalizedEndTime.toNumber()
    );
    console.log("settled: ", auctionAccount.settled);
    console.log("amount: ", auctionAccount.amount.toNumber());
    console.log("bidder: ", auctionAccount.bidder.toString());
    console.log("bidTime: ", auctionAccount.bidTime.toNumber());
    console.log("resource: ", auctionAccount.resource.toString());
};

export const getAuctionAccountData = async (
    program: Program<AuctionFactoryProgram>,
    auctionFactory: PdaConfig
): Promise<AuctionsData> => {
    const auctionFactoryAccount = await program.account.auctionFactory.fetch(
        auctionFactory.address
    );

    const currentSequence = await getCurrentAuctionFactorySequence(
        program,
        auctionFactory.address
    );

    const [auctionAddress, auctionBump] = await getAuctionAccountAddress(
        currentSequence,
        auctionFactoryAccount.authority
    );

    if (auctionFactoryAccount.sequence.toNumber() === 0) {
        return {
            currentAuction: auctionAddress,
            currentAuctionBump: auctionBump,
            nextAuction: undefined,
            nextAuctionBump: undefined,
        } as AuctionsData;
    }

    // console.log('currentSequence: ', currentSequence);
    // console.log('auctionFactoryAccount.sequence: ', auctionFactoryAccount.sequence.toNumber());

    const [nextAuctionAddress, nextAuctionBump] = await getAuctionAccountAddress(
        auctionFactoryAccount.sequence.toNumber(),
        auctionFactoryAccount.authority
    );

    return {
        currentAuction: auctionAddress,
        currentAuctionBump: auctionBump,
        nextAuction: nextAuctionAddress,
        nextAuctionBump: nextAuctionBump,
    };
}

export const getCreateAccountIxn = async (
    program: Program<AuctionFactoryProgram>,
    wallet: Keypair,
    auctionFactory: PdaConfig,
    auctionsData: AuctionsData
) => {
    const auctionFactoryAccount = await program.account.auctionFactory.fetch(
        auctionFactory.address
    );

    if (auctionsData.nextAuction === undefined) {
        return await program.instruction.createFirstAuction(
            auctionFactory.bump,
            auctionsData.currentAuctionBump,
            auctionFactoryAccount.sequence, // first auction sequence == 0
            {
                accounts: {
                    payer: wallet.publicKey,
                    auctionFactory: auctionFactory.address,
                    authority: auctionFactoryAccount.authority,
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
        auctionsData.currentAuctionBump,
        auctionsData.nextAuctionBump,
        new anchor.BN(currentSequence),
        auctionFactoryAccount.sequence,
        {
            accounts: {
                payer: wallet.publicKey,
                auctionFactory: auctionFactory.address,
                authority: auctionFactoryAccount.authority,
                currentAuction: auctionsData.currentAuction,
                nextAuction: auctionsData.nextAuction,
                systemProgram: SystemProgram.programId,
            },
            signers: [wallet],
        }
    );
}

export const generate_supply_resource_accounts = async (
    program: Program<AuctionFactoryProgram>,
    payer: PublicKey,
    config: PublicKey,
    auctionFactory: PublicKey,
    auction: PublicKey,
    mintAccounts: any,
) => {
    const auctionFactoryAccount = await program.account.auctionFactory.fetch(
        auctionFactory
    );

    return {
        payer,
        config,
        authority: auctionFactoryAccount.authority,
        auction,
        auctionFactory,
        metadata: mintAccounts.metadata,
        masterEdition: mintAccounts.masterEdition,
        mint: mintAccounts.mint.publicKey,
        auctionTokenAccount: mintAccounts.tokenAccount,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
    } as any;
}

export const logSupplyResourceData = async (
    program: Program<AuctionFactoryProgram>,
    auctionAddress: PublicKey,
    auctionFactoryAddress: PublicKey,
    mintAccounts: any
) => {
    const auctionFactoryAccount = await program.account.auctionFactory.fetch(
        auctionFactoryAddress
    );

    console.log(
        "================ SUPPLY RESOURCE FOR AUCTION ================"
    );
    console.log("metadata: ", mintAccounts.metadata.toString());
    console.log("master edition: ", mintAccounts.masterEdition.toString());
    console.log(
        "mint key: ",
        mintAccounts.mint.publicKey.toString()
    );
    console.log(
        "auction token account: ",
        mintAccounts.tokenAccount.toString()
    );
    console.log("auction: ", auctionAddress.toString());
    console.log("auction factory ", auctionFactoryAddress.toString());
    console.log(
        "auction factory sequence ",
        auctionFactoryAccount.sequence.toNumber()
    );
    console.log(
        "============================================================"
    );
}

export const getAuctionData = (
    auctionsData: AuctionsData
): PdaConfig => {
    return auctionsData.nextAuction === undefined
        ? (
            {
                address: auctionsData.currentAuction,
                bump: auctionsData.currentAuctionBump
            }
        ) : (
            {
                address: auctionsData.nextAuction,
                bump: auctionsData.nextAuctionBump
            }
        )
}

export const waitForAuctionToEnd = async (
    program: Program<AuctionFactoryProgram>,
    auction: PublicKey
) => {
    let auctionAccount = await program.account.auction.fetch(
        auction
    );

    // loop until auction is over
    let currentTimestamp = new Date().getTime() / 1000;
    const auctionEndTime = auctionAccount.endTime.toNumber();
    for (;;) {
        await sleep(3 * 1000); // sleep for 3 seconds at a time, until auction is over

        if (currentTimestamp >= auctionEndTime) {
            break;
        }
        currentTimestamp = new Date().getTime() / 1000;
    }

    assert.ok(currentTimestamp >= auctionEndTime);

    return;
}

export const getAnchorEnv = () => {
    const providerUrl = process.env.ANCHOR_PROVIDER_URL;

    if (lodash.includes(providerUrl, 'testnet')) {
        return Network.Testnet
    } else if (lodash.includes(providerUrl, 'devnet')) {
        return Network.Devnet;
    } else if (lodash.includes(providerUrl, 'mainnet')) {
        return Network.Mainnet;
    } else {
        return Network.Localnet;
    }
};