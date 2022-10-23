use crate::{constant::AUX_FACTORY_SEED, state::auction_factory::AuctionFactory, verify};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(seed: String)]
pub struct UpdateAuctionFactoryTreasury<'info> {
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
    /// CHECK: no account restrictions, partially validated with anchor check here
    // is this sufficient to verify treasury account exists? if not, there is risk treasury funds
    // will be lost again until updated.
    #[account(
        constraint = treasury.lamports() > 0,
        // since we are setting a new treasury, ignore check treasury.key() == auction_factory.treasury.key()
    )]
    pub treasury: AccountInfo<'info>,
}

pub fn handle(ctx: Context<UpdateAuctionFactoryTreasury>) -> Result<()> {
    verify::verify_auction_factory_authority(
        ctx.accounts.payer.key(),
        ctx.accounts.auction_factory.authority,
    )?;

    ctx.accounts
        .auction_factory
        .update_treasury(*ctx.accounts.treasury.key);

    Ok(())
}
