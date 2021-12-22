use anchor_lang::prelude::*;
use anchor_spl::token;
// use crate::error::ErrorCode;
use solana_program::msg;

use crate::error::ErrorCode;
use crate::context::SupplyResource;
use crate::structs::auction::Auction;
// use crate::structs::auction_factory::AuctionFactory;
use crate::instructions::manage_metadata::{create_metadata}; //create_master_edition_metadata
use spl_token_metadata::state::Creator;

use crate::{AUX_FACTORY_SEED, AUX_SEED};

pub fn mint_token_to_new_member(
    ctx: &Context<SupplyResource>,
    seeds: &[&[u8]; 2],
) -> ProgramResult {
    msg!("mint token entry point");

    return Err(ErrorCode::GeneralError.into());

    // token::mint_to(
    //     ctx.accounts
    //         .into_mint_token_context()
    //         .with_signer(&[seeds]),
    //     1,
    // )?;

    return Err(ErrorCode::GeneralError.into());

    Ok(())
}

pub fn create_token_metadata(
    ctx: &Context<SupplyResource>,
    seeds: &[&[u8]; 2],
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

    let auction_bump = ctx.accounts.auction.bump;

    // // 2
    // create_metadata(
    //     ctx.accounts
    //         .into_create_metadata_context()
    //         .with_signer(&[seeds]),
    //     name,
    //     symbol,
    //     uri,
    //     Some(creators),
    //     seller_fee_basis_points,
    //     update_authority_is_signer,
    //     is_mutable
    // )?;

    Ok(())
}

// pub fn supply(
//     ctx: &Context<SupplyResource>,
//     // bump: u8,
//     // resource: Pubkey,
//     // auction: &mut Auction,
// ) -> ProgramResult {
//     // overview
//     // 1. create ze datas
//     // 2. create ze metadata account
//     // 3. create ze master edition metadata account
//     // 4. finish minting token (ixns supplied via program invocation)

//     // 1
//     let name: String = String::from("NAME");
//     // name.push_str(&session);
//     let symbol: String = String::from("SYMB");
//     let uri: String = String::from("https://arweave.net/EEsj8ZXEZaboA7SxVE9tim4eVje0sygduBbDxV1Lws0");

//     // who do we want the creator address to be?; maybe some treasury?
//     let creators = vec![Creator {
//         address: ctx.accounts.auction.authority,
//         verified: true, // verified by default since the auction factory is the only creator
//         share: 100,
//     }];

//     let seller_fee_basis_points: u16 = 420; // heh
//     let update_authority_is_signer: bool = true;
//     let is_mutable: bool = true;

//     let auction_bump = ctx.accounts.auction.bump;
//     let aux_seeds = &[
//         &AUX_SEED[..],
//         &[auction_bump]
//     ];

//     // 2
//     create_metadata(
//         ctx.accounts
//             .into_create_metadata_context()
//             .with_signer(&[aux_seeds]),
//         name,
//         symbol,
//         uri,
//         Some(creators),
//         seller_fee_basis_points,
//         update_authority_is_signer,
//         is_mutable
//     )?;

//     // // 3
//     // create_master_edition_metadata(
//     //     ctx.accounts
//     //         .into_create_master_edition_metadata_context()
//     //         .with_signer(&[&[
//     //             &AUX_SEED[..],
//     //             &[auction_bump]
//     //         ]]),
//     //         0 // max supply
//     // )?;

//     // 4
//     Ok(())
// }
