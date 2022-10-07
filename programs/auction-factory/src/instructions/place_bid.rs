use crate::state::{auction_factory::AuctionFactory, bid::Bid};

use {
    crate::{
        context::PlaceBid, error::ErrorCode, instructions::transfer::transfer_from_signer,
        state::auction::Auction,
    },
    anchor_lang::prelude::*,
};

pub fn return_losing_bid_amount(
    auction_factory: &Account<AuctionFactory>,
    leading_bidder_info: &AccountInfo,
    auction_info: &AccountInfo,
    leading_bid: &Bid,
) -> Result<()> {
    let amount = leading_bid.amount;
    let reserve_price = auction_factory.data.min_reserve_price;

    // ignore any amount that is <= min_reserve_price, that will be first bid
    if amount > reserve_price {
        let leading_bidder = leading_bid.bidder;
        assert!(leading_bidder.eq(leading_bidder_info.key));

        // since our auction PDA has data in it, we cannot use the system program to withdraw SOL.
        // otherwise, we will get an error message that says:
        // >> Transfer: `from` must not carry data
        // error message source: https://github.com/solana-labs/solana/blob/master/runtime/src/system_instruction_processor.rs#L189
        // s/o to the solana tech discord history for the help.
        // ===> newest_losing_bidder = leading_bidder_info

        // protect ourselves from attempting to deduct too many lamports. if auction account lamport balance falls,
        // below rent price, then we could be subject to paying rent/the garbage collector automatically closing our account,
        // but i think that is worst case scenario here. any malicious program/behavior would be able to deduct max lamports
        // in this auction account.
        let amount_after_deduction: u64 = auction_info
            .lamports()
            .checked_sub(amount)
            .ok_or(ErrorCode::InsufficientAccountBalance)?;

        // sub from auction
        **auction_info.lamports.borrow_mut() = amount_after_deduction;

        // return lamports to losing bidder
        **leading_bidder_info.lamports.borrow_mut() = leading_bidder_info
            .lamports()
            .checked_add(amount)
            .ok_or(ErrorCode::NumericalOverflowError)?;
    }

    Ok(())
}

// transfer bid amount in target mint (currently, only SOL) from bidder to auction
pub fn transfer_bid_amount(ctx: &Context<PlaceBid>, amount: u64) -> Result<()> {
    transfer_from_signer(ctx.accounts.into_receive_bid_context(), amount)?;

    Ok(())
}

pub fn handle(
    bid_bump: u8,
    bid: &mut Bid,
    amount: u64,
    bidder: Pubkey,
    auction: &mut Account<Auction>,
) -> Result<()> {
    bid.init_bid(bid_bump, auction.key(), auction.num_bids, bidder, amount);

    auction.update_auction_after_bid()?;

    Ok(())
}
