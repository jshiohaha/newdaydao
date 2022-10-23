use crate::{
    constant::{AUX_FACTORY_SEED, AUX_SEED},
    error::ErrorCode,
    instructions::transfer::transfer_from_signer,
    state::auction::Auction,
    state::{
        auction_factory::AuctionFactory,
        bid::{to_bid, Bid, BID_ACCOUNT_SPACE},
    },
    verify, TransferLamports,
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(
    seed: String,
    sequence: u64,
    amount: u64,
    // manual seed is required here because we don't validate PDA in anchor context
    current_bid_bump: u8
)]
pub struct PlaceBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(
        mut,
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes(),
        ],
        bump,
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(
        mut,
        seeds = [
            AUX_SEED.as_bytes(),
            auction_factory.key().as_ref(),
            sequence.to_string().as_bytes()
        ],
        bump,
        constraint = auction.to_account_info().owner == program_id,
    )]
    pub auction: Account<'info, Auction>,
    pub system_program: Program<'info, System>,

    // ignore anchor checks, perform manually in IX for max flexibility
    /// CHECK: verify in IX, normal wallet
    #[account(mut)]
    pub leading_bidder: AccountInfo<'info>,
    /// CHECK: verify in IX, possibly garbage if no current bid
    pub current_bid: AccountInfo<'info>,
    /// safe to init as normal PDA because we will use this new bid account if all checks pass
    #[account(
        init,
        seeds = [
            auction.key().as_ref(),
            (auction.num_bids + 1).to_string().as_bytes(),
        ],
        bump,
        payer = bidder,
        space = BID_ACCOUNT_SPACE,
        constraint = next_bid.to_account_info().owner == program_id,
    )]
    pub next_bid: Account<'info, Bid>,
}

impl<'info> PlaceBid<'info> {
    pub fn into_receive_bid_context(
        &self,
    ) -> CpiContext<'_, '_, '_, 'info, TransferLamports<'info>> {
        let cpi_program = self.system_program.to_account_info();

        let cpi_accounts = TransferLamports {
            from: self.bidder.to_account_info(),
            to: self.auction.to_account_info(),
            system_program: self.system_program.clone(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}

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

pub fn handle(ctx: Context<PlaceBid>, amount: u64, current_bid_bump: u8) -> Result<()> {
    verify::verify_auction_factory_is_active(&ctx.accounts.auction_factory)?;

    let auction = &ctx.accounts.auction;
    let auction_bump: u8 = *ctx.bumps.get("auction").unwrap();
    verify::verify_auction_address_for_factory(
        ctx.accounts.auction_factory.key(),
        ctx.accounts.auction_factory.sequence,
        auction.key(),
        auction_bump,
    )?;

    let current_bid_account_info = ctx.accounts.current_bid.to_account_info();

    let next_bid_account_info = ctx.accounts.next_bid.to_account_info();
    let next_bump: u8 = *ctx.bumps.get("next_bid").unwrap();
    verify::verify_bid_accounts(
        &current_bid_account_info,
        current_bid_bump,
        &next_bid_account_info,
        next_bump,
        auction,
    )?;

    // only take certain actions if current_bid exists
    if auction.num_bids > 0 {
        let current_bid = to_bid(&current_bid_account_info);

        verify::verify_bidder_not_already_winning(current_bid.bidder, ctx.accounts.bidder.key())?;

        verify::verify_bid_for_auction(
            &ctx.accounts.auction_factory,
            auction,
            &current_bid, // todo: does this work?
            amount,
        )?;

        return_losing_bid_amount(
            &ctx.accounts.auction_factory,
            &ctx.accounts.leading_bidder.to_account_info(),
            &auction.to_account_info(),
            &current_bid,
        )?;
    }

    // todo: is explicity balance check necessary?
    let bidder = ctx.accounts.bidder.to_account_info();
    verify::verify_bidder_has_sufficient_account_balance(bidder, amount)?;
    transfer_bid_amount(&ctx, amount)?;

    ctx.accounts.next_bid.init_bid(
        next_bump,
        auction.key(),
        auction.num_bids,
        ctx.accounts.bidder.key(),
        amount,
    );
    (&mut ctx.accounts.auction).update_auction_after_bid()?;

    Ok(())
}
