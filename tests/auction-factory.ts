import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
    PublicKey,
    SystemProgram,
    Keypair,
    SYSVAR_RENT_PUBKEY,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as assert from "assert";
import { expect } from "chai";

import {
    getAuctionAccountAddress,
    getAuctionFactoryAccountAddress,
    getMetadata,
    getTokenMintAccount,
    createAssociatedTokenAccountInstruction,
    generate_mint_ixns,
    generate_mint_accounts,
    sleep,
} from "./helpers";
import {
    TOKEN_METADATA_PROGRAM_ID,
    AUX_FACTORY_PROGRAM_ID,
    TOKEN_BURN_ADDRESS,
} from "./utils";
import { AuctionFactory as AuctionFactoryProgram } from "../target/types/auction_factory";

const provider = anchor.Provider.env();
anchor.setProvider(provider);

const program = anchor.workspace
    .AuctionFactory as Program<AuctionFactoryProgram>;

const myWallet = Keypair.fromSecretKey(
    new Uint8Array(
        JSON.parse(
            require("fs").readFileSync(
                "/Users/jacobshiohira/.config/solana/id.json",
                "utf8"
            )
        )
    )
);

const getAccountBalance = async (
    program: Program<AuctionFactoryProgram>,
    address: PublicKey
) => {
    return await program.provider.connection.getBalance(address);
};

