import * as anchor from "@project-serum/anchor";
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
    getTokenMintAccount,
    createAssociatedTokenAccountInstruction,
    generate_mint_ixns,
    generate_mint_accounts,
    sleep,
    getAuctionTreasuryAddress,
} from "./helpers";
import { TOKEN_METADATA_PROGRAM_ID, AUX_FACTORY_PROGRAM_ID } from "./utils";

import { AuctionFactory as AuctionFactoryProgram } from "../target/types/auction_factory";
import {
    AUCTION_FACTORY_IDL,
    AUX_FAX_SEED,
    AUX_SEED,
} from "../app/src/utils/constants";

const provider = anchor.Provider.env();
anchor.setProvider(provider);

const program = anchor.workspace
    .AuctionFactory as Program<AuctionFactoryProgram>;

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

const getAccountBalance = async (
    program: Program<AuctionFactoryProgram>,
    address: anchor.web3.PublicKey
) => {
    return await program.provider.connection.getBalance(address);
};

const logAuctionAccountData = async (
    program: Program<AuctionFactoryProgram>,
    auction: anchor.web3.PublicKey
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

// anchor.web3.SystemProgram.transfer({
//     fromPubkey: payer,
//     toPubkey: auctionAddress, // this.authority.publicKey,
//     lamports: 10000000, // add minting fees in there
// }),
// https://solana-labs.github.io/solana-web3.js/modules.html#CreateAccountParams
describe("execute basic auction factory functions", () => {
    const treasury = anchor.web3.Keypair.generate();

    // warn: if this treasury has not been initialized, the settle auction test will fail
    // due to 0 lamport balance
    let updatedTreasury = anchor.web3.Keypair.generate();

    let auctionFactoryAddress = null;
    let auctionFactoryBump = null;

    let auctionAddress = null;
    let auctionBump = null;
    let auctionTreasuryAddress = null;

    let bidder = anchor.web3.Keypair.generate();

    it("initialize auction factory", async () => {
        const [afAddress, afBump] = await getAuctionFactoryAccountAddress(
            myWallet.publicKey
        );

        auctionFactoryAddress = afAddress;
        auctionFactoryBump = afBump;

        await program.rpc.initializeAuctionFactory(
            auctionFactoryBump,
            {
                duration: new anchor.BN(2), // 10 seconds, in seconds
                timeBuffer: new anchor.BN(5), // 5 seconds, currently unused
                minBidPercentageIncrease: new anchor.BN(1), // percentage points
                minReservePrice: new anchor.BN(0),
            },
            {
                accounts: {
                    auctionFactory: auctionFactoryAddress,
                    authority: myWallet.publicKey,
                    payer: myWallet.publicKey,
                    treasury: treasury.publicKey,
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

        expectThrowsAsync(async () => {
            await program.rpc.createFirstAuction(
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

    it("activate auction factory", async () => {
        await program.rpc.toggleAuctionFactoryStatus({
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

    // TODO
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
    //             anchor.web3.SystemProgram.transfer({
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

    it("non-authority attempts to modify auction factory", async () => {
        const fake_authority = anchor.web3.Keypair.generate();

        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );
        const status_before_program_invocation = auctionFactoryAccount.isActive;

        expectThrowsAsync(async () => {
            await program.rpc.toggleAuctionFactoryStatus({
                accounts: {
                    auctionFactory: auctionFactoryAddress,
                    payer: fake_authority.publicKey,
                },
                signers: [fake_authority],
            });
        });

        auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );

        // verify status did not change
        assert.ok(
            status_before_program_invocation === auctionFactoryAccount.isActive
        );
    });

    it("modify auction factory data", async () => {
        const updatedMinReservePrice = 1;
        const updatedMinBidPercentageIncrease = 2;

        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );

        await program.rpc.modifyAuctionFactoryData(
            {
                duration: new anchor.BN(auctionFactoryAccount.data.duration),
                timeBuffer: new anchor.BN(
                    auctionFactoryAccount.data.timeBuffer
                ),
                minBidPercentageIncrease: new anchor.BN(
                    updatedMinBidPercentageIncrease
                ),
                minReservePrice: new anchor.BN(updatedMinReservePrice),
            },
            {
                accounts: {
                    auctionFactory: auctionFactoryAddress,
                    payer: myWallet.publicKey,
                },
                signers: [myWallet],
            }
        );

        auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );

        assert.ok(
            auctionFactoryAccount.data.minReservePrice.toNumber() ===
                updatedMinReservePrice
        );
        assert.ok(
            auctionFactoryAccount.data.minBidPercentageIncrease.toNumber() ===
                updatedMinBidPercentageIncrease
        );
    });

    it("update auction factory treasury", async () => {
        await program.rpc.updateTreasury({
            accounts: {
                payer: myWallet.publicKey,
                auctionFactory: auctionFactoryAddress,
                treasury: updatedTreasury.publicKey,
            },
            // ensure treasury account is initialized
            instructions: [
                anchor.web3.SystemProgram.createAccount({
                    fromPubkey: myWallet.publicKey,
                    newAccountPubkey: updatedTreasury.publicKey,
                    space: 100,
                    lamports: await provider.connection.getMinimumBalanceForRentExemption(
                      100
                    ),
                    programId: TOKEN_PROGRAM_ID,
                  }),
            ],
            // we only provide treasury sig to create account. in "real" client side call,
            // user should only provide treasury that has been established.
            signers: [myWallet, updatedTreasury],
        });

        const auctionFactoryAccount =
            await program.account.auctionFactory.fetch(auctionFactoryAddress);

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
        let auctionAccount = await program.account.auction.fetch(
            auctionAddress
        );

        assert.ok(auctionAccount.resource === null);

        const payer = myWallet.publicKey;
        const mintAccounts = await generate_mint_accounts(auctionAddress);

        await program.rpc.supplyResourceToAuction({
            accounts: {
                payer: payer,
                auction: auctionAddress,
                auctionFactory: auctionFactoryAddress,
                metadata: mintAccounts.metadata,
                masterEdition: mintAccounts.masterEdition,
                mint: mintAccounts.mint.publicKey,
                mintTokenAccount: mintAccounts.tokenAccount,
                tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            },
            instructions: await generate_mint_ixns(
                program,
                payer,
                mintAccounts.mint.publicKey,
                mintAccounts.tokenAccount,
                auctionAddress
            ),
            signers: [mintAccounts.mint],
        });

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

    it("attempt to supply resource for auction again, and fail 😈", async () => {
        const payer = myWallet.publicKey;
        const mintAccounts = await generate_mint_accounts(auctionAddress);

        expectThrowsAsync(async () => {
            await program.rpc.supplyResourceToAuction({
                accounts: {
                    payer: payer,
                    auction: auctionAddress,
                    auctionFactory: auctionFactoryAddress,
                    metadata: mintAccounts.metadata,
                    masterEdition: mintAccounts.masterEdition,
                    mint: mintAccounts.mint.publicKey,
                    mintTokenAccount: mintAccounts.tokenAccount,
                    tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                },
                instructions: await generate_mint_ixns(
                    program,
                    payer,
                    mintAccounts.mint.publicKey,
                    mintAccounts.tokenAccount,
                    auctionAddress
                ),
                signers: [mintAccounts.mint],
            });
        });
    });

    it("attempt to initialize first auction again, and fail 😈", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);

        expectThrowsAsync(async () => {
            await program.rpc.createFirstAuction(
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
        });

        auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);
    });

    it("attempt to create a new auction during an active auction, and fail 😈", async () => {
        let auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);

        const [auxAddress2, auxBump2] = await getAuctionAccountAddress(
            auctionFactoryAccount.sequence.toNumber(),
            myWallet.publicKey
        );

        expectThrowsAsync(async () => {
            await program.rpc.createNextAuction(
                auxBump2,
                auctionFactoryAccount.sequence,
                {
                    accounts: {
                        auctionFactory: auctionFactoryAddress,
                        authority: auctionFactoryAccount.authority,
                        payer: myWallet.publicKey,
                        currentAuction: auctionAddress,
                        nextAuction: auxAddress2,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    },
                    signers: [myWallet],
                }
            );
        });

        auctionFactoryAccount = await program.account.auctionFactory.fetch(
            auctionFactoryAddress
        );
        assert.ok(auctionFactoryAccount.sequence.toNumber() === 1);
    });

    it("place valid bid", async () => {
        const auctionBalanceBefore = await getAccountBalance(
            program,
            auctionAddress
        );
        const bidAmountInLamports = 100;

        await program.rpc.placeBid(new anchor.BN(bidAmountInLamports), {
            accounts: {
                bidder: bidder.publicKey,
                leadingBidder: myWallet.publicKey,
                auctionFactory: auctionFactoryAddress,
                auction: auctionAddress,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            instructions: [
                anchor.web3.SystemProgram.transfer({
                    fromPubkey: myWallet.publicKey,
                    toPubkey: bidder.publicKey,
                    lamports: 1000, // add minting fees in there
                }),
            ],
            signers: [bidder],
        });

        const auctionBalanceAfter = await getAccountBalance(
            program,
            auctionAddress
        );

        assert.ok(auctionBalanceAfter > auctionBalanceBefore);
    });

    it("winner bidder attempts to place another bid, but fails since bidder is already winning", async () => {
        const bidAmountInLamports = 105;

        let auctionAccount = await program.account.auction.fetch(
            auctionAddress
        );

        expectThrowsAsync(async () => {
            await program.rpc.placeBid(new anchor.BN(bidAmountInLamports), {
                accounts: {
                    bidder: bidder.publicKey,
                    leadingBidder: auctionAccount.bidder,
                    auctionFactory: auctionFactoryAddress,
                    auction: auctionAddress,
                    systemProgram: anchor.web3.SystemProgram.programId,
                },
                signers: [bidder],
            });
        });
    });

    it("place another valid bid", async () => {
        const auctionBalanceBefore = await getAccountBalance(
            program,
            auctionAddress
        );
        const bidAmountInLamports = 102;

        let auctionAccount = await program.account.auction.fetch(
            auctionAddress
        );

        await program.rpc.placeBid(new anchor.BN(bidAmountInLamports), {
            accounts: {
                bidder: myWallet.publicKey,
                leadingBidder: auctionAccount.bidder,
                auctionFactory: auctionFactoryAddress,
                auction: auctionAddress,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [myWallet],
        });

        const auctionBalanceAfter = await getAccountBalance(
            program,
            auctionAddress
        );

        assert.ok(auctionBalanceAfter > auctionBalanceBefore);
    });

    // place invalid bid, not big enough % diff
    it("new bidder attempts to place another bid, but fails due to invalid bid amount 😈", async () => {
        const bidAmountInLamports = 103;

        let auctionAccount = await program.account.auction.fetch(
            auctionAddress
        );

        const new_bidder = anchor.web3.Keypair.generate();

        expectThrowsAsync(async () => {
            await program.rpc.placeBid(new anchor.BN(bidAmountInLamports), {
                accounts: {
                    bidder: new_bidder.publicKey,
                    leadingBidder: auctionAccount.bidder,
                    auctionFactory: auctionFactoryAddress,
                    auction: auctionAddress,
                    systemProgram: anchor.web3.SystemProgram.programId,
                },
                instructions: [
                    anchor.web3.SystemProgram.transfer({
                        fromPubkey: myWallet.publicKey,
                        toPubkey: new_bidder.publicKey,
                        lamports: bidAmountInLamports + 500,
                    }),
                ],
                signers: [new_bidder],
            });
        });
    });

    // TODO: attempt to settle with auction address (seq-1 or something)
    // TODO: attempt to settle with wrong treasury
    // TODO: attempt to settle with wrong bidder token account

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

        // loop until auction is over
        let currentTimestamp = new Date().getTime() / 1000;
        const auctionEndTime = auctionAccount.endTime.toNumber();
        for (;;) {
            await sleep(3 * 1000); // sleep for 3 seconds at a time, until auction is over

            if (auctionEndTime <= currentTimestamp) {
                break;
            }
            currentTimestamp = new Date().getTime() / 1000;
        }

        const mintKey = new anchor.web3.PublicKey(
            auctionAccount.resource.toString()
        );
        const [bidderTokenAccount, bidderTokenAccountBump] =
            await getTokenMintAccount(auctionAccount.bidder, mintKey);

        const metadata = await getMetadata(mintKey);

        const [auctionTokenAccount, auctionTokenAccountBump] =
            await getTokenMintAccount(auctionAddress, mintKey);

        await program.rpc.settleAuction(
            auctionTokenAccountBump,
            bidderTokenAccountBump,
            {
                accounts: {
                    payer: myWallet.publicKey,
                    treasury: auctionFactoryAccount.treasury,
                    metadata,
                    auctionFactory: auctionFactoryAddress,
                    auction: auctionAddress,
                    auctionInfo: auctionAddress,
                    tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: anchor.web3.SystemProgram.programId,
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
        assert.ok(treasuryBalanceAfter - treasuryBalanceBefore === auctionAccount.amount.toNumber());

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

    // TODO: verify we can create another auction!

    // done
});

// no winner and token is burned?
// describe("verify auction works without any bids", () => {
//     // it("activate auction factory", async () => {});
// });
