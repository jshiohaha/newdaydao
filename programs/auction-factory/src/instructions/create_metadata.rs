use {
    crate::structs::metadata::MetadataInfo,
    anchor_lang::prelude::*,
    anchor_spl::token::Token,
    mpl_token_metadata::instruction::create_metadata_accounts_v2,
    solana_program::program::invoke_signed
};

#[derive(Accounts)]
pub struct CreateMetadata<'info> {
    pub payer: AccountInfo<'info>,
    // the following accounts aren't using anchor macros because CPI invocation
    // will do the required validations.
    pub metadata: AccountInfo<'info>,
    // mint address the token with which metadata will be associated
    pub mint: AccountInfo<'info>,
    pub mint_authority: AccountInfo<'info>,
    // account with authority to update metadata, if mutable
    pub update_authority: AccountInfo<'info>,
    #[account(address = spl_token_metadata::id())]
    pub token_metadata_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handle<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, CreateMetadata<'info>>,
    metadata_info: MetadataInfo,
) -> ProgramResult {
    invoke_signed(
        &create_metadata_accounts_v2(
            *ctx.accounts.token_metadata_program.key,
            *ctx.accounts.metadata.key,
            ctx.accounts.mint.key(),
            ctx.accounts.mint_authority.key(),
            ctx.accounts.payer.key(),
            ctx.accounts.update_authority.key(),
            metadata_info.name,
            metadata_info.symbol,
            metadata_info.uri,
            metadata_info.creators,
            metadata_info.seller_fee_basis_points,
            metadata_info.update_authority_is_signer,
            metadata_info.is_mutable,
            metadata_info.collection,
            metadata_info.uses,
        ),
        &[
            ctx.accounts.metadata.clone(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.mint_authority.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.update_authority.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
        ctx.signer_seeds,
    )?;

    Ok(())
}