const logAuctionAccountData = async (
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

// TODO
// no tests below test the scenario if someone tries to settle an auction
// without a resource, but this program invocation will immediately fail
// because of the anchor macros. they will prevent

// in the case of no bidders, create a token account for the auction factory / burn addrress

describe("execute basic auction factory functions", async () => {
    // warn: if this treasury has not been initialized, the settle auction test will fail
    // due to 0 lamport balance
    const treasury = Keypair.generate();
    const updatedTreasury = Keypair.generate();
    const bidder = Keypair.generate();

    const auctionFactoryAuthority = myWallet.publicKey;

    const [auctionFactoryAddress, auctionFactoryBump] =
        await getAuctionFactoryAccountAddress(auctionFactoryAuthority);

    const [auctionAddress, auctionBump] = await getAuctionAccountAddress(
        0,
        auctionFactoryAuthority
    );

    const durationInSeconds = 15;
    const timeBufferInSeconds = 2;
    const minBidPercentageIncrease = 1;
    const minReservePrice = 0;

    it("initialize auction factory", async () => {
        await program.rpc.initializeAuctionFactory(
            auctionFactoryBump,
            {
                duration: new anchor.BN(durationInSeconds),
                timeBuffer: new anchor.BN(timeBufferInSeconds), // currently unused
                minBidPercentageIncrease: new anchor.BN(
                    minBidPercentageIncrease
                ), // percentage points
                minReservePrice: new anchor.BN(minReservePrice),
            },
            {
                accounts: {
                    auctionFactory: auctionFactoryAddress,
                    payer: myWallet.publicKey,
                    treasury: treasury.publicKey,
                    systemProgram: SystemProgram.programId,
                },
                signers: [myWallet],
            }
        );
    });

    // it("attempt to create first auction while auction factory is inactive", async () => {
    //     let auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );
    //     assert.ok(auctionFactoryAccount.sequence.toNumber() === 0);

    //     expectThrowsAsync(async () => {
    //         await program.rpc.createFirstAuction(
    //             auctionBump,
    //             auctionFactoryAccount.sequence,
    //             {
    //                 accounts: {
    //                     auctionFactory: auctionFactoryAddress,
    //                     authority: auctionFactoryAccount.authority,
    //                     payer: myWallet.publicKey,
    //                     auction: auctionAddress,
    //                     systemProgram: SystemProgram.programId,
    //                 },
    //                 signers: [myWallet],
    //             }
    //         );
    //     });

    //     auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );
    //     assert.ok(auctionFactoryAccount.sequence.toNumber() === 0);
    // });

    it("activate auction factory", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );

        await program.rpc.toggleAuctionFactoryStatus(auctionFactoryBump, {
            accounts: {
                payer: myWallet.publicKey,
                auctionFactory: auctionFactoryAddress,
            },
            signers: [myWallet],
        });

        auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );
        assert.ok(auctionFactoryAccount.isActive === true);
    });

    // it("non-authority attempts to modify auction factory", async () => {
    //     const fake_authority = Keypair.generate();

    //     let auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );

    //     const status_before_program_invocation = auctionFactoryAccount.isActive;

    //     expectThrowsAsync(async () => {
    //         await program.rpc.toggleAuctionFactoryStatus(auctionFactoryBump, {
    //             accounts: {
    //                 payer: fake_authority.publicKey,
    //                 auctionFactory: auctionFactoryAddress,
    //             },
    //             signers: [fake_authority],
    //         });
    //     });

    //     auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );

    //     // verify status did not change
    //     assert.ok(
    //         status_before_program_invocation === auctionFactoryAccount.isActive
    //     );
    // });

    // it("modify auction factory data", async () => {
    //     const updatedMinReservePrice = 1;
    //     const updatedMinBidPercentageIncrease = 2;

    //     let auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );

    //     await program.rpc.modifyAuctionFactoryData(
    //         auctionFactoryBump,
    //         {
    //             duration: new anchor.BN(auctionFactoryAccount.data.duration),
    //             timeBuffer: new anchor.BN(
    //                 auctionFactoryAccount.data.timeBuffer
    //             ),
    //             minBidPercentageIncrease: new anchor.BN(
    //                 updatedMinBidPercentageIncrease
    //             ),
    //             minReservePrice: new anchor.BN(updatedMinReservePrice),
    //         },
    //         {
    //             accounts: {
    //                 payer: myWallet.publicKey,
    //                 auctionFactory: auctionFactoryAddress,
    //             },
    //             signers: [myWallet],
    //         }
    //     );

    //     auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );

    //     assert.ok(
    //         auctionFactoryAccount.data.minReservePrice.toNumber() ===
    //             updatedMinReservePrice
    //     );
    //     assert.ok(
    //         auctionFactoryAccount.data.minBidPercentageIncrease.toNumber() ===
    //             updatedMinBidPercentageIncrease
    //     );
    // });

    it("update auction factory treasury", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );

        await program.rpc.updateTreasury(auctionFactoryBump, {
            accounts: {
                payer: myWallet.publicKey,
                auctionFactory: auctionFactoryAddress,
                treasury: updatedTreasury.publicKey,
            },
            // ensure treasury account is initialized
            instructions: [
                SystemProgram.createAccount({
                    fromPubkey: myWallet.publicKey,
                    newAccountPubkey: updatedTreasury.publicKey,
                    space: 5,
                    lamports:
                        await provider.connection.getMinimumBalanceForRentExemption(
                            5
                        ),
                    programId: TOKEN_PROGRAM_ID,
                }),
            ],
            // we only provide treasury sig to create account. in "real" client side call,
            // user should only provide treasury that has been established.
            signers: [myWallet, updatedTreasury],
        });

        auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );

        assert.ok(
            auctionFactoryAccount.treasury.toString() ===
                updatedTreasury.publicKey.toString()
        );
    });

    it("initialize first auction", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );

        assert.ok(auctionFactoryAccount.sequence.toNumber() === 0);

        await program.rpc.createFirstAuction(
            auctionFactoryBump,
            auctionBump,
            new anchor.BN(0), // first auction sequence == 0
            {
                accounts: {
                    payer: myWallet.publicKey,
                    auctionFactory: auctionFactoryAddress,
                    authority: auctionFactoryAccount.authority,
                    auction: auctionAddress,
                    systemProgram: SystemProgram.programId,
                },
                signers: [myWallet],
            }
        );

        auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);
    });

    // it("attempt to initialize first auction again, and fail 😈", async () => {
    //     let auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );
    //     assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);

    //     expectThrowsAsync(async () => {
    //         await program.rpc.createFirstAuction(
    //             auctionFactoryBump,
    //             auctionBump,
    //             new anchor.BN(0), // first auction sequence == 0
    //             {
    //                 accounts: {
    //                     payer: myWallet.publicKey,
    //                     auctionFactory: auctionFactoryAddress,
    //                     authority: auctionFactoryAccount.authority,
    //                     auction: auctionAddress,
    //                     systemProgram: SystemProgram.programId,
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

    it("supply resource for auction", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );

        let auctionAccount = await program.account.auction.fetch(
            auctionAddress
        );

        assert.ok(auctionAccount.resource === null);

        const payer = myWallet.publicKey;
        const mintAccounts = await generate_mint_accounts(auctionAddress);

        console.log('================ SUPPLY RESOURCE FOR AUCTION ================');
        console.log('metadata: ', mintAccounts.metadata.toString());
        console.log('master edition: ', mintAccounts.masterEdition.toString());
        console.log('auction token account: ', mintAccounts.tokenAccount.toString());
        console.log('auction: ', auctionAddress.toString());
        console.log('auction factory ', auctionFactoryAddress.toString());
        console.log('============================================================');

        await program.rpc.supplyResourceToAuction(
            auctionFactoryBump,
            auctionBump,
            auctionAccount.sequence,
            {
                accounts: {
                    payer: payer,
                    authority: auctionFactoryAccount.authority,
                    auction: auctionAddress,
                    auctionFactory: auctionFactoryAddress,
                    metadata: mintAccounts.metadata,
                    masterEdition: mintAccounts.masterEdition,
                    mint: mintAccounts.mint.publicKey,
                    mintTokenAccount: mintAccounts.tokenAccount,
                    tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    rent: SYSVAR_RENT_PUBKEY,
                },
                instructions: await generate_mint_ixns(
                    program,
                    payer,
                    mintAccounts.mint.publicKey,
                    mintAccounts.tokenAccount,
                    auctionAddress,
                    auctionFactoryAddress,
                    auctionFactoryBump,
                    auctionFactoryAccount.authority,
                    auctionAccount.sequence.toNumber(),
                    auctionAddress,
                    auctionBump
                ),
                signers: [mintAccounts.mint],
            }
        );

        auctionAccount = await program.account.auction.fetch(auctionAddress);

        assert.ok(
            auctionAccount.resource.toString() ===
                mintAccounts.mint.publicKey.toString()
        );

        // verify auction token account actually has a token in it
        const auctionTokenAmount =
            await program.provider.connection.getTokenAccountBalance(
                mintAccounts.tokenAccount
            );
        assert.ok(+auctionTokenAmount["value"]["amount"] === 1);
    });

    // it("attempt to supply resource for auction again, and fail 😈", async () => {
    //     let auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );

    //     let auctionAccount = await program.account.auction.fetch(
    //         auctionAddress
    //     );

    //     const payer = myWallet.publicKey;
    //     const mintAccounts = await generate_mint_accounts(auctionAddress);

    //     expectThrowsAsync(async () => {
    //         await program.rpc.supplyResourceToAuction(
    //             auctionFactoryBump,
    //             auctionBump,
    //             auctionAccount.sequence,
    //             {
    //                 accounts: {
    //                     payer: payer,
    //                     authority: auctionFactoryAccount.authority,
    //                     auction: auctionAddress,
    //                     auctionFactory: auctionFactoryAddress,
    //                     metadata: mintAccounts.metadata,
    //                     masterEdition: mintAccounts.masterEdition,
    //                     mint: mintAccounts.mint.publicKey,
    //                     mintTokenAccount: mintAccounts.tokenAccount,
    //                     tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    //                     tokenProgram: TOKEN_PROGRAM_ID,
    //                     systemProgram: SystemProgram.programId,
    //                     rent: SYSVAR_RENT_PUBKEY,
    //                 },
    //                 instructions: await generate_mint_ixns(
    //                     program,
    //                     payer,
    //                     mintAccounts.mint.publicKey,
    //                     mintAccounts.tokenAccount,
    //                     auctionAddress,
    //                     auctionFactoryAddress,
    //                     auctionFactoryBump,
    //                     auctionFactoryAccount.authority,
    //                     auctionAccount.sequence.toNumber(),
    //                     auctionAddress,
    //                     auctionBump
    //                 ),
    //                 signers: [mintAccounts.mint],
    //             }
    //         );
    //     });
    // });

    // it("attempt to create a new auction during an active auction, and fail 😈", async () => {
    //     let auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );
    //     assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);

    //     let auctionAccount = await program.account.auction.fetch(
    //         auctionAddress
    //     );

    //     const [auctionAddress2, auctionBump2] = await getAuctionAccountAddress(
    //         auctionFactoryAccount.sequence.toNumber(),
    //         myWallet.publicKey
    //     );

    //     expectThrowsAsync(async () => {
    //         await program.rpc.createNextAuction(
    //             auctionFactoryBump,
    //             auctionBump,
    //             auctionBump2,
    //             auctionAccount.sequence,
    //             auctionFactoryAccount.sequence,
    //             {
    //                 accounts: {
    //                     payer: myWallet.publicKey,
    //                     authority: auctionFactoryAccount.authority,
    //                     auctionFactory: auctionFactoryAddress,
    //                     currentAuction: auctionAddress,
    //                     nextAuction: auctionAddress2,
    //                     systemProgram: SystemProgram.programId,
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

    it("place a valid bid", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );

        let auctionAccount = await program.account.auction.fetch(
            auctionAddress
        );

        const auctionBalanceBefore = await getAccountBalance(
            program,
            auctionAddress
        );
        const bidAmountInLamports = 100;

        await program.rpc.placeBid(
            auctionFactoryBump,
            auctionBump,
            auctionAccount.sequence,
            new anchor.BN(bidAmountInLamports),
            {
                accounts: {
                    bidder: bidder.publicKey,
                    authority: auctionFactoryAccount.authority,
                    leadingBidder: myWallet.publicKey,
                    auctionFactory: auctionFactoryAddress,
                    auction: auctionAddress,
                    systemProgram: SystemProgram.programId,
                },
                instructions: [
                    SystemProgram.transfer({
                        fromPubkey: myWallet.publicKey,
                        toPubkey: bidder.publicKey,
                        lamports: bidAmountInLamports * 1.5,
                    }),
                ],
                signers: [bidder],
            }
        );

        const auctionBalanceAfter = await getAccountBalance(
            program,
            auctionAddress
        );

        assert.ok(auctionBalanceAfter > auctionBalanceBefore);
    });

    // it("current winning bidder attempts to place another bid, but fails since bidder is already winning", async () => {
    //     let auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );

    //     let auctionAccount = await program.account.auction.fetch(
    //         auctionAddress
    //     );

    //     const bidAmountInLamports = 105;

    //     expectThrowsAsync(async () => {
    //         await program.rpc.placeBid(
    //             auctionFactoryBump,
    //             auctionBump,
    //             auctionAccount.sequence,
    //             new anchor.BN(bidAmountInLamports),
    //             {
    //                 accounts: {
    //                     bidder: bidder.publicKey,
    //                     leadingBidder: auctionAccount.bidder,
    //                     authority: auctionFactoryAccount.authority,
    //                     auctionFactory: auctionFactoryAddress,
    //                     auction: auctionAddress,
    //                     systemProgram: SystemProgram.programId,
    //                 },
    //                 signers: [bidder],
    //             }
    //         );
    //     });
    // });

    // it("place another valid bid", async () => {
    //     let auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );

    //     let auctionAccount = await program.account.auction.fetch(
    //         auctionAddress
    //     );

    //     const auctionBalanceBefore = await getAccountBalance(
    //         program,
    //         auctionAddress
    //     );

    //     const leadingBidAmount = auctionAccount.amount.toNumber();

    //     const bidAmountInLamports = 102;

    //     await program.rpc.placeBid(
    //         auctionFactoryBump,
    //         auctionBump,
    //         auctionAccount.sequence,
    //         new anchor.BN(bidAmountInLamports),
    //         {
    //             accounts: {
    //                 bidder: myWallet.publicKey,
    //                 leadingBidder: auctionAccount.bidder,
    //                 authority: auctionFactoryAccount.authority,
    //                 auctionFactory: auctionFactoryAddress,
    //                 auction: auctionAddress,
    //                 systemProgram: SystemProgram.programId,
    //             },
    //             signers: [myWallet],
    //         }
    //     );

    //     const auctionBalanceAfter = await getAccountBalance(
    //         program,
    //         auctionAddress
    //     );

    //     assert.ok(
    //         auctionBalanceAfter - auctionBalanceBefore ===
    //             bidAmountInLamports - leadingBidAmount
    //     );
    // });

    // // place invalid bid, not big enough % diff
    // it("new bidder attempts to place another bid, but fails due to invalid bid amount 😈", async () => {
    //     let auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );

    //     let auctionAccount = await program.account.auction.fetch(
    //         auctionAddress
    //     );

    //     const bidAmountInLamports = 103;

    //     const new_bidder = Keypair.generate();

    //     expectThrowsAsync(async () => {
    //         await program.rpc.placeBid(
    //             auctionFactoryBump,
    //             auctionBump,
    //             auctionAccount.sequence,
    //             new anchor.BN(bidAmountInLamports),
    //             {
    //                 accounts: {
    //                     bidder: new_bidder.publicKey,
    //                     leadingBidder: auctionAccount.bidder,
    //                     authority: auctionFactoryAccount.authority,
    //                     auctionFactory: auctionFactoryAddress,
    //                     auction: auctionAddress,
    //                     systemProgram: SystemProgram.programId,
    //                 },
    //                 instructions: [
    //                     SystemProgram.transfer({
    //                         fromPubkey: myWallet.publicKey,
    //                         toPubkey: new_bidder.publicKey,
    //                         lamports: bidAmountInLamports * 1.5,
    //                     }),
    //                 ],
    //                 signers: [new_bidder],
    //             }
    //         );
    //     });
    // });

    it("spin until auction can be settled", async () => {
        let auctionAccount = await program.account.auction.fetch(
            auctionAddress
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
    });

    // it("attempt to place a valid bid after auction is over", async () => {
    //     let auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );

    //     let auctionAccount = await program.account.auction.fetch(
    //         auctionAddress
    //     );

    //     const winningAmountBeforeBidAttempt = auctionAccount.amount.toNumber();
    //     const winningBidderBeforeBidAttempt = auctionAccount.bidder.toString();

    //     const bidAmountInLamports = 110;
    //     const outOfTimeBidder = Keypair.generate();

    //     expectThrowsAsync(async () => {
    //         await program.rpc.placeBid(
    //             auctionFactoryBump,
    //             auctionBump,
    //             auctionAccount.sequence,
    //             new anchor.BN(bidAmountInLamports),
    //             {
    //                 accounts: {
    //                     bidder: outOfTimeBidder.publicKey,
    //                     authority: auctionFactoryAccount.authority,
    //                     leadingBidder: myWallet.publicKey,
    //                     auctionFactory: auctionFactoryAddress,
    //                     auction: auctionAddress,
    //                     systemProgram: SystemProgram.programId,
    //                 },
    //                 instructions: [
    //                     SystemProgram.transfer({
    //                         fromPubkey: myWallet.publicKey,
    //                         toPubkey: outOfTimeBidder.publicKey,
    //                         lamports: bidAmountInLamports * 1.5,
    //                     }),
    //                 ],
    //                 signers: [outOfTimeBidder],
    //             }
    //         );
    //     });

    //     auctionAccount = await program.account.auction.fetch(auctionAddress);

    //     const winningAmountAfterBidAttempt = auctionAccount.amount.toNumber();
    //     const winningBidderAfterBidAttempt = auctionAccount.bidder.toString();

    //     assert.ok(
    //         winningAmountBeforeBidAttempt === winningAmountAfterBidAttempt
    //     );
    //     assert.ok(
    //         winningBidderBeforeBidAttempt === winningBidderAfterBidAttempt
    //     );
    // });

    // it("attempt to settle wrong auction", async () => {
    //     let auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );

    //     let auctionAccount = await program.account.auction.fetch(
    //         auctionAddress
    //     );

    //     const mintKey = new PublicKey(auctionAccount.resource.toString());
    //     const [bidderTokenAccount, bidderTokenAccountBump] =
    //         await getTokenMintAccount(auctionAccount.bidder, mintKey);

    //     const metadata = await getMetadata(mintKey);

    //     const [auctionTokenAccount, _] = await getTokenMintAccount(
    //         auctionAddress,
    //         mintKey
    //     );

    //     const [auxAddress, auxBump] = await getAuctionAccountAddress(
    //         3,
    //         myWallet.publicKey
    //     );

    //     expectThrowsAsync(async () => {
    //         await program.rpc.settleAuction(
    //             bidderTokenAccountBump,
    //             auctionFactoryBump,
    //             auxBump,
    //             new anchor.BN(3),
    //             {
    //                 accounts: {
    //                     payer: myWallet.publicKey,
    //                     treasury: auctionFactoryAccount.treasury,
    //                     metadata,
    //                     authority: auctionFactoryAccount.authority,
    //                     auctionFactory: auctionFactoryAddress,
    //                     auction: auxAddress,
    //                     mint: mintKey,
    //                     tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    //                     tokenProgram: TOKEN_PROGRAM_ID,
    //                     systemProgram: SystemProgram.programId,
    //                     bidderTokenAccount: bidderTokenAccount,
    //                     auctionTokenAccount,
    //                 },
    //                 instructions: [
    //                     createAssociatedTokenAccountInstruction(
    //                         mintKey,
    //                         bidderTokenAccount,
    //                         auctionAccount.bidder, // owner
    //                         myWallet.publicKey // payer
    //                     ),
    //                 ],
    //                 signers: [myWallet],
    //             }
    //         );
    //     });
    // });

    // it("attempt to settle auction with invalid treasury", async () => {
    //     let auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );

    //     let auctionAccount = await program.account.auction.fetch(
    //         auctionAddress
    //     );

    //     const mintKey = new PublicKey(auctionAccount.resource.toString());
    //     const [bidderTokenAccount, bidderTokenAccountBump] =
    //         await getTokenMintAccount(auctionAccount.bidder, mintKey);

    //     const metadata = await getMetadata(mintKey);

    //     const [auctionTokenAccount, auctionTokenAccountBump] =
    //         await getTokenMintAccount(auctionAddress, mintKey);

    //     expectThrowsAsync(async () => {
    //         await program.rpc.settleAuction(
    //             bidderTokenAccountBump,
    //             auctionFactoryBump,
    //             auctionBump,
    //             auctionAccount.sequence,
    //             {
    //                 accounts: {
    //                     payer: myWallet.publicKey,
    //                     treasury: Keypair.generate().publicKey,
    //                     metadata,
    //                     authority: auctionFactoryAccount.authority,
    //                     auctionFactory: auctionFactoryAddress,
    //                     auction: auctionAddress,
    //                     mint: mintKey,
    //                     tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    //                     tokenProgram: TOKEN_PROGRAM_ID,
    //                     systemProgram: SystemProgram.programId,
    //                     bidderTokenAccount: bidderTokenAccount,
    //                     auctionTokenAccount,
    //                 },
    //                 instructions: [
    //                     createAssociatedTokenAccountInstruction(
    //                         mintKey,
    //                         bidderTokenAccount,
    //                         auctionAccount.bidder, // owner
    //                         myWallet.publicKey // payer
    //                     ),
    //                 ],
    //                 signers: [myWallet],
    //             }
    //         );
    //     });
    // });

    // it("attempt to settle auction with invalid bidder token account", async () => {
    //     let auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );

    //     let auctionAccount = await program.account.auction.fetch(
    //         auctionAddress
    //     );

    //     const mintKey = new PublicKey(auctionAccount.resource.toString());

    //     const fakeAuctionWinner = Keypair.generate();
    //     const [bidderTokenAccount, bidderTokenAccountBump] =
    //         await getTokenMintAccount(fakeAuctionWinner.publicKey, mintKey);

    //     const metadata = await getMetadata(mintKey);

    //     const [auctionTokenAccount, _] = await getTokenMintAccount(
    //         auctionAddress,
    //         mintKey
    //     );

    //     expectThrowsAsync(async () => {
    //         await program.rpc.settleAuction(
    //             bidderTokenAccountBump,
    //             auctionFactoryBump,
    //             auctionBump,
    //             auctionAccount.sequence,
    //             {
    //                 accounts: {
    //                     payer: myWallet.publicKey,
    //                     treasury: auctionFactoryAccount.treasury,
    //                     metadata,
    //                     authority: auctionFactoryAccount.authority,
    //                     auctionFactory: auctionFactoryAddress,
    //                     auction: auctionAddress,
    //                     mint: mintKey,
    //                     tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    //                     tokenProgram: TOKEN_PROGRAM_ID,
    //                     systemProgram: SystemProgram.programId,
    //                     bidderTokenAccount: bidderTokenAccount,
    //                     auctionTokenAccount,
    //                 },
    //                 instructions: [
    //                     createAssociatedTokenAccountInstruction(
    //                         mintKey,
    //                         bidderTokenAccount,
    //                         fakeAuctionWinner.publicKey, // owner
    //                         myWallet.publicKey // payer
    //                     ),
    //                 ],
    //                 signers: [myWallet],
    //             }
    //         );
    //     });
    // });

    it("settle auction", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );
        const treasuryBalanceBefore = await getAccountBalance(
            program,
            auctionFactoryAccount.treasury
        );

        let auctionAccount = await program.account.auction.fetch(
            auctionAddress
        );

        const mintKey = new PublicKey(auctionAccount.resource.toString());
        const [bidderTokenAccount, bidderTokenAccountBump] =
            await getTokenMintAccount(auctionAccount.bidder, mintKey);

        const metadata = await getMetadata(mintKey);

        const [auctionTokenAccount, auctionTokenAccountBump] =
            await getTokenMintAccount(auctionAddress, mintKey);

        await program.rpc.settleAuction(
            bidderTokenAccountBump,
            auctionFactoryBump,
            auctionBump,
            auctionAccount.sequence,
            {
                accounts: {
                    payer: myWallet.publicKey,
                    treasury: auctionFactoryAccount.treasury,
                    metadata,
                    authority: auctionFactoryAccount.authority,
                    auctionFactory: auctionFactoryAddress,
                    auction: auctionAddress,
                    mint: mintKey,
                    tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    bidderTokenAccount: bidderTokenAccount,
                    auctionTokenAccount,
                },
                instructions: [
                    createAssociatedTokenAccountInstruction(
                        mintKey,
                        bidderTokenAccount,
                        auctionAccount.bidder, // owner
                        myWallet.publicKey // payer
                    ),
                ],
                signers: [myWallet],
            }
        );

        auctionAccount = await program.account.auction.fetch(auctionAddress);

        assert.ok(auctionAccount.settled === true);
        assert.ok(
            auctionAccount.finalizedEndTime !== undefined &&
                auctionAccount.finalizedEndTime.toNumber() !== 0
        );

        // verify correct number of lamports was moved into the treasury account
        const treasuryBalanceAfter = await getAccountBalance(
            program,
            auctionFactoryAccount.treasury
        );
        assert.ok(
            treasuryBalanceAfter - treasuryBalanceBefore ===
                auctionAccount.amount.toNumber()
        );

        // verify token accounts have correct balances, aka token is in winner account and not auction account
        const bidderTokenAmount =
            await program.provider.connection.getTokenAccountBalance(
                bidderTokenAccount
            );
        assert.ok(+bidderTokenAmount["value"]["amount"] === 1);

        const auctionTokenAmount =
            await program.provider.connection.getTokenAccountBalance(
                auctionTokenAccount
            );
        assert.ok(+auctionTokenAmount["value"]["amount"] === 0);
    });

    // it("attemp to settle auction again, and fail", async () => {
    //     let auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );

    //     let auctionAccount = await program.account.auction.fetch(
    //         auctionAddress
    //     );

    //     const mintKey = new PublicKey(auctionAccount.resource.toString());

    //     const [bidderTokenAccount, bidderTokenAccountBump] =
    //         await getTokenMintAccount(auctionAccount.bidder, mintKey);

    //     const metadata = await getMetadata(mintKey);

    //     const [auctionTokenAccount, auctionTokenAccountBump] =
    //         await getTokenMintAccount(auctionAddress, mintKey);

    //     expectThrowsAsync(async () => {
    //         await program.rpc.settleAuction(
    //             bidderTokenAccountBump,
    //             auctionFactoryBump,
    //             auctionBump,
    //             auctionAccount.sequence,
    //             {
    //                 accounts: {
    //                     payer: myWallet.publicKey,
    //                     treasury: auctionFactoryAccount.treasury,
    //                     metadata,
    //                     authority: auctionFactoryAccount.authority,
    //                     auctionFactory: auctionFactoryAddress,
    //                     auction: auctionAddress,
    //                     mint: mintKey,
    //                     tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    //                     tokenProgram: TOKEN_PROGRAM_ID,
    //                     systemProgram: SystemProgram.programId,
    //                     bidderTokenAccount: bidderTokenAccount,
    //                     auctionTokenAccount,
    //                 },
    //                 // do not recreate token account because it should already exist
    //                 signers: [myWallet],
    //             }
    //         );
    //     });
    // });

    // it("first auction is over. create a new auction.", async () => {
    //     let auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );
    //     assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);

    //     let auctionAccount = await program.account.auction.fetch(
    //         auctionAddress
    //     );

    //     const [auctionAddress2, auctionBump2] = await getAuctionAccountAddress(
    //         auctionFactoryAccount.sequence.toNumber(),
    //         myWallet.publicKey
    //     );

    //     await program.rpc.createNextAuction(
    //         auctionFactoryBump,
    //         auctionBump,
    //         auctionBump2,
    //         auctionAccount.sequence,
    //         auctionFactoryAccount.sequence,
    //         {
    //             accounts: {
    //                 payer: myWallet.publicKey,
    //                 authority: auctionFactoryAccount.authority,
    //                 auctionFactory: auctionFactoryAddress,
    //                 currentAuction: auctionAddress,
    //                 nextAuction: auctionAddress2,
    //                 systemProgram: SystemProgram.programId,
    //             },
    //             signers: [myWallet],
    //         }
    //     );

    //     auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );
    //     assert.ok(auctionFactoryAccount.sequence.toNumber() === 2);

    //     auctionAccount = await program.account.auction.fetch(auctionAddress2);

    //     assert.ok(auctionAccount.sequence.toNumber() === 1);
    //     assert.ok(auctionAccount.amount.toNumber() === 0);
    // });

    // done with main auction lifecycle 🙂

    // it("dump auction factory monies to treasury", async () => {
    //     const balanceBefore = await getAccountBalance(
    //         program,
    //         treasury.publicKey
    //     );

    //     const dumpAmountInLamports = 1000;

    //     await program.rpc.transferLamportsToTreasury({
    //         accounts: {
    //             payer: myWallet.publicKey,
    //             auctionFactory: auctionFactoryAddress,
    //         },
    //         instructions: [
    //             SystemProgram.transfer({
    //                 fromPubkey: myWallet.publicKey,
    //                 toPubkey: treasury.publicKey,
    //                 lamports: dumpAmountInLamports,
    //             }),
    //         ],
    //         signers: [myWallet],
    //     });

    //     const balanceAfter = await getAccountBalance(
    //         program,
    //         treasury.publicKey
    //     );

    //     console.log('balanceBefore: ', balanceBefore);
    //     console.log('balanceAfter: ', balanceAfter);

    // });

    // it("update auction factory authority", async () => {
    //     const newAuthority = Keypair.generate();

    //     let auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );

    //     const authorityBeforeUpdate = auctionFactoryAccount.authority.toString();

    //     await program.rpc.updateAuthority(auctionFactoryBump, {
    //         accounts: {
    //             payer: myWallet.publicKey,
    //             auctionFactory: auctionFactoryAddress,
    //             newAuthority: newAuthority.publicKey,
    //         },
    //         // we only provide treasury sig to create account. in "real" client side call,
    //         // user should only provide treasury that has been established.
    //         signers: [myWallet],
    //     });

    //     auctionFactoryAccount = await program.account.auctionFactory.fetch(
    //         auctionFactoryAddress
    //     );

    //     assert.ok(
    //         auctionFactoryAccount.authority.toString() !== authorityBeforeUpdate
    //     );
    // });
});

