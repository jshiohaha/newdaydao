const anchor = require("@project-serum/anchor");
import { BN, Program } from "@project-serum/anchor";
import { Connection, Commitment, clusterApiUrl } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, Token, MintLayout } from "@solana/spl-token";

import * as assert from "assert";
import { expect } from "chai";

import {
    getAuctionAccountAddress,
    getAuthorAccount,
    getAuctionFactoryAccountAddress,
    getTokenWallet,
    getMetadata,
    getMasterEdition,
    getCardTokenAccount,
    createAssociatedTokenAccountInstruction
} from "./helpers";
import {
    TOKEN_METADATA_PROGRAM_ID,
} from "./utils";

import { AuctionFactory as AuctionFactoryProgram } from "../target/types/auction_factory";
import { AUX_FAX_SEED, AUX_SEED } from "../app/src/utils/constants";

const myWallet = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(
        JSON.parse(
            require("fs").readFileSync(
                "/Users/jacobshiohira/.config/solana/id.json",
                "utf8"
            )
        )
    )
);

const printAccountInfo = async (account: any, a: any) => {
    console.log("account: ", await account.fetch(a));
};

const expectThrowsAsync = async (method, errorMessage = undefined) => {
    let error = null;
    try {
        await method();
    } catch (err) {
        error = err;
    }
    expect(error).to.be.an("Error");
    if (errorMessage) {
        expect(error.message).to.equal(errorMessage);
    }
};

