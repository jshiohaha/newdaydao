mod constant;
mod error;
mod instructions;
mod state;
mod util;
mod verify;

use anchor_lang::prelude::*;
use instructions::*;
use state::auction_factory::AuctionFactoryData;

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
        instructions::mint_to_auction::handle(ctx, sequence)?;

        Ok(())
    }

    pub fn create_auction(
        ctx: Context<CreateAuction>,
        _seed: String,
        current_auction_bump: u8,
    ) -> Result<()> {
        instructions::create_auction::handle(ctx, current_auction_bump)?;

        Ok(())
    }

    // separate ix from create_auction because we cannot call ix this until an auction acount has been created.
    // from the client, we might be able to pack these ixns into 1 txn, assuming we will not exceed computational budget.
    // otherwise, user might have to sign 2 separate transactions when creating an auction & supplying a resource to that auction.
    pub fn supply_resource_to_auction(
        ctx: Context<SupplyResource>,
        seed: String,
        sequence: u64,
    ) -> Result<()> {
        instructions::supply_resource_to_auction::handle(ctx, seed, sequence)?;

        Ok(())
    }

    pub fn place_bid(
        ctx: Context<PlaceBid>,
        _seed: String,
        _sequence: u64,
        amount: u64,
        current_bid_bump: u8,
    ) -> Result<()> {
        instructions::place_bid::handle(ctx, amount, current_bid_bump)?;

        Ok(())
    }

    pub fn settle_auction(ctx: Context<SettleAuction>, _seed: String, sequence: u64) -> Result<()> {
        instructions::settle_auction::handle(ctx, sequence)?;

        Ok(())
    }

    pub fn close_auction_token_account(
        ctx: Context<CloseAuctionTokenAccount>,
        _seed: String,
        sequence: u64,
    ) -> Result<()> {
        instructions::close_auction_token_account::handle(ctx, sequence)?;

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
        instructions::initialize_auction_factory::handle(ctx, seed, data)?;

        Ok(())
    }

    pub fn toggle_auction_factory_status(
        ctx: Context<ToggleAuctionFactoryStatus>,
        _seed: String,
    ) -> Result<()> {
        instructions::toggle_auction_factory_status::handle(ctx)?;

        Ok(())
    }

    pub fn modify_auction_factory_data(
        ctx: Context<ModifyAuctionFactory>,
        _seed: String,
        data: AuctionFactoryData,
    ) -> Result<()> {
        instructions::modify_auction_factory_data::handle(ctx, data)?;

        Ok(())
    }

    // note: not tested with anchor tests
    pub fn update_authority(
        ctx: Context<UpdateAuctionFactoryAuthority>,
        _seed: String,
    ) -> Result<()> {
        instructions::update_authority::handle(ctx)?;

        Ok(())
    }

    pub fn update_treasury(
        ctx: Context<UpdateAuctionFactoryTreasury>,
        _seed: String,
    ) -> Result<()> {
        instructions::update_treasury::handle(ctx)?;

        Ok(())
    }

    // auction factory is a creator of all NFTs and thus will receive possible secondary royalties.
    // we need this functionality to dump excess lamports to the treasury.
    pub fn transfer_lamports_to_treasury(
        ctx: Context<TransferAuctionFactoryLamportsToTreasury>,
        _seed: String,
    ) -> Result<()> {
        instructions::transfer_lamports_to_treasury::handle(ctx)?;

        Ok(())
    }
}
