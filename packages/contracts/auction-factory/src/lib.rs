mod constant;
mod context;
mod error;
mod instructions;
mod state;
mod util;
mod verify;

use {
    anchor_lang::prelude::*,
    anchor_spl::token,
    constant::*,
    context::*,
    error::ErrorCode,
    solana_program::msg,
    state::{
        auction::{to_auction, Auction},
        auction_factory::{AuctionFactory, AuctionFactoryData},
        bid::to_bid,
    },
    util::{general::get_available_lamports, metadata::provide_metadata},
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
        _seed: String,
        sequence: u64,
    ) -> Result<()> {
        let auction_bump: u8 = *ctx.bumps.get("auction").unwrap();
        instructions::mint_token::handle(&ctx, auction_bump, sequence)?;

        Ok(())
    }

    pub fn create_auction(
        ctx: Context<CreateAuction>,
        _seed: String,
        current_auction_bump: u8,
    ) -> Result<()> {
        let auction_factory = &mut ctx.accounts.auction_factory;
        let current_sequence = auction_factory.sequence;
        let current_auction = &ctx.accounts.current_auction;

        verify::verify_auction_factory_is_active(&auction_factory)?;

        if current_sequence > 0 {
            // todo: verify supplied current_auction account key
            verify::verify_auction_address_for_factory(
                auction_factory.key(),
                current_sequence,
                current_auction.key(),
                current_auction_bump,
            )?;

            let current_auction = to_auction(&current_auction.to_account_info());
            // ensure settled auction before creating a new auction, if we are past the first auction
            verify::verify_current_auction_is_over(&current_auction)?;
        }

        let next_auction = &mut ctx.accounts.next_auction;
        let next_auction_bump: u8 = *ctx.bumps.get("next_auction").unwrap();

        let next_sequence = current_sequence
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        verify::verify_auction_address_for_factory(
            auction_factory.key(),
            next_sequence,
            next_auction.key(),
            next_auction_bump,
        )?;

        instructions::create_auction::handle(next_auction_bump, next_auction, auction_factory)?;

        Ok(())
    }

    // separate ix from create_auction because we cannot call ix this until an auction acount has been created.
    // from the client, we might be able to pack these ixns into 1 txn, assuming we will not exceed computational budge.
    // otherwise, user might have to sign 2 separate transactions when creating an auction & supplying a resource to that auction.
    pub fn supply_resource_to_auction(
        ctx: Context<SupplyResource>,
        seed: String,
        sequence: u64,
    ) -> Result<()> {
        let auction_factory_bump: u8 = *ctx.bumps.get("auction_factory").unwrap();

        // i think mint & create metadata (NFT) logic could be moved to a separate program & invoked via CPI.
        // that would decouple the auction from NFT logic. this option is def more attractive in the case that
        // minting logic becomes more complex, i.e. we generate metadata and images on-chain, as opposed to storing in some
        // decentralized data store (e.g. arweave, ipfs). going to leave here for now.

        verify::verify_auction_factory_is_active(&ctx.accounts.auction_factory)?;

        let current_sequence = ctx.accounts.auction_factory.sequence;
        let auction_bump: u8 = *ctx.bumps.get("auction").unwrap();
        verify::verify_auction_address_for_factory(
            ctx.accounts.auction_factory.key(),
            current_sequence,
            ctx.accounts.auction.key(),
            auction_bump,
        )?;

        verify::verify_auction_resource_dne(&ctx.accounts.auction)?;

        let uri = "https://someuri.com/metadata.json".to_string();

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
            ctx.accounts.into_sign_metadata_context().with_signer(&[&[
                AUX_FACTORY_SEED.as_bytes(),
                seed.as_bytes(),
                &[auction_factory_bump],
            ]]),
        )?;

        ctx.accounts.auction.add_resource(ctx.accounts.mint.key());

        Ok(())
    }

    // todo: change context, and update functions
    pub fn place_bid(
        ctx: Context<PlaceBid>,
        _seed: String,
        _sequence: u64,
        amount: u64,
        current_bid_bump: u8,
    ) -> Result<()> {
        verify::verify_auction_factory_is_active(&ctx.accounts.auction_factory)?;

        let auction_bump: u8 = *ctx.bumps.get("auction").unwrap();
        verify::verify_auction_address_for_factory(
            ctx.accounts.auction_factory.key(),
            ctx.accounts.auction_factory.sequence,
            ctx.accounts.auction.key(),
            auction_bump,
        )?;

        let current_bid_account_info = ctx.accounts.current_bid.to_account_info();

        let next_bid_account_info = ctx.accounts.next_bid.to_account_info();
        let next_bump: u8 = *ctx.bumps.get("next_bid").unwrap();
        verify::verify_bid_accounts(
            &current_bid_account_info,
            current_bid_bump,
            &next_bid_account_info,
            next_bump,
            &ctx.accounts.auction,
        )?;

        // only take certain actions if current_bid exists
        if ctx.accounts.auction.num_bids > 0 {
            let current_bid = to_bid(&current_bid_account_info);

            verify::verify_bidder_not_already_winning(
                current_bid.bidder,
                ctx.accounts.bidder.key(),
            )?;

            verify::verify_bid_for_auction(
                &ctx.accounts.auction_factory,
                &ctx.accounts.auction,
                &current_bid, // todo: does this work?
                amount,
            )?;

            instructions::place_bid::return_losing_bid_amount(
                &ctx.accounts.auction_factory,
                &ctx.accounts.leading_bidder.to_account_info(),
                &ctx.accounts.auction.to_account_info(),
                &current_bid,
            )?;
        }

        // todo: is this necessary?
        verify::verify_bidder_has_sufficient_account_balance(
            ctx.accounts.bidder.to_account_info(),
            amount,
        )?;
        instructions::place_bid::transfer_bid_amount(&ctx, amount)?;
        instructions::place_bid::handle(
            next_bump,
            &mut ctx.accounts.next_bid,
            amount,
            ctx.accounts.bidder.key(),
            &mut ctx.accounts.auction,
        )?;

        Ok(())
    }

    pub fn settle_auction(ctx: Context<SettleAuction>, _seed: String, sequence: u64) -> Result<()> {
        let bid_account_bump: u8 = *ctx.bumps.get("bid").unwrap();

        // avoid auction factory is active check. users should have option to settle current auction regardless of auction factory status.
        let auction_bump: u8 = *ctx.bumps.get("auction").unwrap();
        verify::verify_auction_address_for_factory(
            ctx.accounts.auction_factory.key(),
            ctx.accounts.auction_factory.sequence,
            ctx.accounts.auction.key(),
            auction_bump,
        )?;
        verify::verify_auction_can_be_settled(&ctx.accounts.auction)?;
        verify::verify_auction_has_resource(&ctx.accounts.auction)?;

        let current_num_bids = ctx.accounts.auction.num_bids;
        if current_num_bids == 0 {
            msg!(
                "settling auction with no bids: {:?}",
                ctx.accounts.auction.key()
            );
            instructions::settle_auction::handle_empty_auction(ctx, auction_bump, sequence)?;
        } else {
            msg!(
                "settling auction [{}] with winning bid amount = {}",
                ctx.accounts.auction.key(),
                ctx.accounts.bid.amount
            );

            // todo: any additional checks on the supplied bid account?

            verify::verify_treasury(&ctx.accounts.auction_factory, ctx.accounts.treasury.key())?;
            verify::verify_bidder_token_account(
                ctx.accounts.bidder_token_account.to_account_info(),
                &ctx.accounts.auction,
                &ctx.accounts.bid,
                bid_account_bump,
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
    ) -> Result<()> {
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
        seed: String,
        data: AuctionFactoryData,
    ) -> Result<()> {
        verify::verify_auction_factory_seed(&seed)?;

        let auction_factory_bump: u8 = *ctx.bumps.get("auction_factory").unwrap();
        ctx.accounts.auction_factory.init(
            auction_factory_bump,
            seed,
            ctx.accounts.payer.key(),
            ctx.accounts.treasury.key(),
            data,
        );

        Ok(())
    }

    pub fn toggle_auction_factory_status(
        ctx: Context<ModifyAuctionFactory>,
        _seed: String,
    ) -> Result<()> {
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
        _seed: String,
        data: AuctionFactoryData,
    ) -> Result<()> {
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
        _seed: String,
    ) -> Result<()> {
        verify::verify_auction_factory_authority(
            ctx.accounts.payer.key(),
            ctx.accounts.auction_factory.authority,
        )?;

        ctx.accounts
            .auction_factory
            .update_authority(*ctx.accounts.new_authority.key);

        Ok(())
    }

    pub fn update_treasury(
        ctx: Context<UpdateAuctionFactoryTreasury>,
        _seed: String,
    ) -> Result<()> {
        verify::verify_auction_factory_authority(
            ctx.accounts.payer.key(),
            ctx.accounts.auction_factory.authority,
        )?;

        ctx.accounts
            .auction_factory
            .update_treasury(*ctx.accounts.treasury.key);

        Ok(())
    }

    // auction factory is a creator of all NFTs and thus will receive possible secondary royalties.
    // we need this functionality to dump excess lamports to the treasury.
    pub fn transfer_lamports_to_treasury(
        ctx: Context<TransferAuctionFactoryLamportsToTreasury>,
        _seed: String,
    ) -> Result<()> {
        verify::verify_auction_factory_authority(
            ctx.accounts.payer.key(),
            ctx.accounts.auction_factory.authority,
        )?;

        let auction_factory_account_info = &ctx.accounts.auction_factory.to_account_info();
        let amount_to_transfer = get_available_lamports(auction_factory_account_info)?;

        instructions::transfer::transfer_lamports(
            auction_factory_account_info,
            &ctx.accounts.treasury.to_account_info(),
            amount_to_transfer,
        )?;

        Ok(())
    }
}
