use crate::{constant::AUX_FACTORY_SEED, state::auction_factory::AuctionFactory, verify};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(seed: String)]
pub struct ToggleAuctionFactoryStatus<'info> {
    pub payer: Signer<'info>,
    #[account(mut,
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes()
        ],
        bump,
        constraint = auction_factory.authority.key() == payer.key(),
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
}

pub fn handle(ctx: Context<ToggleAuctionFactoryStatus>) -> Result<()> {
    verify::verify_auction_factory_authority(
        ctx.accounts.payer.key(),
        ctx.accounts.auction_factory.authority,
    )?;

    if ctx.accounts.auction_factory.is_active {
        msg!("Pausing auction factory");
        ctx.accounts.auction_factory.pause();
    } else {
        msg!("Resuming auction factory");
        ctx.accounts.auction_factory.resume();
    }

    Ok(())
}