// describe("verify auction works without any bids", async () => {
//     // warn: if this treasury has not been initialized, the settle auction test will fail
//     // due to 0 lamport balance
//     const treasury = Keypair.generate();
//     const bidder = Keypair.generate();

//     // change to myWallet on localnet, otherwise tx will fail due to lack of lamports
//     const authorityKeypair = myWallet; // Keypair.generate(); // 
//     const authorityPubkey = authorityKeypair.publicKey;

//     const [auctionFactoryAddress, auctionFactoryBump] =
//         await getAuctionFactoryAccountAddress(authorityPubkey);

//     const [auctionAddress, auctionBump] = await getAuctionAccountAddress(
//         0,
//         authorityPubkey
//     );

//     const durationInSeconds = 3;
//     const timeBufferInSeconds = 2;
//     const minBidPercentageIncrease = 1;
//     const minReservePrice = 0;

//     it("transfer to new auction factory authority", async () => {
//         await program.provider.connection.requestAirdrop(
//             authorityPubkey,
//             2 * LAMPORTS_PER_SOL
//         );
//     });

//     it("initialize auction factory", async () => {

//         const baseIxn = [
//             SystemProgram.createAccount({
//                 fromPubkey: authorityPubkey,
//                 newAccountPubkey: treasury.publicKey,
//                 space: 10,
//                 lamports:
//                     await provider.connection.getMinimumBalanceForRentExemption(
//                         10
//                     ),
//                 programId: TOKEN_PROGRAM_ID,
//             }),
//         ];

