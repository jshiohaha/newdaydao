// use crate::error::ErrorCode;
use crate::structs::auction::Auction;
// use crate::structs::auction_factory::AuctionFactory;
use anchor_lang::prelude::*;

use crate::context::PlaceBid;
use crate::instructions::transfer::{transfer_from_pda, transfer_from_signer};
use crate::AUX_SEED;

pub fn return_losing_bid_amount(
    ctx: &Context<PlaceBid>,
) -> ProgramResult {
    let auction = &ctx.accounts.auction;
    let auction_factory = &ctx.accounts.auction_factory;

    // ignore any amount that is <= min_reserve_price for first bid
    if auction.amount > auction_factory.data.min_reserve_price {
        assert!(auction.bidder.eq(ctx.accounts.bidder.key));

        // https://github.com/metaplex-foundation/metaplex/blob/master/rust/nft-candy-machine/src/lib.rs#L109
        transfer_from_pda(
            ctx.accounts
                .into_return_lamports_to_loser_context()
                .with_signer(&[&[
                    &AUX_SEED[..],
                    &[auction.bump]
                ]]),
            auction.amount,
        )?;
    }

    Ok(())
}

pub fn transfer_bid_amount (
    ctx: &Context<PlaceBid>,
    amount: u64
) -> ProgramResult {
    transfer_from_signer(
        ctx.accounts.into_receive_bid_context(),
        amount,
    )?;

    Ok(())
}

pub fn place(
    amount: u64,
    bidder: Pubkey,
    auction: &mut Auction,
) -> ProgramResult {
    auction
        .update_auction_with_bid(amount, bidder);

    Ok(())
}
