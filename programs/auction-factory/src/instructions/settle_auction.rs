use anchor_lang::prelude::*;

// use crate::error::ErrorCode;
// use crate::instructions::manage_metadata::update_metadata;
// use crate::instructions::transfer::{transfer_from_pda, transfer_spl_token_from_pda};
// use crate::structs::auction::Auction;
// use crate::structs::auction_factory::AuctionFactory;

use crate::SettleAuction;

// transfer_resource_to_winner

pub fn settle(_ctx: &Context<SettleAuction>) -> ProgramResult {
    // 1. transfer monies from auction pda to treasury
    // 2. transfer resource to winner
    // createAssociatedAccount
    // spl-transfer
    // 3. update metadata to primary sale happened

    // 1: transfer monies from auction to treasury
    // transfer_from_pda(
    //     ctx.accounts
    //         .into_transfer_lamports_to_treasury()
    //         .with_signer(&[&[
    //                 &AUX_SEED[..],
    //                 &[auction.bump]
    //         ]]),
    //     auction.amount,
    // )?;

    // 2: transfer resource to winner
    // transfer_spl_token_from_pda(
    //     ctx.accounts
    //         .into_transfer_resource_to_winner_context()
    //         .with_signer(&[&[
    //             &AUX_SEED[..],
    //             &[auction.bump]
    //         ]]),
    //     1
    // )?;

    // 3; prereq is into_update_metadata_authority
    // update_metadata(
    //     ctx.accounts
    //         .into_update_metadata_authority()
    //         .with_signer(&[&[
    //             &AUX_SEED[..],
    //             &[auction.bump]
    //         ]]),
    //     None, // update authority stays the same
    //     None,
    //     true // primary_sale_happened
    // );

    // let auction = &mut ctx.accounts.auction;
    // auction
    //     .settle();

    Ok(())
}