//         const totalIxns = authorityPubkey.toString() === myWallet.publicKey.toString()
//             ? baseIxn
//             : [
//                 ...baseIxn,
//                 SystemProgram.createAccount({
//                     fromPubkey: authorityPubkey,
//                     newAccountPubkey: authorityPubkey,
//                     space: 10,
//                     lamports:
//                         await provider.connection.getMinimumBalanceForRentExemption(
//                             10
//                         ),
//                     programId: TOKEN_PROGRAM_ID,
//                 }),
//             ];

//         console.log("ixns len: ", totalIxns.length);
    
//         await program.rpc.initializeAuctionFactory(
//             auctionFactoryBump,
//             {
//                 duration: new anchor.BN(durationInSeconds),
//                 timeBuffer: new anchor.BN(timeBufferInSeconds), // currently unused
//                 minBidPercentageIncrease: new anchor.BN(
//                     minBidPercentageIncrease
//                 ), // percentage points
//                 minReservePrice: new anchor.BN(minReservePrice),
//             },
//             {
//                 accounts: {
//                     auctionFactory: auctionFactoryAddress,
//                     payer: authorityPubkey,
//                     treasury: treasury.publicKey,
//                     systemProgram: SystemProgram.programId,
//                 },
//                 instructions: totalIxns,
//                 signers: [authorityKeypair, treasury],
//             }
//         );
//     });

