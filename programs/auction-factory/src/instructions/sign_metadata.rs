use {
    anchor_lang::prelude::*,
    mpl_token_metadata::instruction::sign_metadata,
    solana_program::program::invoke_signed
};

// https://github.com/metaplex-foundation/metaplex-program-library/blob/master/token-metadata/program/src/instruction.rs#L177-L180
#[derive(Accounts)]
pub struct SignMetadata<'info> {
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    pub creator: AccountInfo<'info>,
    #[account(address = spl_token_metadata::id())]
    pub token_metadata_program: AccountInfo<'info>,
}

pub fn sign_token_metadata<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, SignMetadata<'info>>,
) -> ProgramResult {
    invoke_signed(
        &sign_metadata(
            *ctx.accounts.token_metadata_program.key,
            *ctx.accounts.metadata.key,
            *ctx.accounts.creator.key,
        ),
        &[
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.creator.to_account_info(),
        ],
        ctx.signer_seeds,
    )?;

    Ok(())
}

