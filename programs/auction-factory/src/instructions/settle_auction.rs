use {
    crate::{
        constant::AUX_SEED,
        instructions::transfer::{spl_token_transfer, transfer_lamports, TokenTransferParams},
        SettleAuction,
    },
    anchor_lang::prelude::*,
    anchor_spl::token,
};

pub fn handle_empty_auction(ctx: Context<SettleAuction>, bump: u8, sequence: u64) -> Result<()> {
    let seq_str = sequence.to_string();
    token::burn(
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

pub fn handle_auction(ctx: Context<SettleAuction>, bump: u8, sequence: u64) -> Result<()> {
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
