use {
    crate::{constant::AUX_SEED, context::CreateTokenMint},
    anchor_lang::prelude::*,
    anchor_spl::token,
};

// custom mint_to instruction since a PDA can only sign from an on-chain program.
// and, the mint_to ixn requires the authority to sign in the case of no multisig.
// source: https://github.com/solana-labs/solana-program-library/blob/e29bc53c5f572073908fb89c6812d22f6f5eecf5/token/js/client/token.js#L1731
pub fn handle(ctx: &Context<CreateTokenMint>, bump: u8, sequence: u64) -> Result<()> {
    let seq_str = sequence.to_string();
    token::mint_to(
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