describe("auction factory", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.Provider.env();
    anchor.setProvider(provider);

    const commitment: Commitment = "processed";
    const connection = new Connection(clusterApiUrl('devnet'), commitment);

    const program = anchor.workspace
        .AuctionFactory as Program<AuctionFactoryProgram>;
    // const authority_account = anchor.web3.Keypair.generate();

    let auctionFactoryAddress = null;
    let auctionFactoryBump = null;
    let auctionFactoryAuthority = null;

    let auctionAddress = null;
    let auctionBump = null;

    it("initialize auction factory", async () => {
        const [afAddress, afBump] = await getAuctionFactoryAccountAddress(
            myWallet.publicKey
        );

        auctionFactoryAddress = afAddress;
        auctionFactoryBump = afBump;

        await program.rpc.initializeAuctionFactory(
            auctionFactoryBump,
            {
                duration: new anchor.BN(50000), // 5 seconds
                timeBuffer: new anchor.BN(10), // 5 seconds, currently unused
                minBidPercentageIncrease: new anchor.BN(2), // percentage points
                minReservePrice: new anchor.BN(0),
            },
            {
                accounts: {
                    auctionFactory: auctionFactoryAddress,
                    authority: myWallet.publicKey,
                    payer: myWallet.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                },
                signers: [myWallet],
            }
        );
    });

    it("attempt to create first auction while auction factory is inactive", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 0);

        const [auxAddress, auxBump] = await getAuctionAccountAddress(
            auctionFactoryAccount.sequence.toNumber(),
            myWallet.publicKey
        );

        auctionAddress = auxAddress;
        auctionBump = auxBump;

        expectThrowsAsync(() => {
            program.rpc.initializeAuction(
                // createNextAuction
                auxBump,
                auctionFactoryAccount.sequence,
                {
                    accounts: {
                        auctionFactory: auctionFactoryAddress,
                        authority: auctionFactoryAccount.authority,
                        payer: myWallet.publicKey,
                        auction: auctionAddress,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    },
                    signers: [myWallet],
                }
            );
        });

        auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 0);
    });

    // it("non-authority attempts to modify auction factory", async () => {
    //     const fake_authority = anchor.web3.Keypair.generate();

    //     expectThrowsAsync(() => {
    //         program.rpc.modifyAuctionFactory({
    //             accounts: {
    //                 auctionFactory: auctionFactoryAddress,
    //                 payer: fake_authority.publicKey,
    //             },
    //             signers: [fake_authority],
    //         });
    //     });

    //     let auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );
    //     assert.ok(auctionFactoryAccount.isActive === false);
    // });

    it("activate auction factory", async () => {
        await program.rpc.modifyAuctionFactory({
            accounts: {
                auctionFactory: auctionFactoryAddress,
                payer: myWallet.publicKey,
            },
            signers: [myWallet],
        });

        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );
        assert.ok(auctionFactoryAccount.isActive === true);
    });

    it("initialize first auction", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 0);

        await program.rpc.initializeAuction(
            auctionBump,
            auctionFactoryAccount.sequence,
            {
                accounts: {
                    auctionFactory: auctionFactoryAddress,
                    authority: auctionFactoryAccount.authority,
                    payer: myWallet.publicKey,
                    auction: auctionAddress,
                    systemProgram: anchor.web3.SystemProgram.programId,
                },
                signers: [myWallet],
            }
        );

        auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);
    });


    it("supply resource for auction", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );

        let auctionAccount = await program.account.auction.fetch(
            auctionAddress
        );

        const payer = myWallet.publicKey;
        // const payer = payer;

        const mint = anchor.web3.Keypair.generate();
        const token = await getTokenWallet(payer, mint.publicKey);
        const metadata = await getMetadata(mint.publicKey);
        const masterEdition = await getMasterEdition(mint.publicKey);

        // let token = await getCardTokenAccount(
        //     auctionAddress,
        //     mint.publicKey
        // );

        const rent = await connection.getMinimumBalanceForRentExemption(
            MintLayout.span
        );

        console.log('payer: ', payer.toString());
        console.log('mint: ', mint.publicKey.toString());
        console.log('auction: ', auctionAddress.toString());
        console.log('auctionFactory: ', auctionFactoryAddress.toString());

        // const seeds = new Uint8Array(
        //     Buffer.from(AUX_FAX_SEED),
        //     ...auctionFactoryAccount.authority.toBytes(),
        //     // Buffer.from(auctionFactoryAccount.sequence.toNumber().toString()),
        // );

        await program.rpc.supplyResourceForAuction(
            {
                accounts: {
                    payer: payer,
                    auction: auctionAddress,
                    auctionFactory: auctionFactoryAddress,
                    metadata,
                    masterEdition,
                    mint: mint.publicKey,
                    mintTokenAccount: token,
                    tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                },
                // TODO: figure out how to mint to the auction address PDA
                instructions: [
                    // // Give authority enough to pay off the cost of the nft!
                    // // it'll be funnneled right back
                    // anchor.web3.SystemProgram.transfer({
                    //     fromPubkey: payer,
                    //     toPubkey: auctionAddress, // this.authority.publicKey,
                    //     lamports: 10000000, // add minting fees in there
                    // }),
                    // // NOTE: can embed custom program instructions here... useful for creating
                    // // a token account for the auction and then minting directly there?
                    // // program.instruction.createLeaderboard(leaderboardBump, {
                    // //     accounts: {
                    // //     initializer: authority.publicKey,
                    // //     leaderboard: leaderboard,
                    // //     systemProgram: SystemProgram.programId,
                    // //     },
                    // // }),
                    //create token mint account for member card nft
                    anchor.web3.SystemProgram.createAccount({
                      fromPubkey: payer, // mintConfig.authority
                      newAccountPubkey: mint.publicKey,
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
                      mint.publicKey,
                      0,
                      payer,
                      payer
                    ),
                    //create token account for new member card
                    createAssociatedTokenAccountInstruction(
                      mint.publicKey,
                      token,
                      payer, // owner
                      payer // payer
                    ),
                    // Token.createMintToInstruction(
                    //     TOKEN_PROGRAM_ID,
                    //     mint.publicKey,
                    //     token,
                    //     payer,
                    //     [],
                    //     1
                    //   ),
                ],
                signers: [mint], // TODO; myWallet?
            }
        );

        // auctionFactoryAccount = await program.account.auctionFactory.fetch(
        //     auctionFactoryAddress
        // );
        // assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);
    });

    // return await program.rpc.mintNft({
    //     accounts: {
    //       config,
    //       candyMachine: candyMachine.id,
    //       payer: payer,
    //       wallet: treasury,
    //       mint: mint.publicKey,
    //       metadata,
    //       masterEdition,
    //       mintAuthority: payer,
    //       updateAuthority: payer,
    //       tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    //       tokenProgram: TOKEN_PROGRAM_ID,
    //       systemProgram: anchor.web3.SystemProgram.programId,
    //       rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    //       clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
    //     },

    //   });
    // }





    // it("attempt to initialize first auction again, and fail 😈", async () => {
    //     let auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );
    //     assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);

    //     expectThrowsAsync(() => {
    //         program.rpc.initializeAuction(
    //             auctionBump,
    //             auctionFactoryAccount.sequence,
    //             {
    //                 accounts: {
    //                     auctionFactory: auctionFactoryAddress,
    //                     authority: auctionFactoryAccount.authority,
    //                     payer: myWallet.publicKey,
    //                     auction: auctionAddress,
    //                     systemProgram: anchor.web3.SystemProgram.programId,
    //                 },
    //                 signers: [myWallet],
    //             }
    //         );
    //     });

    //     auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );
    //     assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);
    // });

    // it("attempt to create a new auction during an active auction, and fail 😈", async () => {
    //     let auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );
    //     assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);

    //     const [auxAddress2, auxBump2] = await getAuctionAccountAddress(
    //         auctionFactoryAccount.sequence.toNumber(),
    //         myWallet.publicKey
    //     );

    //     expectThrowsAsync(() => {
    //         program.rpc.createNextAuction(
    //             auxBump2,
    //             auctionFactoryAccount.sequence,
    //             {
    //                 accounts: {
    //                     auctionFactory: auctionFactoryAddress,
    //                     authority: auctionFactoryAccount.authority,
    //                     payer: myWallet.publicKey,
    //                     currentAuction: auctionAddress,
    //                     nextAuction: auxAddress2,
    //                     systemProgram: anchor.web3.SystemProgram.programId,
    //                 },
    //                 signers: [myWallet],
    //             }
    //         );
    //     });

    //     auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );
    //     assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);
    // });

    // it("place valid bid", async () => {
    //     let auctionAccount = await program.account.auction.fetch(
    //         auctionAddress
    //     );
    
    //     const bidAmountInLamports = 100;

    //     const balanceBefore = await connection.getBalance(auctionAddress);

    //     await program.rpc.placeBid(new anchor.BN(bidAmountInLamports), {
    //         accounts: {
    //             bidder: myWallet.publicKey,
    //             leadingBidder: anchor.web3.PublicKey.default,
    //             auctionFactory: auctionFactoryAddress,
    //             auction: auctionAddress,
    //             systemProgram: anchor.web3.SystemProgram.programId,
    //         },
    //         signers: [myWallet],
    //     });

    //     auctionAccount = await program.account.auction.fetch(
    //         auctionAddress
    //     );

    //     const balanceAfter = await connection.getBalance(auctionAddress);

    //     console.log('before: ', balanceBefore);
    //     console.log('after: ', balanceAfter);

    //     // assert.ok(balanceAfter > balanceBefore);
    // });

    // it("winner bidder attempts to place another bid, but fails 😈", async () => {
    //     const bidAmountInLamports = 105;

    //     let auctionAccount = await program.account.auction.fetch(
    //         auctionAddress
    //     );

    //     expectThrowsAsync(() => {
    //         program.rpc.placeBid(new anchor.BN(bidAmountInLamports), {
    //             accounts: {
    //                 bidder: myWallet.publicKey,
    //                 leadingBidder: auctionAccount.bidder,
    //                 auctionFactory: auctionFactoryAddress,
    //                 auction: auctionAddress,
    //                 systemProgram: anchor.web3.SystemProgram.programId,
    //             },
    //             signers: [myWallet],
    //         });
    //     });
    // });

    // // place invalid bid, not big enough % diff
    // it("new bidder attempts to place another bid, but fails due to invalid bid amount 😈", async () => {
    //     const bidAmountInLamports = 101;

    //     let auctionAccount = await program.account.auction.fetch(
    //         auctionAddress
    //     );

    //     const new_bidder = anchor.web3.Keypair.generate();

    //     expectThrowsAsync(() => {
    //         program.rpc.placeBid(new anchor.BN(bidAmountInLamports), {
    //             accounts: {
    //                 bidder: new_bidder.publicKey,
    //                 leadingBidder: auctionAccount.bidder,
    //                 auctionFactory: auctionFactoryAddress,
    //                 auction: auctionAddress,
    //                 systemProgram: anchor.web3.SystemProgram.programId,
    //             },
    //             signers: [new_bidder],
    //         });
    //     });
    // });

    // expect resource to be transferred to owner
    // it("settle auction", async () => {});

    // done
});