//     it("activate auction factory", async () => {
//         let auctionFactoryAccount = await program.account.auctionFactory.fetch(
//             auctionFactoryAddress
//         );

//         await program.rpc.toggleAuctionFactoryStatus(auctionFactoryBump, {
//             accounts: {
//                 payer: authorityPubkey,
//                 auctionFactory: auctionFactoryAddress,
//             },
//             signers: [authorityKeypair],
//         });

//         auctionFactoryAccount = await program.account.auctionFactory.fetch(
//             auctionFactoryAddress
//         );

//         assert.ok(auctionFactoryAccount.isActive === true);
//     });

//     it("initialize first auction", async () => {
//         let auctionFactoryAccount = await program.account.auctionFactory.fetch(
//             auctionFactoryAddress
//         );

//         assert.ok(auctionFactoryAccount.sequence.toNumber() === 0);

//         await program.rpc.createFirstAuction(
//             auctionFactoryBump,
//             auctionBump,
//             new anchor.BN(0), // first auction sequence == 0
//             {
//                 accounts: {
//                     payer: authorityPubkey,
//                     auctionFactory: auctionFactoryAddress,
//                     authority: auctionFactoryAccount.authority,
//                     auction: auctionAddress,
//                     systemProgram: SystemProgram.programId,
//                 },
//                 signers: [authorityKeypair],
//             }
//         );

