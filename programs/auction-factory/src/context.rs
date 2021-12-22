use crate::structs::auction::Auction;
use crate::structs::auction_factory::{AuctionFactory, AuctionFactoryData};
use crate::{AUX_FACTORY_SEED, AUX_SEED};
use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::instructions::transfer::{TransferLamports, TransferTokens};
use crate::instructions::manage_metadata::{CreateMetadataAccount}; // UpdateMetadataAccount, , CreateMasterEditionAccount};

#[derive(Accounts)]
#[instruction(bump: u8, data: AuctionFactoryData)]
pub struct InitializeAuctionFactory<'info> {
    pub payer: Signer<'info>,
    pub authority: AccountInfo<'info>,
    #[account(init, seeds = [AUX_FACTORY_SEED.as_ref(), authority.key().as_ref()], bump = bump, payer = payer, space = 1000)]
    pub auction_factory: Account<'info, AuctionFactory>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bump: u8, sequence: u64)]
pub struct InitializeAuction<'info> {
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
pub struct SupplyResource<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub auction: Account<'info, Auction>,
    // With the following accounts we aren't using anchor macros because they are CPI'd
    // through to token-metadata which will do all the validations we need on them.

    // #[account(
    //     constraint = mint.decimals == 0,
    //     constraint = mint.supply == 0,
    //     // constraint = mint.freeze_authority.unwrap() == auction.authority.key(),
    //     // constraint = mint.mint_authority.unwrap() == auction.authority.key(),
    // )]
    pub mint: Account<'info, token::Mint>,
    #[account(mut)]
    pub metadata: AccountInfo<'info>, // verified via cpi in the metadata program
    #[account(mut)]
    pub master_edition: AccountInfo<'info>, // verified via cpi in the metadata program
    #[account(
        mut,
        // constraint = mint_token_account.amount == 0,
        // constraint = mint_token_account.owner == auction.authority.key()
    )]
    pub mint_token_account: Account<'info, token::TokenAccount>,

    #[account(address = spl_token_metadata::id())]
    pub token_metadata_program: AccountInfo<'info>,
    pub token_program: Program<'info, token::Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

    // wallet is the destination of the token transfer
    // https://github.com/metaplex-foundation/metaplex/blob/master/rust/nft-candy-machine/src/lib.rs#L73
    // #[account(mut)]
    // wallet: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(bump: u8, sequence: u64)]
pub struct CreateAuction<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub authority: AccountInfo<'info>,
    #[account(mut)]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(mut)]
    pub current_auction: Account<'info, Auction>,
    #[account(init, seeds = [AUX_SEED.as_ref(), authority.key().as_ref(), sequence.to_string().as_ref()], bump = bump, payer = payer, space = 1000)]
    pub next_auction: Account<'info, Auction>,
    pub system_program: Program<'info, System>,
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
    #[account(address = spl_token_metadata::id())]
    pub token_metadata_program: AccountInfo<'info>,
    pub token_program: Program<'info, token::Token>,
    pub system_program: Program<'info, System>,

    pub authority: AccountInfo<'info>,

    // TODO: verify this works? need to generate before calling this command
    // also need to confirm this account exists
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

#[derive(Accounts)]
pub struct ModifyAuctionFactory<'info> {
    #[account(mut)]
    pub auction_factory: Account<'info, AuctionFactory>,
    pub payer: Signer<'info>,
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

// impl<'info> SupplyResource<'info> {

//     pub fn into_mint_token_context(
//         &self,
//     ) -> CpiContext<'_, '_, '_, 'info, token::MintTo<'info>> {
//         let cpi_program = self.token_program.to_account_info();

//         let cpi_accounts = token::MintTo {
//             mint: self.mint.to_account_info(),
//             to: self.mint_token_account.to_account_info(),
//             authority: self.auction.to_account_info(),
//         };

//         CpiContext::new(cpi_program, cpi_accounts)
//     }

//     pub fn into_create_metadata_context(
//         &self,
//     ) -> CpiContext<'_, '_, '_, 'info, CreateMetadataAccount<'info>> {
//         let cpi_program = self.token_metadata_program.to_account_info();

//         let cpi_accounts = CreateMetadataAccount {
//             payer: self.payer.to_account_info(), // auction?
//             metadata: self.metadata.to_account_info(),
//             mint: self.mint.to_account_info(),
//             mint_authority: self.auction.to_account_info(),
//             update_authority: self.auction.to_account_info(),
//             token_metadata_program: self.token_metadata_program.to_account_info(),
//             system_program: self.system_program.clone(),
//             rent: self.rent.clone(),
//         };

//         CpiContext::new(cpi_program, cpi_accounts)
//     }

// }