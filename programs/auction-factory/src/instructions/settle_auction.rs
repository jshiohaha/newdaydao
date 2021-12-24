use anchor_lang::prelude::*;

// local imports
use crate::structs::auction::Auction;
use crate::error::ErrorCode;
use crate::instructions::transfer::{spl_token_transfer, TokenTransferParams};
use crate::SettleAuction;
use crate::AUX_SEED;

pub fn transfer_resource_to_winner(
    ctx: Context<SettleAuction>,
) -> ProgramResult {
    let authority_key = ctx.accounts.auction.authority.key();
    let seq = ctx.accounts.auction.sequence.to_string();
    let bump = ctx.accounts.auction.bump;

    let seeds = &[
        AUX_SEED.as_ref(),
        authority_key.as_ref(),
        seq.as_ref(),
        &[bump]
    ];

    spl_token_transfer(TokenTransferParams {
        source: ctx.accounts.auction_token_account.clone(),
        destination: ctx.accounts.bidder_token_account.to_account_info(),
        authority: ctx.accounts.auction.to_account_info().clone(),
        authority_signer_seeds: seeds,
        token_program: ctx.accounts.token_program.to_account_info(),
        amount: 1,
    })?;

    Ok(())
}

pub fn transfer_auction_lamports_to_treasury(
    ctx: Context<SettleAuction>
) -> ProgramResult {

    let amount = ctx.accounts.auction.amount;
    let treasury = &ctx.accounts.treasury;
    let auction_as_payer = &ctx.accounts.auction.to_account_info();

    ctx.accounts.auction.settle();

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
        &[bump]
    ];

    spl_token_transfer(TokenTransferParams {
        source: ctx.accounts.auction_token_account.clone(),
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

    ctx.accounts.auction.settle();

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

    // =====================

    &ctx.accounts.auction.settle();

    Ok(())
}
