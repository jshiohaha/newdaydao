use {
    anchor_lang::prelude::*,
    anchor_spl::token,
};

// local imports
use crate::{
    AUX_SEED,
    context::SettleAuction,
};

pub fn burn(
    ctx: &Context<SettleAuction>,
) -> ProgramResult {    
    let authority_key = ctx.accounts.auction.authority.key();
    let sequence = ctx.accounts.auction.sequence.to_string();
    let bump = ctx.accounts.auction.bump;

    token::burn(
        ctx.accounts
            .into_burn_token_context()
            .with_signer(&[&[
                AUX_SEED.as_ref(),
                authority_key.as_ref(),
                sequence.as_ref(),
                &[bump]
            ]]),
        1
    )?;

    Ok(())
}