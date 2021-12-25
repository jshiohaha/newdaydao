use {
    anchor_lang::prelude::*,
    solana_program::{
        program::invoke_signed,
        msg
    },
    metaplex_token_metadata::instruction::update_metadata_accounts,
};

#[derive(Accounts)]
pub struct UpdateMetadata<'info> {
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    pub update_authority: AccountInfo<'info>,
    #[account(address = spl_token_metadata::id())]
    pub token_metadata_program: AccountInfo<'info>,
}

pub fn update_metadata_after_primary_sale<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, UpdateMetadata<'info>>,
) -> ProgramResult {

    msg!("Invoking update metadata CPI call");

    invoke_signed(
        &update_metadata_accounts(
            *ctx.accounts.token_metadata_program.key,
            *ctx.accounts.metadata.key,
            *ctx.accounts.update_authority.key,
            None,       // update authority stays the same
            None,       // no data change
            Some(true), // primary_sale_happened
        ),
        &[
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.update_authority.to_account_info(),
        ],
        ctx.signer_seeds,
    )?;

    msg!("Updated metadata");

    Ok(())
}