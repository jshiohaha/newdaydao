use crate::{constant::AUX_FACTORY_SEED, state::auction_factory::AuctionFactory, verify};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(seed: String)]
pub struct UpdateAuctionFactoryAuthority<'info> {
    pub payer: Signer<'info>,
    /// CHECK: no account restrictions, risky operation
    pub new_authority: AccountInfo<'info>,
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

pub fn handle(ctx: Context<UpdateAuctionFactoryAuthority>) -> Result<()> {
    verify::verify_auction_factory_authority(
        ctx.accounts.payer.key(),
        ctx.accounts.auction_factory.authority,
    )?;

    ctx.accounts
        .auction_factory
        .update_authority(*ctx.accounts.new_authority.key);

    Ok(())
}