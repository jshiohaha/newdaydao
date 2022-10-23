use crate::{
    constant::{AUX_FACTORY_SEED, AUX_SEED},
    state::{auction::Auction, auction_factory::AuctionFactory},
};
use anchor_lang::prelude::*;
use anchor_spl::token::{mint_to, Mint, MintTo, Token, TokenAccount};

#[derive(Accounts)]
#[instruction(
    seed: String,
    sequence: u64
)]
pub struct CreateTokenMint<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = token_mint_account.amount == 0,
        constraint = token_mint_account.owner == auction.key()
    )]
    pub token_mint_account: Account<'info, TokenAccount>,
    #[account(
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes(),
        ],
        bump,
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(
        seeds = [
            AUX_SEED.as_bytes(),
            auction_factory.key().as_ref(),
            sequence.to_string().as_bytes(),
        ],
        bump,
        constraint = auction.to_account_info().owner == program_id,
    )]
    pub auction: Account<'info, Auction>,
    #[account(address = spl_token::id())]
    pub token_program: Program<'info, Token>,
}

impl<'info> CreateTokenMint<'info> {
    pub fn into_mint_token_context(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = MintTo {
            mint: self.mint.to_account_info(),
            to: self.token_mint_account.to_account_info(),
            authority: self.auction.to_account_info(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}

// custom mint_to instruction since a PDA can only sign from an on-chain program.
// and, the mint_to ixn requires the authority to sign in the case of no multisig.
// source: https://github.com/solana-labs/solana-program-library/blob/e29bc53c5f572073908fb89c6812d22f6f5eecf5/token/js/client/token.js#L1731
pub fn handle(ctx: Context<CreateTokenMint>, sequence: u64) -> Result<()> {
    let bump: u8 = *ctx.bumps.get("auction").unwrap();
    let seq_str = sequence.to_string();

    mint_to(
        ctx.accounts.into_mint_token_context().with_signer(&[&[
            AUX_SEED.as_bytes(),
            ctx.accounts.auction_factory.key().as_ref(),
            seq_str.as_bytes(),
            &[bump],
        ]]),
        1,
    )?;

    Ok(())
}