//         auctionFactoryAccount = await program.account.auctionFactory.fetch(
//             auctionFactoryAddress
//         );
//         assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);
//     });

//     it("supply resource for auction", async () => {
//         let auctionFactoryAccount = await program.account.auctionFactory.fetch(
//             auctionFactoryAddress
//         );

//         let auctionAccount = await program.account.auction.fetch(
//             auctionAddress
//         );

//         assert.ok(auctionAccount.resource === null);

//         const payer = authorityPubkey;
//         const mintAccounts = await generate_mint_accounts(auctionAddress);

//         await program.rpc.supplyResourceToAuction(
//             auctionFactoryBump,
//             auctionBump,
//             auctionAccount.sequence,
//             {
//                 accounts: {
//                     payer: payer,
//                     authority: auctionFactoryAccount.authority,
//                     auction: auctionAddress,
//                     auctionFactory: auctionFactoryAddress,
//                     metadata: mintAccounts.metadata,
//                     masterEdition: mintAccounts.masterEdition,
//                     mint: mintAccounts.mint.publicKey,
//                     mintTokenAccount: mintAccounts.tokenAccount,
//                     tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
//                     tokenProgram: TOKEN_PROGRAM_ID,
//                     systemProgram: SystemProgram.programId,
//                     rent: SYSVAR_RENT_PUBKEY,
//                 },
//                 instructions: await generate_mint_ixns(
//                     program,
//                     payer,
//                     mintAccounts.mint.publicKey,
//                     mintAccounts.tokenAccount,
//                     auctionAddress,
//                     auctionFactoryAddress,
//                     auctionFactoryBump,
//                     auctionFactoryAccount.authority,
//                     auctionAccount.sequence.toNumber(),
//                     auctionAddress,
//                     auctionBump
//                 ),
//                 signers: [mintAccounts.mint],
//             }
//         );

