use anchor_lang::prelude::*;
use anchor_spl::token;
use solana_program::msg;

use crate::error::ErrorCode;
use crate::context::SupplyResource;
use crate::structs::auction::Auction;
// use crate::structs::auction_factory::AuctionFactory;
use crate::instructions::manage_metadata::{create_metadata,create_master_edition_metadata};
use metaplex_token_metadata::state::Creator;

use crate::{AUX_FACTORY_SEED, AUX_SEED};

pub fn mint_token(
    ctx: &Context<SupplyResource>,
    // seeds: &[&[u8]; 2],
) -> ProgramResult {
    msg!("mint token entry point");

    token::mint_to(
        ctx.accounts
            .into_mint_token_context()
            .with_signer(&[&[
                &AUX_SEED[..],
                &[ctx.accounts.auction.bump]
            ]]),
            1,
    )?;

    msg!("minted token 🟩");

    Ok(())
}

pub fn create_token_metadata(
    ctx: &Context<SupplyResource>,
) -> ProgramResult {
    msg!("create token metadata entrypoint");

    let name: String = String::from("NAME");
    // name.push_str(&session);
    let symbol: String = String::from("SYMB");
    let uri: String = String::from("https://arweave.net/EEsj8ZXEZaboA7SxVE9tim4eVje0sygduBbDxV1Lws0");

    // who do we want the creator address to be?; maybe some treasury?
    let creators = vec![Creator {
        address: ctx.accounts.auction.authority,
        verified: true, // verified by default since the auction factory is the only creator
        share: 100,
    }];

    let seller_fee_basis_points: u16 = 420; // heh
    let update_authority_is_signer: bool = true;
    let is_mutable: bool = true;

    // 2
    create_metadata(
        ctx
            .accounts
                .into_create_metadata_context()
                .with_signer(&[&[
                    &AUX_SEED[..],
                    &[ctx.accounts.auction.bump]
                ]]),
        name,
        symbol,
        uri,
        Some(creators),
        seller_fee_basis_points,
        update_authority_is_signer,
        is_mutable
    )?;

    Ok(())
}

pub fn create_metadata_master_edition(
    ctx: &Context<SupplyResource>,
) -> ProgramResult {
    // 3
    create_master_edition_metadata(
        ctx.accounts
            .into_create_master_edition_metadata_context()
            .with_signer(&[&[
                &AUX_SEED[..],
                &[ctx.accounts.auction.bump]
            ]]),
            0 // max supply
    )?;

    // 4
    Ok(())
}
