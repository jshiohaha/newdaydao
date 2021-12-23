use {
    anchor_lang::prelude::*,
    anchor_spl::token::{Mint, MintTo, Token, TokenAccount},
};

use crate::instructions::create_master_edition::CreateMasterEdition;
use crate::instructions::create_metadata::CreateMetadata;
use crate::instructions::transfer::{TransferLamports, TransferTokens}; // UpdateMetadataAccount,}
use crate::structs::auction::Auction;
use crate::structs::auction_factory::{AuctionFactory, AuctionFactoryData};
use crate::{AUX_FACTORY_SEED, AUX_SEED};

#[derive(Accounts)]
#[instruction(bump: u8, data: AuctionFactoryData)]
pub struct InitializeAuctionFactory<'info> {
    pub payer: Signer<'info>,
    pub authority: AccountInfo<'info>,
    pub treasury: AccountInfo<'info>,
    #[account(init, seeds = [AUX_FACTORY_SEED.as_ref(), authority.key().as_ref()], bump = bump, payer = payer, space = 1000)]
    pub auction_factory: Account<'info, AuctionFactory>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ModifyAuctionFactory<'info> {
    pub payer: Signer<'info>,
    #[account(mut)]
    pub auction_factory: Account<'info, AuctionFactory>,
}

#[derive(Accounts)]
pub struct UpdateAuctionFactoryAuthority<'info> {
    pub payer: Signer<'info>,
    #[account(mut)]
    pub auction_factory: Account<'info, AuctionFactory>,
    pub authority: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct UpdateAuctionFactoryTreasury<'info> {
    pub payer: Signer<'info>,
    #[account(mut)]
    pub auction_factory: Account<'info, AuctionFactory>,
    pub treasury: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct CreateTokenMint<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_mint_account: Account<'info, TokenAccount>,
    pub auction: Account<'info, Auction>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(bump: u8, sequence: u64)]
pub struct CreateFirstAuction<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub authority: AccountInfo<'info>,
    #[account(mut)]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(init, seeds = [AUX_SEED.as_ref(), authority.key().as_ref(), sequence.to_string().as_ref()], bump = bump, payer = payer, space = 1000)]
    pub auction: Account<'info, Auction>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bump: u8, sequence: u64)]
pub struct CreateNextAuction<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub authority: AccountInfo<'info>,
    #[account(mut)]
    pub auction_factory: Account<'info, AuctionFactory>,
    pub current_auction: Account<'info, Auction>,
    #[account(init, seeds = [AUX_SEED.as_ref(), authority.key().as_ref(), sequence.to_string().as_ref()], bump = bump, payer = payer, space = 1000)]
    pub next_auction: Account<'info, Auction>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SupplyResource<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(mut)]
    pub auction: Account<'info, Auction>,
    // #[account(
    //     constraint = mint.decimals == 0,
    //     constraint = mint.supply == 0,
    //     constraint = mint.freeze_authority.unwrap() == next_auction.key(),
    //     constraint = mint.mint_authority.unwrap() == next_auction.key(),
    // )]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub metadata: AccountInfo<'info>, // verified via cpi in the metadata program
    #[account(mut)]
    pub master_edition: AccountInfo<'info>, // verified via cpi in the metadata program
    #[account(
        mut,
        // constraint = mint_token_account.amount == 0,
        // constraint = mint_token_account.owner == next_auction.key()
    )]
    pub mint_token_account: Account<'info, TokenAccount>,
    #[account(address = metaplex_token_metadata::id())]
    pub token_metadata_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SettleAuction<'info> {
    pub payer: Signer<'info>,
    pub treasury: AccountInfo<'info>,
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    #[account(mut)]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(mut)]
    pub auction: Account<'info, Auction>,
    #[account(address = metaplex_token_metadata::id())]
    pub token_metadata_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub authority: AccountInfo<'info>, // (quest): is this used?
    pub bidder_token_account: AccountInfo<'info>,
    pub auction_token_account: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct PlaceBid<'info> {
    pub leading_bidder: AccountInfo<'info>,
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(mut)]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(mut)]
    pub auction: Account<'info, Auction>,
    pub system_program: Program<'info, System>,
}

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

    pub fn into_return_lamports_to_loser_context(
        &self,
    ) -> CpiContext<'_, '_, '_, 'info, TransferLamports<'info>> {
        let cpi_program = self.system_program.to_account_info();

        let cpi_accounts = TransferLamports {
            from: self.auction.to_account_info(),
            to: self.leading_bidder.to_account_info(),
            system_program: self.system_program.clone(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}

impl<'info> SettleAuction<'info> {
    pub fn into_transfer_lamports_to_treasury(
        &self,
    ) -> CpiContext<'_, '_, '_, 'info, TransferLamports<'info>> {
        let cpi_program = self.system_program.to_account_info();

        let cpi_accounts = TransferLamports {
            from: self.auction.to_account_info(),
            to: self.treasury.to_account_info(),
            system_program: self.system_program.clone(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }

    pub fn into_transfer_resource_to_winner_context(
        &self,
    ) -> CpiContext<'_, '_, '_, 'info, TransferTokens<'info>> {
        let cpi_program = self.system_program.to_account_info();

        let cpi_accounts = TransferTokens {
            from: self.auction_token_account.to_account_info(),
            to: self.bidder_token_account.to_account_info(), // bidder token account
            authority: self.authority.to_account_info(),
            token_program: self.token_program.to_account_info(),
            system_program: self.system_program.clone(),
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
            authority: self.payer.to_account_info(),
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
            mint_authority: self.payer.to_account_info(),
            payer: self.payer.to_account_info(),
            update_authority: self.payer.to_account_info(),
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
            mint_authority: self.payer.to_account_info(),
            update_authority: self.payer.to_account_info(),
            token_metadata_program: self.token_metadata_program.clone(),
            token_program: self.token_program.clone(),
            system_program: self.system_program.clone(),
            rent: self.rent.clone(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}
