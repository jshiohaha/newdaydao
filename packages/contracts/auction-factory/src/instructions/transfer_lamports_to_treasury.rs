use crate::util::general::get_available_lamports;
use crate::{constant::AUX_FACTORY_SEED, state::auction_factory::AuctionFactory, transfer, verify};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(seed: String)]
pub struct TransferAuctionFactoryLamportsToTreasury<'info> {
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
    #[account(mut,
        constraint = treasury.lamports() > 0,
        constraint = treasury.key() == auction_factory.treasury.key()
    )]
    pub treasury: AccountInfo<'info>,
}

pub fn handle(ctx: Context<TransferAuctionFactoryLamportsToTreasury>) -> Result<()> {
    verify::verify_auction_factory_authority(
        ctx.accounts.payer.key(),
        ctx.accounts.auction_factory.authority,
    )?;

    let auction_factory_account_info = &ctx.accounts.auction_factory.to_account_info();
    let amount_to_transfer = get_available_lamports(auction_factory_account_info)?;

    transfer::transfer_lamports(
        auction_factory_account_info,
        &ctx.accounts.treasury.to_account_info(),
        amount_to_transfer,
    )?;

    Ok(())
}
