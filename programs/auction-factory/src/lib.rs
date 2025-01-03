mod constant;
mod context;
mod error;
mod instructions;
mod structs;
mod util;
mod verify;

use {
    anchor_lang::prelude::*,
    anchor_spl::token,
    constant::*,
    context::*,
    solana_program::msg,
    std::convert::TryInto,
    structs::{
        auction::Auction,
        auction_factory::{AuctionFactory, AuctionFactoryData},
    },
    util::{
        general::get_available_lamports,
        metadata::provide_metadata,
    },
    error::ErrorCode
};

declare_id!("2jbfTkQ4DgbSZtb8KTq61v2ox8s1GCuGebKa1EPq3tbY");

#[program]
pub mod auction_factory {
    use super::*;

    /// ===================================
    /// unrestricted instructions       ///
    /// ===================================

    pub fn mint_to_auction(
        ctx: Context<CreateTokenMint>,
        _auction_factory_bump: u8,
        _seed: String,
        auction_bump: u8,
        sequence: u64,
    ) -> ProgramResult {
        instructions::mint_token::handle(&ctx, auction_bump, sequence)?;

        Ok(())
    }

    pub fn create_first_auction(
        ctx: Context<CreateFirstAuction>,
        _auction_factory_bump: u8,
        _seed: String,
        auction_bump: u8,
        _sequence: u64,
    ) -> ProgramResult {
        create_auction_helper(
            &mut ctx.accounts.auction_factory,
            auction_bump,
            &mut ctx.accounts.auction,
            None,
        )?;

        Ok(())
    }

    pub fn create_next_auction(
        ctx: Context<CreateNextAuction>,
        _auction_factory_bump: u8,
        _seed: String,
        _current_auction_bump: u8,
        next_auction_bump: u8,
        _current_seq: u64,
        _next_seq: u64,
    ) -> ProgramResult {
        create_auction_helper(
            &mut ctx.accounts.auction_factory,
            next_auction_bump,
            &mut ctx.accounts.next_auction,
            Some(&mut ctx.accounts.current_auction),
        )?;

        Ok(())
    }

    // separate ix from create_auction because we cannot call ix this until an auction acount has been created.
    // from the client, we might be able to pack these ixns into 1 txn, assuming we will not exceed computational budge.
    // otherwise, user might have to sign 2 separate transactions when creating an auction & supplying a resource to that auction.
    pub fn supply_resource_to_auction(
        ctx: Context<SupplyResource>,
        auction_factory_bump: u8,
        seed: String,
        auction_bump: u8,
        _config_bump: u8,
        _config_seed: String,
        sequence: u64,
    ) -> ProgramResult {
        // i think mint & create metadata (NFT) logic could be moved to a separate program & invoked via CPI.
        // that would decouple the auction from NFT logic. this option is def more attractive in the case that
        // minting logic becomes more complex, i.e. we generate metadata and images on-chain, as opposed to storing in some
        // decentralized data store (e.g. arweave, ipfs). going to leave here for now.

        verify::verify_auction_factory_is_active(&ctx.accounts.auction_factory)?;

        let current_sequence = ctx.accounts.auction_factory.sequence;
        verify::verify_auction_address_for_factory(
            current_sequence,
            ctx.accounts.auction_factory.key(),
            ctx.accounts.auction.key(),
        )?;

        verify::verify_auction_resource_dne(&ctx.accounts.auction)?;

        let uri = ctx
            .accounts
            .config
            .get_item(current_sequence.try_into().unwrap())?;

        let auction_factory_key = ctx.accounts.auction_factory.key();
        let metadata_info = provide_metadata(
            ctx.accounts.auction.key(),
            auction_factory_key,
            current_sequence,
            uri,
        );

        let seq_str = sequence.to_string();
        let auction_seeds = &[
            AUX_SEED.as_bytes(),
            auction_factory_key.as_ref(),
            seq_str.as_bytes(),
            &[auction_bump],
        ];

        instructions::create_metadata::handle(
            ctx.accounts
                .into_create_metadata_context()
                .with_signer(&[auction_seeds]),
            metadata_info,
        )?;

        instructions::create_master_edition::handle(
            ctx.accounts
                .into_create_master_edition_metadata_context()
                .with_signer(&[auction_seeds]),
        )?;

        // update token metadata so that primary_sale_happened = true
        instructions::update_metadata::handle(
            ctx.accounts
                .into_update_metadata_context()
                .with_signer(&[auction_seeds]),
        )?;

        // auction factory immediately signs metadata as a creator so that it doesn't have to do later
        instructions::sign_metadata::handle(
            ctx.accounts
                .into_sign_metadata_context()
                .with_signer(&[&[
                    AUX_FACTORY_SEED.as_bytes(),
                    seed.as_bytes(),
                    &[auction_factory_bump],
                ]])
        )?;

        ctx.accounts.auction.add_resource(ctx.accounts.mint.key());

        Ok(())
    }

