use {anchor_lang::prelude::*, solana_program::msg};

mod context;
mod error;
mod instructions;
mod structs;
mod util;
mod verify;

use context::*;
use error::ErrorCode;
use structs::auction::Auction;
use structs::auction_factory::{AuctionFactory, AuctionFactoryData};
use structs::metadata::get_metadata_info;

declare_id!("AmLmnFHadSevcarXPbh2a8hF9v4yTJ5gUmDwZoo42RsD");

// prefix used in PDA derivations to avoid collisions with other programs.
const AUX_FACTORY_SEED: &[u8] = b"aux_fax";
const AUX_SEED: &[u8] = b"aux";
const AUX_FAX_PROGRAM_ID: &str = "AmLmnFHadSevcarXPbh2a8hF9v4yTJ5gUmDwZoo42RsD";
const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID: &str =
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

// ToggleAuctionFactory --> auction factory, authority is signer -> verify matches
// ModifyAuctionFactoryData

#[program]
pub mod auction_factory {
    use super::*;

    pub fn initialize_auction_factory(
        ctx: Context<InitializeAuctionFactory>,
        bump: u8,
        data: AuctionFactoryData,
    ) -> ProgramResult {
        ctx.accounts.auction_factory.init(
            bump,
            *ctx.accounts.payer.key,
            *ctx.accounts.treasury.key,
            data,
        );

        Ok(())
    }

    pub fn toggle_auction_factory_status(
        ctx: Context<ModifyAuctionFactory>,
        _bump: u8,
    ) -> ProgramResult {
        verify::verify_auction_factory_authority(
            *ctx.accounts.payer.key,
            ctx.accounts.auction_factory.authority,
        )?;

        let auction_factory_status = ctx.accounts.auction_factory.is_active;
        let auction_factory = &mut ctx.accounts.auction_factory;

        if auction_factory_status {
            msg!("Pausing auction factory");
            auction_factory.pause();
        } else {
            msg!("Resuming auction factory");
            auction_factory.resume();
        }

        Ok(())
    }

    pub fn modify_auction_factory_data(
        ctx: Context<ModifyAuctionFactory>,
        _bump: u8,
        data: AuctionFactoryData,
    ) -> ProgramResult {
        verify::verify_auction_factory_authority(
            *ctx.accounts.payer.key,
            ctx.accounts.auction_factory.authority,
        )?;

        let auction_factory = &mut ctx.accounts.auction_factory;

        auction_factory.update_data(data);

        Ok(())
    }

    pub fn update_authority(
        ctx: Context<UpdateAuctionFactoryAuthority>,
        _bump: u8,
    ) -> ProgramResult {
        verify::verify_auction_factory_authority(
            *ctx.accounts.payer.key,
            ctx.accounts.auction_factory.authority,
        )?;

        let auction_factory = &mut ctx.accounts.auction_factory;

        auction_factory.update_authority(*ctx.accounts.new_authority.key);

        Ok(())
    }

    pub fn update_treasury(ctx: Context<UpdateAuctionFactoryTreasury>, _bump: u8) -> ProgramResult {
        verify::verify_auction_factory_authority(
            *ctx.accounts.payer.key,
            ctx.accounts.auction_factory.authority,
        )?;

        // (quest): can we check that a treasury account exists?
        // if not, treasury funds will be lost again until updated.

        let auction_factory = &mut ctx.accounts.auction_factory;

        auction_factory.update_treasury(*ctx.accounts.treasury.key);

        Ok(())
    }

    // auction factory will be the creator of all NFTs and thus receive any secondary royalties.
    // we need this functionality to extract royalties from the auction factory
    // to the designated treasury.
    pub fn transfer_lamports_to_treasury(ctx: Context<ModifyAuctionFactory>, _bump: u8) -> ProgramResult {
        verify::verify_auction_factory_authority(
            *ctx.accounts.payer.key,
            ctx.accounts.auction_factory.authority,
        )?;

        let auction_factory = &mut ctx.accounts.auction_factory;

        // TODO: transfer lamports from auction_factory PDA to treasury.
        // reminder: don't over-transfer & leave account empty so that garbage
        // collector automatically closes the account.
        // (quest): how to calculate number of lamports to transfer?

        Ok(())
    }

    // only used as a custom mint_to instruction since the ixn requires the authority to sign
    // in the case of no multisig. and, a PDA can only sign from an on-chain
    // program. Token source: https://github.com/solana-labs/solana-program-library/blob/e29bc53c5f572073908fb89c6812d22f6f5eecf5/token/js/client/token.js#L1731
    pub fn mint_to_auction(
        ctx: Context<CreateTokenMint>,
        _auction_factory_bump: u8,
        _auction_bump: u8,
        _sequence: u64
    ) -> ProgramResult {
        instructions::mint_token::mint_to_auction(&ctx)?;

        Ok(())
    }

    pub fn create_first_auction(
        ctx: Context<CreateFirstAuction>,
        _auction_factory_bump: u8,
        auction_bump: u8,
        _sequence: u64
    ) -> ProgramResult {
        verify::verify_auction_factory_is_active(&ctx.accounts.auction_factory)?;

        verify::verify_auction_factory_for_first_auction(&ctx.accounts.auction_factory)?;

        verify::verify_auction_address_for_factory(
            ctx.accounts.auction_factory.get_current_sequence(),
            ctx.accounts.auction_factory.authority.key(),
            ctx.accounts.auction.key(),
        )?;

        instructions::create_auction::create(
            auction_bump,
            &mut ctx.accounts.auction,
            &mut ctx.accounts.auction_factory,
        )?;

        Ok(())
    }

