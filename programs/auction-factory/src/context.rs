use {
    anchor_lang::prelude::*,
    anchor_spl::token::{Burn, CloseAccount, Mint, MintTo, Token, TokenAccount},
};

use crate::{
    instructions::create_master_edition::CreateMasterEdition,
    instructions::create_metadata::CreateMetadata,
    instructions::transfer::TransferLamports,
    instructions::update_metadata::UpdateMetadata,
    structs::auction::Auction,
    structs::auction_factory::{AuctionFactory, AuctionFactoryData},
};

use crate::{AUX_FACTORY_SEED, AUX_SEED};

// TODO: provide more accurate account size (for all space = 1000 ... instances)
#[derive(Accounts)]
#[instruction(bump: u8, data: AuctionFactoryData)]
pub struct InitializeAuctionFactory<'info> {
    pub payer: Signer<'info>,
    pub treasury: AccountInfo<'info>,
    #[account(init,
        seeds = [
            AUX_FACTORY_SEED.as_ref(),
            payer.key().as_ref()
        ],
        bump = bump,
        payer = payer,
        space = 1000
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct ModifyAuctionFactory<'info> {
    pub payer: Signer<'info>,
    #[account(mut,
        seeds = [
            AUX_FACTORY_SEED.as_ref(),
            payer.key().as_ref()
        ],
        bump = bump
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct UpdateAuctionFactoryAuthority<'info> {
    pub payer: Signer<'info>,
    pub new_authority: AccountInfo<'info>,
    #[account(mut,
        seeds = [
            AUX_FACTORY_SEED.as_ref(),
            payer.key().as_ref()
        ],
        bump = bump
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
}

#[derive(Accounts)]
#[instruction(auction_factory_bump: u8)]
pub struct UpdateAuctionFactoryTreasury<'info> {
    pub payer: Signer<'info>,
    #[account(mut,
        seeds = [
            AUX_FACTORY_SEED.as_ref(),
            payer.key().as_ref()
        ],
        bump = auction_factory_bump
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    pub treasury: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(
    auction_factory_bump: u8,
    auction_bump: u8,
    sequence: u64
)]
pub struct CreateTokenMint<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_mint_account: Account<'info, TokenAccount>,
    pub authority: AccountInfo<'info>,
    #[account(
        seeds = [
            AUX_FACTORY_SEED.as_ref(),
            authority.key().as_ref()
        ],
        bump = auction_factory_bump
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(
        seeds = [
            AUX_SEED.as_ref(),
            auction_factory.authority.key().as_ref(),
            sequence.to_string().as_ref()
        ],
        bump = auction_bump
    )]
    pub auction: Account<'info, Auction>,
    #[account(address = spl_token::id())]
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(
    auction_factory_bump: u8,
    auction_bump: u8,
    sequence: u64
)]
pub struct CreateFirstAuction<'info> {
    pub payer: Signer<'info>,
    pub authority: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [
            AUX_FACTORY_SEED.as_ref(),
            authority.key().as_ref()
        ],
        bump = auction_factory_bump
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(
        init,
        seeds = [
            AUX_SEED.as_ref(),
            auction_factory.authority.key().as_ref(),
            sequence.to_string().as_ref()
        ],
        bump = auction_bump,
        payer = payer,
        space = 1000
    )]
    pub auction: Account<'info, Auction>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    auction_factory_bump: u8,
    current_auction_bump: u8,
    next_auction_bump: u8,
    current_seq: u64,
    next_seq: u64
)]
pub struct CreateNextAuction<'info> {
    pub payer: Signer<'info>,
    pub authority: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [
            AUX_FACTORY_SEED.as_ref(),
            authority.key().as_ref()
        ],
        bump = auction_factory_bump
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(
        mut,
        seeds = [
            AUX_SEED.as_ref(),
            auction_factory.authority.key().as_ref(),
            current_seq.to_string().as_ref()
        ],
        bump = current_auction_bump
    )]
    pub current_auction: Account<'info, Auction>,
    #[account(
        init,
        seeds = [
            AUX_SEED.as_ref(),
            auction_factory.authority.key().as_ref(),
            next_seq.to_string().as_ref()
        ],
        bump = next_auction_bump,
        payer = payer,
        space = 1000
    )]
    pub next_auction: Account<'info, Auction>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    auction_factory_bump: u8,
    auction_bump: u8,
    sequence: u64
)]
pub struct SupplyResource<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: AccountInfo<'info>,
    #[account(
        seeds = [
            AUX_FACTORY_SEED.as_ref(),
            authority.key().as_ref()
        ],
        bump = auction_factory_bump,
    )]
    #[account(mut)]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(
        mut,
        seeds = [
            AUX_SEED.as_ref(),
            auction_factory.authority.key().as_ref(),
            sequence.to_string().as_ref()
        ],
        bump = auction_bump,
    )]
    pub auction: Account<'info, Auction>,
    // we create accounts and mint token before invoking the endpoint associated with this
    // context, so supply = 1.
    #[account(
        constraint = mint.decimals == 0,
        constraint = mint.supply == 1,
        constraint = mint.freeze_authority.unwrap() == auction.key(),
        constraint = mint.mint_authority.unwrap() == auction.key(),
    )]
    pub mint: Account<'info, Mint>,
    // metadata accounts are verified via cpi in the metadata program
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    #[account(mut)]
    pub master_edition: AccountInfo<'info>,
    // we create accounts and mint token before invoking the endpoint associated with this
    // context, so amount = 1. if this were not the case, we would expect amount == 0.
    #[account(
        mut,
        constraint = mint_token_account.amount == 1,
        constraint = mint_token_account.owner == auction.key()
    )]
    pub mint_token_account: Account<'info, TokenAccount>,
    // note: executable macro will not work for token_metadata_program on localnet
    #[account(address = metaplex_token_metadata::id())]
    pub token_metadata_program: UncheckedAccount<'info>,
    #[account(address = spl_token::id())]
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(
    auction_factory_bump: u8,
    auction_bump: u8,
    sequence: u64,
    amount: u64
)]
pub struct PlaceBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(mut)]
    pub leading_bidder: AccountInfo<'info>,
    pub authority: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [
            AUX_FACTORY_SEED.as_ref(),
            authority.key().as_ref()
        ],
        bump = auction_factory_bump
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(
        mut,
        seeds = [
            AUX_SEED.as_ref(),
            auction_factory.authority.key().as_ref(),
            sequence.to_string().as_ref()
        ],
        bump = auction_bump
    )]
    pub auction: Account<'info, Auction>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    bidder_token_account_bump: u8,
    auction_factory_bump: u8,
    auction_bump: u8,
    sequence: u64
)]
pub struct SettleAuction<'info> {
    pub payer: Signer<'info>,
    #[account(mut)]
    pub authority: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [
            AUX_FACTORY_SEED.as_ref(),
            authority.key().as_ref()
        ],
        bump = auction_factory_bump
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(
        mut,
        seeds = [
            AUX_SEED.as_ref(),
            auction_factory.authority.key().as_ref(),
            sequence.to_string().as_ref()
        ],
        bump = auction_bump
    )]
    pub auction: Account<'info, Auction>,
    #[account(
        constraint = mint.decimals == 0,
        constraint = mint.supply == 1,
    )]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    #[account(mut)]
    pub bidder_token_account: AccountInfo<'info>,
    #[account(mut)]
    pub auction_token_account: AccountInfo<'info>,
    #[account(address = metaplex_token_metadata::id())]
    pub token_metadata_program: UncheckedAccount<'info>,
    #[account(address = spl_token::id())]
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    // #[account(mut)]
    // pub token_burn_address: Account<'info, TokenAccount>,
}

