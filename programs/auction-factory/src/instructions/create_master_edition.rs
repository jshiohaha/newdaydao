use {
    anchor_lang::prelude::*,
    anchor_spl::token::Token,
    mpl_token_metadata::instruction::create_master_edition_v3,
    solana_program::program::invoke_signed
};

#[derive(Accounts)]
pub struct CreateMasterEdition<'info> {
    pub payer: AccountInfo<'info>,
    // the following accounts aren't using anchor macros because CPI invocation
    // will do the required validations.
    pub metadata: AccountInfo<'info>,
    pub master_edition: AccountInfo<'info>,
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
    ctx: CpiContext<'a, 'b, 'c, 'info, CreateMasterEdition<'info>>,
) -> ProgramResult {
    invoke_signed(
        &create_master_edition_v3(
            *ctx.accounts.token_metadata_program.key,
            *ctx.accounts.master_edition.key,
            *ctx.accounts.mint.key,
            *ctx.accounts.update_authority.key,
            *ctx.accounts.mint_authority.key,
            *ctx.accounts.metadata.key,
            *ctx.accounts.payer.key,
            Some(0),
        ),
        &[
            ctx.accounts.master_edition.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.mint_authority.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
            ctx.accounts.update_authority.to_account_info(),
        ],
        ctx.signer_seeds,
    )?;

    Ok(())
}