    pub fn place_bid(
        ctx: Context<PlaceBid>,
        _auction_factory_bump: u8,
        _seed: String,
        _auction_bump: u8,
        _sequence: u64,
        amount: u64,
    ) -> ProgramResult {
        verify::verify_auction_factory_is_active(&ctx.accounts.auction_factory)?;

        verify::verify_auction_address_for_factory(
            ctx.accounts.auction_factory.sequence,
            ctx.accounts.auction_factory.key(),
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
        instructions::place_bid::handle(
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
        _seed: String,
        auction_bump: u8,
        sequence: u64,
    ) -> ProgramResult {
        // avoid auction factory is active check. users should have option to settle current auction regardless of auction factory status.
        verify::verify_auction_address_for_factory(
            ctx.accounts.auction_factory.sequence,
            ctx.accounts.auction_factory.key(),
            ctx.accounts.auction.key(),
        )?;
        verify::verify_auction_can_be_settled(&ctx.accounts.auction)?;
        verify::verify_auction_has_resource(&ctx.accounts.auction)?;

        if ctx.accounts.auction.amount == 0 {
            msg!(
                "settling auction with no bids: {}",
                ctx.accounts.auction.key().to_string()
            );
            instructions::settle_auction::handle_empty_auction(ctx, auction_bump, sequence)?;
        } else {
            msg!(
                "settling auction [{}] with winning bid = {}",
                ctx.accounts.auction.key().to_string(),
                ctx.accounts.auction.amount
            );
            verify::verify_treasury(&ctx.accounts.auction_factory, ctx.accounts.treasury.key())?;
            verify::verify_bidder_token_account(
                ctx.accounts.bidder_token_account.to_account_info(),
                &ctx.accounts.auction,
                bidder_account_bump,
            )?;

            instructions::settle_auction::handle_auction(ctx, auction_bump, sequence)?;
        }

        Ok(())
    }

    pub fn close_auction_token_account(
        ctx: Context<CloseAuctionTokenAccount>,
        _auction_factory_bump: u8,
        _seed: String,
        auction_bump: u8,
        sequence: u64,
    ) -> ProgramResult {
        let seq_str = sequence.to_string();
        token::close_account(
            ctx.accounts
                .into_close_token_account_context()
                .with_signer(&[&[
                    AUX_SEED.as_bytes(),
                    ctx.accounts.auction_factory.key().as_ref(),
                    seq_str.as_bytes(),
                    &[auction_bump],
                ]]),
        )?;

        Ok(())
    }

    /// ===================================
    /// admin instructions              ///
    /// ===================================

    pub fn initialize_auction_factory(
        ctx: Context<InitializeAuctionFactory>,
        bump: u8,
        seed: String,
        _config_bump: u8,
        _config_seed: String,
        data: AuctionFactoryData,
    ) -> ProgramResult {
        verify::verify_auction_factory_seed(&seed)?;

        ctx.accounts.auction_factory.init(
            bump,
            seed,
            ctx.accounts.payer.key(),
            ctx.accounts.treasury.key(),
            ctx.accounts.config.key(),
            data,
        );

        Ok(())
    }

    pub fn toggle_auction_factory_status(
        ctx: Context<ModifyAuctionFactory>,
        _bump: u8,
        _seed: String,
    ) -> ProgramResult {
        verify::verify_auction_factory_authority(
            ctx.accounts.payer.key(),
            ctx.accounts.auction_factory.authority,
        )?;

        if ctx.accounts.auction_factory.is_active {
            msg!("Pausing auction factory");
            ctx.accounts.auction_factory.pause();
        } else {
            msg!("Resuming auction factory");
            ctx.accounts.auction_factory.resume();
        }

        Ok(())
    }

    pub fn modify_auction_factory_data(
        ctx: Context<ModifyAuctionFactory>,
        _bump: u8,
        _seed: String,
        data: AuctionFactoryData,
    ) -> ProgramResult {
        verify::verify_auction_factory_authority(
            ctx.accounts.payer.key(),
            ctx.accounts.auction_factory.authority,
        )?;

        ctx.accounts.auction_factory.update_data(data);

        Ok(())
    }

    // note: not tested with anchor tests
    pub fn update_authority(
        ctx: Context<UpdateAuctionFactoryAuthority>,
        _bump: u8,
        _seed: String,
    ) -> ProgramResult {
        verify::verify_auction_factory_authority(
            ctx.accounts.payer.key(),
            ctx.accounts.auction_factory.authority,
        )?;

        ctx.accounts.auction_factory.update_authority(*ctx.accounts.new_authority.key);

        Ok(())
    }

    pub fn update_treasury(
        ctx: Context<UpdateAuctionFactoryTreasury>,
        _bump: u8,
        _seed: String,
    ) -> ProgramResult {
        verify::verify_auction_factory_authority(
            ctx.accounts.payer.key(),
            ctx.accounts.auction_factory.authority,
        )?;

        ctx.accounts.auction_factory.update_treasury(*ctx.accounts.treasury.key);

        Ok(())
    }

    // auction factory is a creator of all NFTs and thus will receive possible secondary royalties.
    // we need this functionality to dump excess lamports to the treasury.
    pub fn transfer_lamports_to_treasury(
        ctx: Context<TransferAuctionFactoryLamportsToTreasury>,
        _bump: u8,
        _seed: String,
    ) -> ProgramResult {
        verify::verify_auction_factory_authority(
            ctx.accounts.payer.key(),
            ctx.accounts.auction_factory.authority,
        )?;

        let auction_factory_account_info = &ctx.accounts.auction_factory.to_account_info();
        let amount_to_transfer = get_available_lamports(auction_factory_account_info)?;

        instructions::transfer::transfer_lamports(
            auction_factory_account_info,
            &ctx.accounts.treasury.to_account_info(),
            amount_to_transfer
        )?;

        Ok(())
    }

    /// ===================================
    /// conifg instructions             ///
    /// ===================================

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        bump: u8,
        seed: String,
        max_supply: u32,
    ) -> ProgramResult {
        verify::verify_config_seed(&seed)?;

        ctx.accounts.config.init(bump, max_supply, seed);

        Ok(())
    }

    // update config account ixn intentionally excluded since we treat config as a circular buffer.
    // we should be able to use same config forever. can optionally add this later if needed.

    pub fn add_uris_to_config(
        ctx: Context<AddUrisToConfig>,
        _auction_factory_bump: u8,
        _seed: String,
        _config_bump: u8,
        _config_seed: String,
        config_data: Vec<String>,
    ) -> ProgramResult {
        ctx.accounts
            .config
            .add_data(ctx.accounts.auction_factory.sequence as usize, config_data)?;

        Ok(())
    }
}

/// ====================================================================
/// ixn helper function to  until i  can figure out how to combine   ///
/// create 0...n auctions in the fn                                  ///
/// ====================================================================

pub fn create_auction_helper(
    auction_factory: &mut Account<AuctionFactory>,
    next_auction_bump: u8,
    next_auction: &mut Account<Auction>,
    current_auction: Option<&mut Account<Auction>>,
) -> ProgramResult {
    verify::verify_auction_factory_is_active(&auction_factory)?;

    let next_sequence = auction_factory.sequence
        .checked_add(1)
        .ok_or(ErrorCode::NumericalOverflowError)?;
    verify::verify_auction_address_for_factory(
        next_sequence,
        auction_factory.key(),
        next_auction.key(),
    )?;

    if let Some(curr_auction) = current_auction {
        // ensure settled auction before creating a new auction, if we are past the first auction
        verify::verify_current_auction_is_over(&curr_auction)?;
    } else {
        verify::verify_auction_factory_for_first_auction(&auction_factory)?;
    }

    instructions::create_auction::handle(next_auction_bump, next_auction, auction_factory)?;

    Ok(())
}
