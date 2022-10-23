use crate::{
    constant::{AUX_FACTORY_SEED, AUX_SEED},
    state::{auction::Auction, auction_factory::AuctionFactory},
};
use anchor_lang::prelude::*;
use anchor_spl::token::{close_account, CloseAccount, Token, TokenAccount};

#[derive(Accounts)]
#[instruction(
    seed: String,
    sequence: u64
)]
pub struct CloseAuctionTokenAccount<'info> {
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
    /// CHECK: no account restrictions, partially validated with anchor check here
    #[account(
        mut,
        constraint = auction_factory.treasury.key() == treasury.key()
    )]
    pub treasury: AccountInfo<'info>,
    #[account(
        mut,
        constraint = auction_token_account.amount == 0,
        constraint = auction_token_account.owner == auction.key()
    )]
    pub auction_token_account: Account<'info, TokenAccount>,
    #[account(address = spl_token::id())]
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

/// ===================================
/// context for admin instructions  ///
/// ===================================

// ================ IMPL FOR CPI CONTEXT ================

impl<'info> CloseAuctionTokenAccount<'info> {
    pub fn into_close_token_account_context(
        &self,
    ) -> CpiContext<'_, '_, '_, 'info, CloseAccount<'info>> {
        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = CloseAccount {
            account: self.auction_token_account.to_account_info(),
            // send rent lamports to treasury
            destination: self.treasury.to_account_info(),
            authority: self.auction.to_account_info(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}

pub fn handle(ctx: Context<CloseAuctionTokenAccount>, sequence: u64) -> Result<()> {
    let auction_bump: u8 = *ctx.bumps.get("auction").unwrap();
    let seq_str = sequence.to_string();

    close_account(
        ctx.accounts
            .into_close_token_account_context()
            .with_signer(&[&[
                AUX_SEED.as_bytes(),
                ctx.accounts.auction_factory.key().as_ref(),
                seq_str.as_bytes(),
                &[auction_bump],
            ]]),
    )?;

    Ok(())
}
