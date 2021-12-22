use {
    // TODO: work on implementation
    // crate::utils::{assert_initialized, assert_owned_by, spl_token_transfer, TokenTransferParams},
    anchor_lang::{prelude::*, solana_program},
    anchor_spl::token::Token,
    // metaplex_token_metadata::{
    //     instruction::{create_master_edition, create_metadata_accounts, update_metadata_accounts},
    // },
    solana_program::{
        program::{invoke_signed},
        instruction::{AccountMeta, Instruction},
        pubkey::Pubkey,
        sysvar,
    },
    spl_token_metadata::{
        instruction::{update_metadata_accounts, CreateMetadataAccountArgs, MetadataInstruction},
        state::{Creator, Data, Metadata},
    },
    crate::context::{SupplyResource},
    crate::{AUX_SEED}
};


pub fn create_metadata_accounts(
    program_id: Pubkey,
    metadata_account: Pubkey,
    mint: Pubkey,
    mint_authority: Pubkey,
    payer: Pubkey,
    update_authority: Pubkey,
    name: String,
    symbol: String,
    uri: String,
    creators: Option<Vec<Creator>>,
    seller_fee_basis_points: u16,
    update_authority_is_signer: bool,
    is_mutable: bool,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(metadata_account, false),
            AccountMeta::new_readonly(mint, false),
            AccountMeta::new_readonly(mint_authority, true),
            AccountMeta::new(payer, true),
            AccountMeta::new_readonly(update_authority, update_authority_is_signer),
            AccountMeta::new_readonly(solana_program::system_program::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
        ],
        data: MetadataInstruction::CreateMetadataAccount(CreateMetadataAccountArgs {
            data: Data {
                name,
                symbol,
                uri,
                seller_fee_basis_points,
                creators,
            },
            is_mutable,
        })
        .try_to_vec()
        .unwrap(),
    }
}

