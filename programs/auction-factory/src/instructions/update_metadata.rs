use {
    anchor_lang::prelude::*,
    mpl_token_metadata::instruction::update_metadata_accounts_v2,
    solana_program::program::invoke_signed
};

#[derive(Accounts)]
pub struct UpdateMetadata<'info> {
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    pub update_authority: AccountInfo<'info>,
    #[account(address = spl_token_metadata::id())]
    pub token_metadata_program: AccountInfo<'info>,
}

pub fn handle<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, UpdateMetadata<'info>>,
) -> ProgramResult {
    invoke_signed(
        &update_metadata_accounts_v2(
            *ctx.accounts.token_metadata_program.key,
            *ctx.accounts.metadata.key,
            *ctx.accounts.update_authority.key,
            None,       // update authority stays the same
            None,       // no data change
            Some(true), // primary_sale_happened
            None,       // no change to is_mutable
        ),
        &[
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.update_authority.to_account_info(),
        ],
        ctx.signer_seeds,
    )?;

    Ok(())
}
