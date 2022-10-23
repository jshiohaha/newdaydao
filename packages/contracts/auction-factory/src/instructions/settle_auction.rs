use anchor_lang::prelude::*;
use anchor_spl::token::{burn, Burn, Mint, Token, TokenAccount};

use crate::constant::{AUX_FACTORY_SEED, AUX_SEED};
use crate::instructions::transfer::{spl_token_transfer, transfer_lamports, TokenTransferParams};
use crate::state::auction::Auction;
use crate::state::auction_factory::AuctionFactory;
use crate::state::bid::Bid;
use crate::verify;

#[derive(Accounts)]
#[instruction(
    seed: String,
    sequence: u64
)]
pub struct SettleAuction<'info> {
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
    #[account(
        seeds = [
            auction.key().as_ref(),
            auction.num_bids.to_string().as_bytes(),
        ],
        bump,
        constraint = bid.to_account_info().owner == program_id,
    )]
    pub bid: Account<'info, Bid>,
    #[account(
        mut,
        constraint = mint.decimals == 0,
        constraint = mint.supply == 1,
    )]
    pub mint: Account<'info, Mint>,
    /// CHECK: no account restrictions, partially validated with anchor check here
    #[account(
        mut,
        constraint = auction_factory.treasury.key() == treasury.key()
    )]
    pub treasury: AccountInfo<'info>,
    /// CHECK: metadata accounts are verified via cpi in the metadata program
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    /// CHECK: not used in the case of auctions without any bids, do account validation on-chain.
    #[account(mut)]
    pub bidder_token_account: AccountInfo<'info>,
    #[account(
        mut,
        constraint = auction_token_account.amount == 1,
        constraint = auction_token_account.owner == auction.key()
    )]
    pub auction_token_account: Account<'info, TokenAccount>,
    /// CHECK: verified via anchor address check
    #[account(address = mpl_token_metadata::id())]
    pub token_metadata_program: UncheckedAccount<'info>,
    #[account(address = spl_token::id())]
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> SettleAuction<'info> {
    pub fn into_burn_token_context(&self) -> CpiContext<'_, '_, '_, 'info, Burn<'info>> {
        let cpi_program = self.token_program.to_account_info();

        // burn field changed `to` to `from`
        // https://github.com/coral-xyz/anchor/commit/4d9bd6adc6435252ea2973ea6531477d3dc2c8bb
        let cpi_accounts = Burn {
            mint: self.mint.to_account_info(),
            from: self.auction_token_account.to_account_info(),
            authority: self.auction.to_account_info(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}

pub fn settle_empty_auction(ctx: Context<SettleAuction>, bump: u8, sequence: u64) -> Result<()> {
    let seq_str = sequence.to_string();
    burn(
        ctx.accounts.into_burn_token_context().with_signer(&[&[
            AUX_SEED.as_bytes(),
            ctx.accounts.auction_factory.key().as_ref(),
            seq_str.as_bytes(),
            &[bump],
        ]]),
        1,
    )?;

    ctx.accounts.auction.settle();

    Ok(())
}

pub fn settle_auction(ctx: Context<SettleAuction>, bump: u8, sequence: u64) -> Result<()> {
    let seq_str = sequence.to_string();
    spl_token_transfer(TokenTransferParams {
        source: ctx.accounts.auction_token_account.to_account_info(),
        destination: ctx.accounts.bidder_token_account.to_account_info(),
        authority: ctx.accounts.auction.to_account_info().clone(),
        authority_signer_seeds: &[
            AUX_SEED.as_bytes(),
            ctx.accounts.auction_factory.key().as_ref(),
            seq_str.as_bytes(),
            &[bump],
        ],
        token_program: ctx.accounts.token_program.to_account_info(),
        amount: 1,
    })?;

    transfer_lamports(
        &ctx.accounts.auction.to_account_info(),
        &ctx.accounts.treasury.to_account_info(),
        ctx.accounts.bid.amount,
    )?;

    // mark auction as settled
    ctx.accounts.auction.settle();

    Ok(())
}

pub fn handle(ctx: Context<SettleAuction>, sequence: u64) -> Result<()> {
    let bid_account_bump: u8 = *ctx.bumps.get("bid").unwrap();

    // avoid auction factory is active check. users should have option to settle current auction regardless of auction factory status.
    let auction_bump: u8 = *ctx.bumps.get("auction").unwrap();
    verify::verify_auction_address_for_factory(
        ctx.accounts.auction_factory.key(),
        ctx.accounts.auction_factory.sequence,
        ctx.accounts.auction.key(),
        auction_bump,
    )?;
    verify::verify_auction_can_be_settled(&ctx.accounts.auction)?;
    verify::verify_auction_has_resource(&ctx.accounts.auction)?;

    let current_num_bids = ctx.accounts.auction.num_bids;
    if current_num_bids == 0 {
        msg!(
            "settling auction with no bids: {:?}",
            ctx.accounts.auction.key()
        );

        settle_empty_auction(ctx, auction_bump, sequence)?;
    } else {
        msg!(
            "settling auction [{}] with winning bid amount = {}",
            ctx.accounts.auction.key(),
            ctx.accounts.bid.amount
        );

        // todo: any additional checks on the supplied bid account?

        verify::verify_treasury(&ctx.accounts.auction_factory, ctx.accounts.treasury.key())?;
        verify::verify_bidder_token_account(
            ctx.accounts.bidder_token_account.to_account_info(),
            &ctx.accounts.auction,
            &ctx.accounts.bid,
            bid_account_bump,
        )?;

        settle_auction(ctx, auction_bump, sequence)?;
    }

    Ok(())
}