//         auctionAccount = await program.account.auction.fetch(auctionAddress);

//         assert.ok(
//             auctionAccount.resource.toString() ===
//                 mintAccounts.mint.publicKey.toString()
//         );

//         // verify auction token account actually has a token in it
//         const auctionTokenAmount =
//             await program.provider.connection.getTokenAccountBalance(
//                 mintAccounts.tokenAccount
//             );
//         assert.ok(+auctionTokenAmount["value"]["amount"] === 1);
//     });

    // it("spin until auction can be settled", async () => {
    //     let auctionAccount = await program.account.auction.fetch(
    //         auctionAddress
    //     );

    //     // loop until auction is over
    //     let currentTimestamp = new Date().getTime() / 1000;
    //     const auctionEndTime = auctionAccount.endTime.toNumber();
    //     for (;;) {
    //         await sleep(3 * 1000); // sleep for 3 seconds at a time, until auction is over

    //         if (currentTimestamp >= auctionEndTime) {
    //             break;
    //         }
    //         currentTimestamp = new Date().getTime() / 1000;
    //     }

    //     assert.ok(currentTimestamp >= auctionEndTime);
    // });

//     it("settle auction without any bids", async () => {
//         let auctionFactoryAccount = await program.account.auctionFactory.fetch(
//             auctionFactoryAddress
//         );

