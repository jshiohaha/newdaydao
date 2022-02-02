use {
    anchor_lang::prelude::*,
    anchor_spl::token,
    solana_program::msg,
    std::convert::TryInto,
};

mod constant;
mod context;
mod error;
mod instructions;
mod structs;
mod util;
mod verify;

use {
    constant::*,
    context::*,
    structs::{
        auction::Auction,
        auction_factory::{AuctionFactory, AuctionFactoryData},
        metadata::get_metadata_info,
    },
};

declare_id!("44viVLXpTZ5qTdtHDN59iYLABZUaw8EBwnTN4ygehukp");

#[program]
pub mod auction_factory {
    use super::*;

    /// ===================================
    /// unrestricted instructions       ///
    /// ===================================

    // only used as a custom mint_to instruction since the ixn requires the authority to sign
    // in the case of no multisig. and, a PDA can only sign from an on-chain program. Token source:
    // https://github.com/solana-labs/solana-program-library/blob/e29bc53c5f572073908fb89c6812d22f6f5eecf5/token/js/client/token.js#L1731
    pub fn mint_to_auction(
        ctx: Context<CreateTokenMint>,
        _auction_factory_bump: u8,
        _uuid: String,
        _auction_bump: u8,
        _sequence: u64,
    ) -> ProgramResult {
        instructions::mint_token::mint_to_auction(&ctx)?;

        Ok(())
    }

