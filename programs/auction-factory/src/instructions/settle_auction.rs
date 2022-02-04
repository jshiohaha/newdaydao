use {
    anchor_lang::prelude::*,
    anchor_spl::token,
    crate::{
        SettleAuction,
        constant::AUX_SEED,
        instructions::transfer::{spl_token_transfer, TokenTransferParams, transfer_lamports}
    }
};

pub fn settle_empty_auction(ctx: Context<SettleAuction>) -> ProgramResult {
    let auction_factory_key = ctx.accounts.auction_factory.key();
    let sequence = ctx.accounts.auction.sequence.to_string();
    let bump = ctx.accounts.auction.bump;

    token::burn(
        ctx.accounts
            .into_burn_token_context()
            .with_signer(&[&[
                AUX_SEED.as_bytes(),
                auction_factory_key.as_ref(),
                sequence.as_bytes(),
                &[bump],
            ]]),
        1
    )?;

    ctx.accounts.auction.settle();

    Ok(())
}

pub fn settle(ctx: Context<SettleAuction>) -> ProgramResult {
    let auction_factory_key = ctx.accounts.auction_factory.key();
    let sequence = ctx.accounts.auction.sequence.to_string();
    let bump = ctx.accounts.auction.bump;

    let seeds = &[
        AUX_SEED.as_bytes(),
        auction_factory_key.as_ref(),
        sequence.as_bytes(),
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

    transfer_lamports(
        &ctx.accounts.auction.to_account_info(),
        &ctx.accounts.treasury.to_account_info(),
        ctx.accounts.auction.amount
    )?;

    // ============================

    // mark auction as settled
    ctx.accounts.auction.settle();

    Ok(())
}