//         let auctionAccount = await program.account.auction.fetch(
//             auctionAddress
//         );

//         // pause or devnet timeout
//         await sleep(1000);

//         const mintKey = new PublicKey(auctionAccount.resource.toString());
//         const metadata = await getMetadata(mintKey);

//         const [burnTokenAccount, burnTokenAccountBump] =
//             await getTokenMintAccount(TOKEN_BURN_ADDRESS, mintKey);

//         const [auctionTokenAccount, _] = await getTokenMintAccount(
//             auctionAddress,
//             mintKey
//         );

//         await program.provider.connection.requestAirdrop(
//             auctionAddress,
//             0.5 * LAMPORTS_PER_SOL
//         );

//         await program.provider.connection.requestAirdrop(
//             auctionTokenAccount,
//             0.5 * LAMPORTS_PER_SOL
//         );

//         // pause or devnet timeout
//         await sleep(1000);

//         await program.rpc.settleAuction(
//             burnTokenAccountBump,
//             auctionFactoryBump,
//             auctionBump,
//             auctionAccount.sequence,
//             {
//                 accounts: {
//                     payer: authorityPubkey,
//                     treasury: auctionFactoryAccount.treasury,
//                     metadata,
//                     authority: auctionFactoryAccount.authority,
//                     auctionFactory: auctionFactoryAddress,
//                     auction: auctionAddress,
//                     mint: mintKey,
//                     tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
//                     tokenProgram: TOKEN_PROGRAM_ID,
//                     systemProgram: SystemProgram.programId,
//                     bidderTokenAccount: burnTokenAccount,
//                     auctionTokenAccount,
//                 },
//                 instructions: [
//                     createAssociatedTokenAccountInstruction(
//                         mintKey,
//                         burnTokenAccount,
//                         TOKEN_BURN_ADDRESS, // owner
//                         authorityPubkey // payer
//                     ),
//                 ],
//                 signers: [authorityKeypair],
//             }
//         );

//         auctionAccount = await program.account.auction.fetch(auctionAddress);

//         assert.ok(auctionAccount.settled === true);
//         assert.ok(
//             auctionAccount.finalizedEndTime !== undefined &&
//                 auctionAccount.finalizedEndTime.toNumber() !== 0
//         );
//     });
// });