    pub fn create_first_auction(
        ctx: Context<CreateFirstAuction>,
        _auction_factory_bump: u8,
        _uuid: String,
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
        _uuid: String,
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

    // this is a separate ix from create_auction because we cannot call ix this until
    // an auction acount has been created. from the client, we can combine these ixns into
    // 1 txn. so, ux doesn't have to suffer from 2 separate transactions.
    pub fn supply_resource_to_auction(
        ctx: Context<SupplyResource>,
        _auction_factory_bump: u8,
        _uuid: String,
        _auction_bump: u8,
        _config_bump: u8,
        _config_uuid: String,
        _sequence: u64,
    ) -> ProgramResult {
        // i think mint & create metadata (NFT) logic could be moved to a separate program
        // & invoked via CPI. that would decouple the auction from NFT logic. thinking this
        // option is more attractive in the case that minting logic becomes more complex,
        // i.e. we generate metadata and images on-chain, as opposed to storing in some
        // decentralized data store (e.g. arweave, ipfs). going to leave here for now.

        verify::verify_auction_factory_is_active(&ctx.accounts.auction_factory)?;

        let current_sequence = ctx.accounts.auction_factory.get_current_sequence();
        verify::verify_auction_address_for_factory(
            current_sequence,
            ctx.accounts.auction_factory.key(),
            ctx.accounts.auction.key(),
        )?;

        verify::verify_auction_resource_dne(&ctx.accounts.auction)?;

        let auction_factory_key = ctx.accounts.auction_factory.key();
        let sequence = ctx.accounts.auction.sequence.to_string();
        let bump = ctx.accounts.auction.bump;

        let seeds = &[
            AUX_SEED.as_bytes(),
            auction_factory_key.as_ref(),
            sequence.as_bytes(),
            &[bump],
        ];

        let uri = ctx
            .accounts
            .config
            .get_item(current_sequence.try_into().unwrap())?;

        msg!("fetched {} from config", uri);

        // creators will be auction & auction factory account for purposes of secondary
        // royalties since treasury can change. we will include an on-chain function to dump
        // lamports from auction factory PDA to treasury.
        let metadata_info = get_metadata_info(
            ctx.accounts.auction.key(),
            ctx.accounts.auction_factory.key(),
            current_sequence,
            uri,
        );

        // metadata CPIs will not work on localnet
        instructions::create_metadata::create_metadata(
            ctx.accounts
                .into_create_metadata_context()
                .with_signer(&[seeds]),
            metadata_info,
        )?;

        instructions::create_master_edition::create_master_edition_metadata(
            ctx.accounts
                .into_create_master_edition_metadata_context()
                .with_signer(&[seeds]),
        )?;

        // update token metadata so that primary_sale_happened = true
        instructions::update_metadata::update_metadata_after_primary_sale(
            ctx.accounts
                .into_update_metadata_authority()
                .with_signer(&[seeds]),
        )?;

        ctx.accounts.auction.add_resource(ctx.accounts.mint.key());

        Ok(())
    }

    pub fn place_bid(
        ctx: Context<PlaceBid>,
        _auction_factory_bump: u8,
        _uuid: String,
        _auction_bump: u8,
        _sequence: u64,
        amount: u64,
    ) -> ProgramResult {
        verify::verify_auction_factory_is_active(&ctx.accounts.auction_factory)?;

        verify::verify_auction_address_for_factory(
            ctx.accounts.auction_factory.get_current_sequence(),
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
        _uuid: String,
        _auction_bump: u8,
        _sequence: u64,
    ) -> ProgramResult {
        // we don't check if auction factory is active here because we should be able to settle any
        // ongoing auction even if auction factory is paused.

        verify::verify_auction_address_for_factory(
            ctx.accounts.auction_factory.get_current_sequence(),
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
            instructions::settle_auction::settle_empty_auction(ctx)?;
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
            instructions::settle_auction::settle(ctx)?;
        }

        Ok(())
    }

    pub fn close_auction_token_account(
        ctx: Context<CloseAuctionTokenAccount>,
        _auction_factory_bump: u8,
        _uuid: String,
        _auction_bump: u8,
        _sequence: u64,
    ) -> ProgramResult {
        let auction_factory_key = ctx.accounts.auction_factory.key();
        let sequence = ctx.accounts.auction.sequence.to_string();
        let bump = ctx.accounts.auction.bump;

        token::close_account(
            ctx.accounts
                .into_close_token_account_context()
                .with_signer(&[&[
                    AUX_SEED.as_bytes(),
                    auction_factory_key.as_ref(),
                    sequence.as_bytes(),
                    &[bump],
                ]]),
        )?;

        Ok(())
    }

    /// ===================================
    /// admin instructions              ///
    /// ===================================

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        bump: u8,
        uuid: String,
        max_supply: u32,
    ) -> ProgramResult {
        verify::verify_config_uuid(&uuid)?;

        ctx.accounts.config.init(bump, max_supply, uuid);

        Ok(())
    }

    pub fn initialize_auction_factory(
        ctx: Context<InitializeAuctionFactory>,
        bump: u8,
        uuid: String,
        _config_bump: u8,
        _config_uuid: String,
        data: AuctionFactoryData,
    ) -> ProgramResult {
        verify::verify_auction_factory_uuid(&uuid)?;

        ctx.accounts.auction_factory.init(
            bump,
            uuid,
            ctx.accounts.payer.key(),
            ctx.accounts.treasury.key(),
            ctx.accounts.config.key(),
            data,
        );

        Ok(())
    }

    // update config account ixn intentionally excluded since we treat config as a circular buffer.
    // we should be able to use same config forever. can optionally add this later if needed.

    pub fn add_uris_to_config(
        ctx: Context<AddUrisToConfig>,
        _auction_factory_bump: u8,
        _uuid: String,
        _config_bump: u8,
        _config_uuid: String,
        config_data: Vec<String>,
    ) -> ProgramResult {
        ctx.accounts.config.add_data(
            ctx.accounts.auction_factory.sequence as usize,
            config_data,
        )?;

        Ok(())
    }

    pub fn toggle_auction_factory_status(
        ctx: Context<ModifyAuctionFactory>,
        _bump: u8,
        _uuid: String,
    ) -> ProgramResult {
        verify::verify_auction_factory_authority(
            ctx.accounts.payer.key(),
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
        _uuid: String,
        data: AuctionFactoryData,
    ) -> ProgramResult {
        verify::verify_auction_factory_authority(
            ctx.accounts.payer.key(),
            ctx.accounts.auction_factory.authority,
        )?;

        let auction_factory = &mut ctx.accounts.auction_factory;
        auction_factory.update_data(data);

        Ok(())
    }

    // note: not tested with anchor tests
    pub fn update_authority(
        ctx: Context<UpdateAuctionFactoryAuthority>,
        _bump: u8,
        _uuid: String,
    ) -> ProgramResult {
        verify::verify_auction_factory_authority(
            ctx.accounts.payer.key(),
            ctx.accounts.auction_factory.authority,
        )?;

        let auction_factory = &mut ctx.accounts.auction_factory;
        auction_factory.update_authority(*ctx.accounts.new_authority.key);

        Ok(())
    }

    pub fn update_treasury(
        ctx: Context<UpdateAuctionFactoryTreasury>,
        _bump: u8,
        _uuid: String,
    ) -> ProgramResult {
        verify::verify_auction_factory_authority(
            ctx.accounts.payer.key(),
            ctx.accounts.auction_factory.authority,
        )?;

        let auction_factory = &mut ctx.accounts.auction_factory;
        auction_factory.update_treasury(*ctx.accounts.treasury.key);

        Ok(())
    }

    // auction factory will be the creator of all NFTs and thus receive any secondary royalties.
    // we need this functionality to extract royalties from the auction factory
    // to the designated treasury.
    // note: not tested with anchor tests
    pub fn transfer_lamports_to_treasury(
        ctx: Context<ModifyAuctionFactory>,
        _bump: u8,
        _uuid: String,
    ) -> ProgramResult {
        verify::verify_auction_factory_authority(
            ctx.accounts.payer.key(),
            ctx.accounts.auction_factory.authority,
        )?;

        // note: don't over-transfer & leave account empty so that garbage
        // collector automatically closes the account.
        // quest: how to calculate number of lamports to transfer?

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

    verify::verify_auction_address_for_factory(
        auction_factory.sequence,
        auction_factory.key(),
        next_auction.key(),
    )?;

    if let Some(curr_auction) = current_auction {
        // ensure settled auction before creating a new auction, if we are past the first auction
        verify::verify_current_auction_is_over(&curr_auction)?;
    } else {
        verify::verify_auction_factory_for_first_auction(&auction_factory)?;
    }

    instructions::create_auction::create(next_auction_bump, next_auction, auction_factory)?;

    Ok(())
}
