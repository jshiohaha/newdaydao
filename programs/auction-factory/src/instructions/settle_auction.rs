use {
    anchor_lang::prelude::*,
    anchor_spl::token,
};

// local imports
use crate::{
    SettleAuction,
    constant::AUX_SEED,
    error::ErrorCode,
    instructions::transfer::{spl_token_transfer, TokenTransferParams}
};

pub fn settle_empty_auction(ctx: Context<SettleAuction>) -> ProgramResult {
    let authority_key = ctx.accounts.auction.authority.key();
    let seq = ctx.accounts.auction.sequence.to_string();
    let bump = ctx.accounts.auction.bump;

    token::burn(
        ctx.accounts
            .into_burn_token_context()
            .with_signer(&[&[
                AUX_SEED.as_ref(),
                authority_key.as_ref(),
                seq.as_ref(),
                &[bump],
            ]]),
        1
    )?;

    ctx.accounts.auction.settle();

    Ok(())
}

pub fn settle(ctx: Context<SettleAuction>) -> ProgramResult {
    let authority_key = ctx.accounts.auction.authority.key();
    let seq = ctx.accounts.auction.sequence.to_string();
    let bump = ctx.accounts.auction.bump;

    let seeds = &[
        AUX_SEED.as_ref(),
        authority_key.as_ref(),
        seq.as_ref(),
        &[bump],
    ];

    spl_token_transfer(TokenTransferParams {
        source: ctx.accounts.auction_token_account.to_account_info(),
        destination: ctx.accounts.bidder_token_account.to_account_info(),
        authority: ctx.accounts.auction.to_account_info().clone(),
        authority_signer_seeds: seeds,
        token_program: ctx.accounts.token_program.to_account_info(),
        amount: 1,
    })?;

    // ============================

    let amount = ctx.accounts.auction.amount;
    let treasury = &ctx.accounts.treasury;
    let auction_as_payer = &ctx.accounts.auction.to_account_info();

    let amount_after_deduction: u64 = auction_as_payer
        .lamports()
        .checked_sub(amount)
        .ok_or(ErrorCode::InsufficientAccountBalance)?;

    // sub from auction
    **auction_as_payer.lamports.borrow_mut() = amount_after_deduction;

    // add lamports to treasury account
    **treasury.lamports.borrow_mut() = treasury
        .lamports()
        .checked_add(amount)
        .ok_or(ErrorCode::NumericalOverflowError)?;

    // ============================

    // mark auction as settled
    ctx.accounts.auction.settle();

    Ok(())
}
