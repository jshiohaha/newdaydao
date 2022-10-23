use crate::{
    constant::AUX_FACTORY_SEED,
    state::auction_factory::{AuctionFactory, AuctionFactoryData, AUCTION_FACTORY_ACCOUNT_SPACE},
    verify,
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(
    seed: String,
    data: AuctionFactoryData
)]
pub struct InitializeAuctionFactory<'info> {
    // payer is initial auction factory authority
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: no account restrictions, partially validated with anchor check here
    // is this sufficient to verify treasury account exists? if not, there is risk treasury funds
    // will be lost again until updated.
    #[account(constraint= treasury.lamports() > 0)]
    pub treasury: AccountInfo<'info>,
    #[account(init,
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes()
        ],
        bump,
        payer = payer,
        space = AUCTION_FACTORY_ACCOUNT_SPACE,
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    pub system_program: Program<'info, System>,
}

pub fn handle(
    ctx: Context<InitializeAuctionFactory>,
    seed: String,
    data: AuctionFactoryData,
) -> Result<()> {
    verify::verify_auction_factory_seed(&seed)?;

    let auction_factory_bump: u8 = *ctx.bumps.get("auction_factory").unwrap();
    ctx.accounts.auction_factory.init(
        auction_factory_bump,
        seed,
        ctx.accounts.payer.key(),
        ctx.accounts.treasury.key(),
        data,
    );

    Ok(())
}
