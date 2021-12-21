use anchor_lang::prelude::*;

declare_id!("EBTuRco9ht6f2R27RGbKHVcoz31n3fMDHFSEvecibZDU");

mod context;
mod error;
mod instructions;
mod structs;
mod util;
mod verify;

use context::*;
use error::ErrorCode;
use structs::auction_factory::AuctionFactoryData;

// prefix used in PDA derivations to avoid collisions with other programs.
const AUX_FACTORY_SEED: &[u8] = b"aux_fax";
const AUX_SEED: &[u8] = b"aux";
const AUX_FAX_PROGRAM_ID: &str = "EBTuRco9ht6f2R27RGbKHVcoz31n3fMDHFSEvecibZDU";

#[program]
pub mod auction_factory {
    use super::*;

    pub fn initialize_auction_factory(
        ctx: Context<InitializeAuctionFactory>,
        bump: u8,
        data: AuctionFactoryData,
    ) -> ProgramResult {
        ctx.accounts
            .auction_factory
            .init(bump, *ctx.accounts.authority.key, data);

        Ok(())
    }

    pub fn initialize_auction(
        ctx: Context<InitializeAuction>,
        bump: u8,
        _sequence: u64
    ) -> ProgramResult {
        verify::verify_auction_factory_is_active(&ctx.accounts.auction_factory)?;
        verify::verify_auction_factory_for_first_auction(&ctx.accounts.auction_factory)?;

        verify::verify_auction_address_for_factory(
            ctx.accounts.auction_factory.sequence,
            ctx.accounts.auction_factory.authority.key(),
            ctx.accounts.auction.key(),
        )?;

        instructions::create_auction::create(
            bump,
            &mut ctx.accounts.auction,
            &mut ctx.accounts.auction_factory,
        )?;

        Ok(())
    }

    pub fn create_next_auction(
        ctx: Context<CreateAuction>,
        bump: u8,
        _sequence: u64
    ) -> ProgramResult {
        verify::verify_auction_factory_is_active(&ctx.accounts.auction_factory)?;
        verify::verify_auction_address_for_factory(
            ctx.accounts.auction_factory.sequence,
            ctx.accounts.auction_factory.authority.key(),
            ctx.accounts.current_auction.key(),
        )?;
        verify::verify_auction_is_settled(&ctx.accounts.current_auction)?;

        instructions::create_auction::create(
            bump,
            &mut ctx.accounts.next_auction,
            &mut ctx.accounts.auction_factory,
        )?;

        Ok(())
    }

    pub fn settle_auction(ctx: Context<SettleAuction>) -> ProgramResult {
        verify::verify_auction_factory_is_active(&ctx.accounts.auction_factory)?;
        verify::verify_auction_address_for_factory(
            ctx.accounts.auction_factory.sequence,
            ctx.accounts.auction_factory.authority.key(),
            ctx.accounts.auction.key(),
        )?;
        verify::verify_auction_is_active(&ctx.accounts.auction)?;

        instructions::settle_auction::settle(
            &ctx,
        )?;

        // update metadata account upon auction over
        // https://github.com/metaplex-foundation/metaplex/blob/master/rust/nft-candy-machine/src/lib.rs#L197-L212
        // https://github.com/metaplex-foundation/metaplex/blob/626d15d82be241931425cf0b11105dbf25bc9ef8/rust/token-metadata/program/src/instruction.rs#L289

        // instructions::settle_auction::transfer_resource_to_winner(
        //     &ctx,
        // );

        Ok(())
    }

    pub fn place_bid(ctx: Context<PlaceBid>, amount: u64) -> ProgramResult {
        verify::verify_auction_factory_is_active(&ctx.accounts.auction_factory)?;
        
        // ?quest: is checking for auction != settled & (current_time >= start_time && current_time <= end_time) sufficient
        // this is done in verify_bid_for_auction()
        // verify::verify_auction_address_for_factory(
        //     ctx.accounts.auction_factory.sequence,
        //     ctx.accounts.auction_factory.authority.key(),
        //     ctx.accounts.auction.key(),
        // )?;

        verify::verify_bidder_not_already_winning(
            ctx.accounts.auction.bidder,
            ctx.accounts.bidder.key(),
        )?;

        // verify bidder has enough SOL to pay for bid
        // if ctx.accounts.payer.lamports() < amount {
        //     return Err(ErrorCode::NotEnoughSOL.into());
        // }

        verify::verify_bid_for_auction(
            &ctx.accounts.auction_factory,
            &ctx.accounts.auction,
            amount,
        )?;

        instructions::place_bid::transfer_bid_amount(
            &ctx,
            amount,
        )?;

        instructions::place_bid::return_losing_bid_amount(
            &ctx,
        )?;

        instructions::place_bid::place(
            amount,
            ctx.accounts.bidder.key(),
            &mut ctx.accounts.auction,
        )?;

        Ok(())
    }

    pub fn modify_auction_factory(
        ctx: Context<ModifyAuctionFactory>,
    ) -> ProgramResult {
        let auction_factory = &mut ctx.accounts.auction_factory;

        // restrict who can modify the auction factory
        if *ctx.accounts.payer.key != auction_factory.authority {
            return Err(ErrorCode::NotAuthorized.into());
        }

        auction_factory
            .resume();

        Ok(())
    }
}
