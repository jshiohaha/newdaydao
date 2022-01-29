use {
    anchor_lang::prelude::*,
    anchor_spl::token,
};

// local imports
use crate::{
    constant::AUX_SEED,
    context::CreateTokenMint,
};

pub fn mint_to_auction(
    ctx: &Context<CreateTokenMint>,
) -> ProgramResult {    
    let auction_factory_key = ctx.accounts.auction_factory.key();
    let sequence = ctx.accounts.auction.sequence.to_string();
    let bump = ctx.accounts.auction.bump;

    let authority_seeds = [
        AUX_SEED.as_bytes(),
        auction_factory_key.as_ref(),
        sequence.as_bytes(),
        &[bump]
    ];

    // equivalent to the web3 SystemProgram::createMintToInstruction call
    // https://github.com/solana-labs/solana-program-library/blob/e29bc53c5f572073908fb89c6812d22f6f5eecf5/token/js/client/token.js#L1731
    token::mint_to(
        ctx.accounts
            .into_mint_token_context()
            .with_signer(&[&authority_seeds]),
            1,
    )?;

    Ok(())
}