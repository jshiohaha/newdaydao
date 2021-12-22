use {
    crate::context::SupplyResource,
    crate::AUX_SEED,
    // TODO: work on implementation
    // crate::utils::{assert_initialized, assert_owned_by, spl_token_transfer, TokenTransferParams},
    anchor_lang::{prelude::*, solana_program},
    anchor_spl::token::Token,
    metaplex_token_metadata::{
        instruction::{create_master_edition, create_metadata_accounts, update_metadata_accounts},
        state::{Creator, Data, Metadata},
    },
    solana_program::{
        instruction::{AccountMeta, Instruction},
        program::invoke_signed,
        pubkey::Pubkey,
        sysvar,
        // log::sol_log_compute_units,
    },
};

pub fn create_metadata<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, CreateMetadata<'info>>,
    name: String,
    symbol: String,
    uri: String,
    creators: Option<Vec<Creator>>,
    seller_fee_basis_points: u16,
    update_authority_is_signer: bool,
    is_mutable: bool,
) -> ProgramResult {
    invoke_signed(
        &create_metadata_accounts(
            *ctx.accounts.token_metadata_program.key,
            *ctx.accounts.metadata.key,
            ctx.accounts.mint.key(),
            ctx.accounts.mint_authority.key(),
            ctx.accounts.payer.key(),
            ctx.accounts.update_authority.key(),
            name,
            symbol,
            uri,
            creators,
            seller_fee_basis_points,
            update_authority_is_signer,
            is_mutable,
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

pub fn create_master_edition_metadata<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, CreateMasterEdition<'info>>,
    max_supply: u64,
) -> ProgramResult {
    invoke_signed(
        &create_master_edition(
            *ctx.accounts.token_metadata_program.key,
            *ctx.accounts.master_edition.key,
            *ctx.accounts.mint.key,
            *ctx.accounts.update_authority.key,
            *ctx.accounts.mint_authority.key,
            *ctx.accounts.metadata.key,
            *ctx.accounts.payer.key,
            Some(max_supply),
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
            ctx.accounts.update_authority.to_account_info(), // prev: candy_machine.to_account_info()
        ],
        ctx.signer_seeds,
    )?;

    Ok(())
}

pub fn update_metadata<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, UpdateMetadata<'info>>,
    new_update_authority: Option<Pubkey>,
    data: Option<Data>,
    primary_sale_happened: Option<bool>,
) -> ProgramResult {

    invoke_signed(
        &update_metadata_accounts(
            *ctx.accounts.token_metadata_program.key,
            *ctx.accounts.metadata.key,
            *ctx.accounts.update_authority.key, // candy_machine.key()
            new_update_authority,
            None,
            Some(true),
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

#[derive(Accounts)]
pub struct CreateMetadata<'info> {
    pub payer: AccountInfo<'info>,
    // With the following accounts we aren't using anchor macros because they are CPI'd
    // through to token-metadata which will do all the validations we need on them.
    pub metadata: AccountInfo<'info>, // ?quest: metadata key (pda of ['metadata', program id, mint id])
    pub mint: AccountInfo<'info>,     // mint of the token we are creating metadata for

    pub mint_authority: AccountInfo<'info>,
    pub update_authority: AccountInfo<'info>, // this is the account that will have future ability to update the newly created metadata

    #[account(address = spl_token_metadata::id())]
    pub token_metadata_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CreateMasterEdition<'info> {
    pub payer: AccountInfo<'info>,
    // With the following accounts we aren't using anchor macros because they are CPI'd
    // through to token-metadata which will do all the validations we need on them.
    pub metadata: AccountInfo<'info>,  // ?quest: metadata key (pda of ['metadata', program id, mint id])
    pub master_edition: AccountInfo<'info>,
    pub mint: AccountInfo<'info>, // mint of the token we are creating metadata for
    pub mint_authority: AccountInfo<'info>,
    pub update_authority: AccountInfo<'info>, // this is the account that will have future ability to update the newly created metadata
    #[account(address = spl_token_metadata::id())]
    pub token_metadata_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateMetadata<'info> {
    #[account(mut)]
    pub metadata: AccountInfo<'info>, // ?quest: SHOULD THIS BE MUTABLE
    pub update_authority: AccountInfo<'info>,
    #[account(address = spl_token_metadata::id())]
    pub token_metadata_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