// ================ IMPL FOR CPI CONTEXT ================

impl<'info> CreateTokenMint<'info> {
    pub fn into_mint_token_context(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = MintTo {
            mint: self.mint.to_account_info(),
            to: self.token_mint_account.to_account_info(),
            authority: self.auction.to_account_info(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}

impl<'info> PlaceBid<'info> {
    pub fn into_receive_bid_context(
        &self,
    ) -> CpiContext<'_, '_, '_, 'info, TransferLamports<'info>> {
        let cpi_program = self.system_program.to_account_info();

        let cpi_accounts = TransferLamports {
            from: self.bidder.to_account_info(),
            to: self.auction.to_account_info(),
            system_program: self.system_program.clone(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}

impl<'info> SettleAuction<'info> {
    pub fn into_close_account_context(&self) -> CpiContext<'_, '_, '_, 'info, CloseAccount<'info>> {
        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = CloseAccount {
            account: self.auction_token_account.to_account_info(),
            // send rent lamports to treasury
            destination: self.treasury.to_account_info(),
            authority: self.authority.to_account_info(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }

    pub fn into_burn_token_context(&self) -> CpiContext<'_, '_, '_, 'info, Burn<'info>> {
        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = Burn {
            mint: self.mint.to_account_info(),
            to: self.bidder_token_account.to_account_info(),
            authority: self.authority.to_account_info(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}

impl<'info> SupplyResource<'info> {
    pub fn into_mint_token_context(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = MintTo {
            mint: self.mint.to_account_info(),
            to: self.mint_token_account.to_account_info(),
            authority: self.auction.to_account_info(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }

    pub fn into_create_metadata_context(
        &self,
    ) -> CpiContext<'_, '_, '_, 'info, CreateMetadata<'info>> {
        let cpi_program = self.token_metadata_program.to_account_info();

        let cpi_accounts = CreateMetadata {
            metadata: self.metadata.to_account_info(),
            mint: self.mint.to_account_info(),
            mint_authority: self.auction.to_account_info(),
            payer: self.payer.to_account_info(),
            update_authority: self.auction.to_account_info(),
            token_metadata_program: self.token_metadata_program.clone(),
            token_program: self.token_program.clone(),
            system_program: self.system_program.clone(),
            rent: self.rent.clone(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }

    pub fn into_create_master_edition_metadata_context(
        &self,
    ) -> CpiContext<'_, '_, '_, 'info, CreateMasterEdition<'info>> {
        let cpi_program = self.token_metadata_program.to_account_info();

        let cpi_accounts = CreateMasterEdition {
            payer: self.payer.to_account_info(),
            metadata: self.metadata.to_account_info(),
            master_edition: self.master_edition.to_account_info(),
            mint: self.mint.to_account_info(),
            mint_authority: self.auction.to_account_info(),
            update_authority: self.auction.to_account_info(),
            token_metadata_program: self.token_metadata_program.clone(),
            token_program: self.token_program.clone(),
            system_program: self.system_program.clone(),
            rent: self.rent.clone(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }

    pub fn into_update_metadata_authority(
        &self,
    ) -> CpiContext<'_, '_, '_, 'info, UpdateMetadata<'info>> {
        let cpi_program = self.token_metadata_program.to_account_info();

        let cpi_accounts = UpdateMetadata {
            metadata: self.metadata.to_account_info(),
            update_authority: self.auction.to_account_info(),
            token_metadata_program: self.token_metadata_program.to_account_info(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}
