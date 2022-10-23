// todo: refactor imports
use crate::{
    constant::{AUX_FACTORY_SEED, AUX_SEED},
    error::ErrorCode,
    state::{
        auction::{to_auction, Auction, AUCTION_ACCOUNT_SPACE},
        auction_factory::AuctionFactory,
    },
    util::general::get_current_timestamp,
    verify,
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(
    seed: String,
    // manual seed is required here because we don't validate PDA in anchor context
    current_auction_bump: u8
)]
pub struct CreateAuction<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
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
    /// CHECK: verify in IX, possibly garbage if no current auction
    // #[account(
    //     mut,
    //     seeds = [
    //         AUX_SEED.as_bytes(),
    //         auction_factory.key().as_ref(),
    //         auction_factory.sequence.to_string().as_bytes()
    //     ],
    //     bump,
    //     constraint = current_auction.to_account_info().owner == program_id,
    // )]
    pub current_auction: AccountInfo<'info>,
    /// safe to init as normal PDA because we will use this new auction account if all checks pass
    #[account(
        init,
        seeds = [
            AUX_SEED.as_bytes(),
            auction_factory.key().as_ref(),
            (auction_factory.sequence + 1).to_string().as_bytes()
        ],
        bump,
        payer = payer,
        space = AUCTION_ACCOUNT_SPACE,
        constraint = next_auction.to_account_info().owner == program_id,
    )]
    pub next_auction: Account<'info, Auction>,
    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<CreateAuction>, current_auction_bump: u8) -> Result<()> {
    let auction_factory = &mut ctx.accounts.auction_factory;
    let current_sequence = auction_factory.sequence;
    let current_auction = &ctx.accounts.current_auction;

    verify::verify_auction_factory_is_active(&auction_factory)?;

    // verify current auction infos
    if current_sequence > 0 {
        // todo: verify supplied current_auction account key
        verify::verify_auction_address_for_factory(
            auction_factory.key(),
            current_sequence,
            current_auction.key(),
            current_auction_bump,
        )?;

        let current_auction = to_auction(&current_auction.to_account_info());
        // ensure settled auction before creating a new auction, if we are past the first auction
        verify::verify_current_auction_is_over(&current_auction)?;
    }

    // verify next auction infos & handle initialization
    let next_auction = &mut ctx.accounts.next_auction;
    let next_auction_bump: u8 = *ctx.bumps.get("next_auction").unwrap();

    let next_sequence = current_sequence
        .checked_add(1)
        .ok_or(ErrorCode::NumericalOverflowError)?;

    verify::verify_auction_address_for_factory(
        auction_factory.key(),
        next_sequence,
        next_auction.key(),
        next_auction_bump,
    )?;

    // handle next auction initialization
    let current_timestamp = get_current_timestamp().unwrap();

    // don't move: keep auction factory sequence === auction sequence
    auction_factory.increment_sequence();
    next_auction.init(
        next_auction_bump,
        auction_factory.sequence,
        auction_factory.authority.key(),
        current_timestamp,
        auction_factory.data,
    );

    Ok(())
}
