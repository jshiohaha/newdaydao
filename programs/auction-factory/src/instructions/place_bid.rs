use crate::error::ErrorCode;
use crate::structs::auction::Auction;
// use crate::structs::auction_factory::AuctionFactory;
use anchor_lang::{prelude::*, solana_program};

use crate::context::PlaceBid;
use crate::instructions::transfer::{transfer_from_signer};

pub fn return_losing_bid_amount(ctx: &Context<PlaceBid>) -> ProgramResult {
    let amount = ctx.accounts.auction.amount;
    let reserve_price = ctx.accounts.auction_factory.data.min_reserve_price;

    // ignore any amount that is <= min_reserve_price, that will be first bid
    if amount > reserve_price {
        let leading_bidder = ctx.accounts.auction.bidder;
        assert!(leading_bidder.eq(ctx.accounts.leading_bidder.key));

        // since our auction PDA has data in it, we cannot use the system program to withdraw SOL.
        // otherwise, we will get an error message that says:
        // >> Transfer: `from` must not carry data
        // error message source: https://github.com/solana-labs/solana/blob/master/runtime/src/system_instruction_processor.rs#L189
        // s/o to the solana tech discord history for the help.
        let newest_losing_bidder = &ctx.accounts.leading_bidder;
        let auction_as_payer = &ctx.accounts.auction.to_account_info();
        // protect ourselves from attempting to deduct too many lamports. if auction account lamport balance falls,
        // below rent price, then we could be subject to paying rent/the garbage collector automatically closing our account,
        // but i think that is worst case scenario here. any malicious program/behavior would be able to deduct max lamports
        // in this auction account.
        let amount_after_deduction: u64 = auction_as_payer
            .lamports()
            .checked_sub(amount)
            .ok_or(ErrorCode::InsufficientAccountBalance)?;

        // sub from auction
        **auction_as_payer.lamports.borrow_mut() = amount_after_deduction;

        // return lamports to losing bidder
        **newest_losing_bidder.lamports.borrow_mut() = newest_losing_bidder
            .lamports()
            .checked_add(amount)
            .ok_or(ErrorCode::NumericalOverflowError)?;
    }

    Ok(())
}

pub fn transfer_bid_amount(ctx: &Context<PlaceBid>, amount: u64) -> ProgramResult {
    transfer_from_signer(ctx.accounts.into_receive_bid_context(), amount)?;

    Ok(())
}

pub fn place(amount: u64, bidder: Pubkey, auction: &mut Auction) -> ProgramResult {
    auction.update_auction_with_bid(amount, bidder);

    Ok(())
}