    pub fn create_next_auction(
        ctx: Context<CreateNextAuction>,
        _auction_factory_bump: u8,
        _current_auction_bump: u8,
        next_auction_bump: u8,
        _current_seq: u64,
        _next_seq: u64
    ) -> ProgramResult {
        verify::verify_auction_factory_is_active(&ctx.accounts.auction_factory)?;

        verify::verify_auction_address_for_factory(
            ctx.accounts.auction_factory.get_current_sequence(),
            ctx.accounts.auction_factory.authority.key(),
            ctx.accounts.current_auction.key(),
        )?;

        // ensure settled auction before creating a new auction, if we are past the first auction
        verify::verify_current_auction_is_over(&ctx.accounts.current_auction)?;

        instructions::create_auction::create(
            next_auction_bump,
            &mut ctx.accounts.next_auction,
            &mut ctx.accounts.auction_factory,
        )?;

        Ok(())
    }

    // should always call after first auction is initiated. otherwise, will throw an error.
    pub fn supply_resource_to_auction(
        ctx: Context<SupplyResource>,
        _auction_factory_bump: u8,
        _auction_bump: u8,
        _sequence: u64
) -> ProgramResult {
        let auction_factory_sequence = ctx.accounts.auction_factory.sequence;

        verify::verify_auction_factory_is_active(&ctx.accounts.auction_factory)?;

        verify::verify_auction_address_for_factory(
            ctx.accounts.auction_factory.get_current_sequence(),
            ctx.accounts.auction_factory.authority.key(),
            ctx.accounts.auction.key(),
        )?;

        verify::verify_auction_resource_dne(&ctx.accounts.auction)?;

        // // creatotr is auction factory account since treasury can change.
        // // we will include an on-chain function to dump lamports from auction
        // // factory PDA to treasury.
        // let metadata_info = get_metadata_info(ctx.accounts.auction_factory.key());

        // let auction_seeds = &[&AUX_SEED[..], &[ctx.accounts.auction.bump]];
        // instructions::create_metadata::create_metadata(
        //     ctx.accounts
        //         .into_create_metadata_context()
        //         .with_signer(&[auction_seeds]),
        //     metadata_info,
        // )?;

        // instructions::create_master_edition::create_master_edition_metadata(
        //     ctx.accounts
        //         .into_create_master_edition_metadata_context()
        //         .with_signer(&[auction_seeds]),
        // )?;

        let auction = &mut ctx.accounts.auction;
        auction.add_resource(ctx.accounts.mint.key());

        Ok(())
    }

    pub fn place_bid(
        ctx: Context<PlaceBid>,
        _auction_factory_bump: u8,
        _auction_bump: u8,
        _sequence: u64,
        amount: u64
    ) -> ProgramResult {
        verify::verify_auction_factory_is_active(&ctx.accounts.auction_factory)?;

        verify::verify_auction_address_for_factory(
            ctx.accounts.auction_factory.get_current_sequence(),
            ctx.accounts.auction_factory.authority.key(),
            ctx.accounts.auction.key(),
        )?;

        verify::verify_bidder_has_sufficient_account_balance(
            ctx.accounts.bidder.to_account_info(),
            amount,
        )?;

        verify::verify_bidder_not_already_winning(
            ctx.accounts.auction.bidder,
            ctx.accounts.bidder.key(),
        )?;

        verify::verify_bid_for_auction(
            &ctx.accounts.auction_factory,
            &ctx.accounts.auction,
            amount,
        )?;

        instructions::place_bid::transfer_bid_amount(&ctx, amount)?;

        instructions::place_bid::return_losing_bid_amount(&ctx)?;

        instructions::place_bid::place(
            amount,
            ctx.accounts.bidder.key(),
            &mut ctx.accounts.auction,
        )?;

        Ok(())
    }

    pub fn settle_auction(
        ctx: Context<SettleAuction>,
        bidder_account_bump: u8,
        _auction_factory_bump: u8,
        _auction_bump: u8,
        _sequence: u64
    ) -> ProgramResult {
        // we don't check if auction factory is active here because
        // we should be able to settle any ongoing auction even if
        // auction factory is paused.

        let winning_bid_amount = ctx.accounts.auction.amount;

        verify::verify_auction_address_for_factory(
            ctx.accounts.auction_factory.get_current_sequence(),
            ctx.accounts.auction_factory.authority.key(),
            ctx.accounts.auction.key(),
        )?;

        verify::verify_auction_can_be_settled(&ctx.accounts.auction)?;

        verify::verify_treasury(&ctx.accounts.auction_factory, ctx.accounts.treasury.key())?;

        verify::verify_bidder_token_account(
            ctx.accounts.bidder_token_account.to_account_info(),
            &ctx.accounts.auction,
            bidder_account_bump,
        )?;

        // update token metadata so that primary_sale_happened = true
        // instructions::update_metadata::update_metadata(
        //     ctx.accounts
        //         .into_update_metadata_authority()
        //         .with_signer(&[seed]),
        //     None,       // update authority stays the same
        //     None,       // no Data change
        //     Some(true), // primary_sale_happened
        // );

        instructions::settle_auction::settle(ctx)?;

        Ok(())
    }
}