pub fn create_metadata<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, CreateMetadataAccount<'info>>,
    // ctx: &Context<SupplyResource>,
    name: String,
    symbol: String,
    uri: String,
    creators: Option<Vec<Creator>>,
    seller_fee_basis_points: u16,
    update_authority_is_signer: bool,
    is_mutable: bool,
) -> ProgramResult {
    let ix = create_metadata_accounts(
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
    );

    solana_program::program::invoke_signed(
        &ix,
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

    // let metadata_infos = vec![
    //     ctx.accounts.metadata.to_account_info(),
    //     ctx.accounts.mint.to_account_info(),
    //     ctx.accounts.mint_authority.to_account_info(),
    //     ctx.accounts.payer.to_account_info(),
    //     ctx.accounts.token_metadata_program.to_account_info(),
    //     ctx.accounts.token_program.to_account_info(),
    //     ctx.accounts.system_program.to_account_info(),
    //     ctx.accounts.rent.to_account_info(),
    //     ctx.accounts.update_authority.to_account_info(),
    // ];

    // // let auction_bump = ctx.accounts.auction.bump;
    // // const PREFIX: &str = "candy_machine";

    // // let seeds = [
    // //     &AUX_SEED[..],
    // //     ctx.accounts.auction.authority.as_ref(),
    // //     &[auction_bump]
    // // ];

    // invoke_signed(
    //     &create_metadata_accounts(
    //         *ctx.accounts.token_metadata_program.key,
    //         *ctx.accounts.metadata.key,
    //         *ctx.accounts.mint.key,
    //         *ctx.accounts.mint_authority.key,
    //         *ctx.accounts.payer.key,
    //         *ctx.accounts.update_authority.key,
    //         name,
    //         symbol, // .clone()
    //         uri, // ?quest: can this be a data string representing the json?
    //         creators,
    //         seller_fee_basis_points,
    //         update_authority_is_signer,
    //         is_mutable,
    //     ),
    //     metadata_infos.as_slice(),
    //     // &[&seeds]
    //     ctx.signer_seeds
    // )?;

    Ok(())
}

// pub fn create_master_edition_metadata<'a, 'b, 'c, 'info>(
//     ctx: CpiContext<'a, 'b, 'c, 'info, CreateMasterEditionAccount<'info>>,
//     max_supply: u64
// ) -> ProgramResult {
//     let master_edition_infos = vec![
//         ctx.accounts.master_edition.to_account_info(),
//         ctx.accounts.mint.to_account_info(),
//         ctx.accounts.mint_authority.to_account_info(),
//         ctx.accounts.payer.to_account_info(),
//         ctx.accounts.metadata.to_account_info(),
//         ctx.accounts.token_metadata_program.to_account_info(),
//         ctx.accounts.token_program.to_account_info(),
//         ctx.accounts.system_program.to_account_info(),
//         ctx.accounts.rent.to_account_info(),
//         ctx.accounts.update_authority.to_account_info(),
//     ];

//     // invoke_signed(
//     //     &create_master_edition(
//     //         *ctx.accounts.token_metadata_program.key,
//     //         *ctx.accounts.master_edition.key,
//     //         *ctx.accounts.mint.key,
//     //         *ctx.accounts.update_authority.key,
//     //         *ctx.accounts.mint_authority.key,
//     //         *ctx.accounts.metadata.key,
//     //         *ctx.accounts.payer.key,
//     //         Some(max_supply),
//     //     ),
//     //     master_edition_infos.as_slice(),
//     //     ctx.signer_seeds
//     // )?;

//     Ok(())
// }

// pub fn update_metadata<'a, 'b, 'c, 'info>(
//     ctx: CpiContext<'a, 'b, 'c, 'info, UpdateMetadataAccount<'info>>,
//     new_update_authority: Option<Pubkey>,
//     data: Option<Data>,
//     primary_sale_happened: Option<bool>,
// ) -> ProgramResult {
//     invoke_signed(
//         &update_metadata_accounts(
//             *ctx.accounts.token_metadata_program.key,
//             *ctx.accounts.metadata.key,
//             *ctx.accounts.update_authority.key,
//             new_update_authority,
//             data,
//             primary_sale_happened
//         ),
//         &[
//             ctx.accounts.token_metadata_program.to_account_info(),
//             ctx.accounts.metadata.to_account_info(),
//             ctx.accounts.update_authority.to_account_info()
//         ],
//         ctx.signer_seeds
//     )?;

//     Ok(())
// }

#[derive(Accounts)]
pub struct CreateMetadataAccount<'info> {
    pub payer: AccountInfo<'info>,
    // With the following accounts we aren't using anchor macros because they are CPI'd
    // through to token-metadata which will do all the validations we need on them.
    pub metadata: AccountInfo<'info>,  // ?quest: metadata key (pda of ['metadata', program id, mint id])
    pub mint: AccountInfo<'info>, // mint of the token we are creating metadata for

    pub mint_authority: AccountInfo<'info>,
    pub update_authority: AccountInfo<'info>, // this is the account that will have future ability to update the newly created metadata

    #[account(address = spl_token_metadata::id())]
    pub token_metadata_program: AccountInfo<'info>,
    // pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

// #[derive(Accounts)]
// pub struct CreateMasterEditionAccount<'info> {
//     #[account(mut)]
//     pub payer: Signer<'info>,
//     // With the following accounts we aren't using anchor macros because they are CPI'd
//     // through to token-metadata which will do all the validations we need on them.
//     #[account(mut)]
//     pub metadata: AccountInfo<'info>,  // ?quest: metadata key (pda of ['metadata', program id, mint id])
//     #[account(mut)]
//     pub master_edition: AccountInfo<'info>,
//     #[account(mut)]
//     pub mint: AccountInfo<'info>, // mint of the token we are creating metadata for

//     pub mint_authority: AccountInfo<'info>,
//     pub update_authority: AccountInfo<'info>, // this is the account that will have future ability to update the newly created metadata

//     #[account(address = spl_token_metadata::id())]
//     pub token_metadata_program: AccountInfo<'info>,
//     pub token_program: Program<'info, Token>,
//     pub system_program: Program<'info, System>,
//     pub rent: Sysvar<'info, Rent>,
// }

// #[derive(Accounts)]
// pub struct UpdateMetadataAccount<'info> {
//     #[account(mut)]
//     pub metadata: AccountInfo<'info>, // ?quest: SHOULD THIS BE MUTABLE
//     pub update_authority: AccountInfo<'info>,
//     #[account(address = spl_token_metadata::id())]
//     pub token_metadata_program: AccountInfo<'info>,
//     pub system_program: Program<'info, System>,
// }
