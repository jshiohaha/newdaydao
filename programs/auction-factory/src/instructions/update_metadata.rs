use {
    anchor_lang::prelude::*,
    solana_program::{
        program::invoke_signed,
        pubkey::Pubkey,
        msg
    },
    metaplex_token_metadata::{
        instruction::update_metadata_accounts,
        state::Data,
    },
};

#[derive(Accounts)]
pub struct UpdateMetadata<'info> {
    #[account(mut)] // (quest): should this be mutable?
    pub metadata: AccountInfo<'info>,
    pub update_authority: AccountInfo<'info>,
    #[account(address = spl_token_metadata::id())]
    pub token_metadata_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub fn update_metadata<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, UpdateMetadata<'info>>,
    new_update_authority: Option<Pubkey>,
    data: Option<Data>,
    primary_sale_happened: Option<bool>,
) -> ProgramResult {

    msg!("Invoking update metadata CPI call");

    invoke_signed(
        &update_metadata_accounts(
            *ctx.accounts.token_metadata_program.key,
            *ctx.accounts.metadata.key,
            *ctx.accounts.update_authority.key,
            new_update_authority,
            data,
            primary_sale_happened
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