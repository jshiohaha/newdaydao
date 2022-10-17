use {
    crate::{
        constant::{AUX_FACTORY_SEED, AUX_SEED},
        instructions::{
            create_master_edition::CreateMasterEdition, create_metadata::CreateMetadata,
            sign_metadata::SignMetadata, transfer::TransferLamports,
            update_metadata::UpdateMetadata,
        },
        state::{
            auction::{Auction, AUCTION_ACCOUNT_SPACE},
            auction_factory::{AuctionFactory, AuctionFactoryData, AUCTION_FACTORY_ACCOUNT_SPACE},
            bid::{Bid, BID_ACCOUNT_SPACE},
        },
    },
    anchor_lang::prelude::*,
    anchor_spl::token::{Burn, CloseAccount, Mint, MintTo, Token, TokenAccount},
};

/// =========================================
/// context for unrestricted instructions ///
/// =========================================

#[derive(Accounts)]
#[instruction(
    seed: String,
    sequence: u64
)]
pub struct CreateTokenMint<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = token_mint_account.amount == 0,
        constraint = token_mint_account.owner == auction.key()
    )]
    pub token_mint_account: Account<'info, TokenAccount>,
    #[account(
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes(),
        ],
        bump,
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(
        seeds = [
            AUX_SEED.as_bytes(),
            auction_factory.key().as_ref(),
            sequence.to_string().as_bytes(),
        ],
        bump,
        constraint = auction.to_account_info().owner == program_id,
    )]
    pub auction: Account<'info, Auction>,
    #[account(address = spl_token::id())]
    pub token_program: Program<'info, Token>,
}

// todo: consolidate create auction into single IX
#[derive(Accounts)]
#[instruction(
    seed: String,
    sequence: u64
)]
pub struct CreateFirstAuction<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes(),
        ],
        bump,
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(
        init,
        seeds = [
            AUX_SEED.as_bytes(),
            auction_factory.key().as_ref(),
            sequence.to_string().as_bytes()
        ],
        bump,
        payer = payer,
        space = AUCTION_ACCOUNT_SPACE,
        constraint = auction.to_account_info().owner == program_id,
    )]
    pub auction: Account<'info, Auction>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    seed: String,
    current_seq: u64,
    next_seq: u64
)]
pub struct CreateNextAuction<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes(),
        ],
        bump,
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(
        mut,
        seeds = [
            AUX_SEED.as_bytes(),
            auction_factory.key().as_ref(),
            current_seq.to_string().as_bytes()
        ],
        bump,
        constraint = current_auction.to_account_info().owner == program_id,
    )]
    pub current_auction: Account<'info, Auction>,
    #[account(
        init,
        seeds = [
            AUX_SEED.as_bytes(),
            auction_factory.key().as_ref(),
            next_seq.to_string().as_bytes()
        ],
        bump,
        payer = payer,
        space = AUCTION_ACCOUNT_SPACE,
        constraint = next_auction.to_account_info().owner == program_id,
    )]
    pub next_auction: Account<'info, Auction>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    seed: String,
    sequence: u64,
)]
pub struct SupplyResource<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    // note: fully remove config account
    // #[account(
    //     mut,
    //     seeds = [
    //         URI_CONFIG_SEED.as_bytes(),
    //         config_seed.as_bytes()
    //     ],
    //     bump,
    // )]
    // pub config: Account<'info, Config>,
    #[account(
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes(),
        ],
        bump,
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(
        mut,
        seeds = [
            AUX_SEED.as_bytes(),
            auction_factory.key().as_ref(),
            sequence.to_string().as_bytes()
        ],
        bump,
        constraint = auction.to_account_info().owner == program_id,
    )]
    pub auction: Account<'info, Auction>,
    #[account(
        mut,
        constraint = mint.decimals == 0,
        constraint = mint.supply == 1,
        constraint = mint.freeze_authority.unwrap() == auction.key(),
        constraint = mint.mint_authority.unwrap() == auction.key(),
    )]
    pub mint: Account<'info, Mint>,
    /// CHECK: metadata accounts are verified via cpi in the metadata program
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    /// CHECK: metadata accounts are verified via cpi in the metadata program
    #[account(mut)]
    pub master_edition: AccountInfo<'info>,
    /// CHECK: verified via anchor address check
    #[account(address = mpl_token_metadata::id())]
    pub token_metadata_program: UncheckedAccount<'info>,
    #[account(address = spl_token::id())]
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(
    seed: String,
    sequence: u64,
    amount: u64
)]
pub struct PlaceBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(
        mut,
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes(),
        ],
        bump,
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(
        mut,
        seeds = [
            AUX_SEED.as_bytes(),
            auction_factory.key().as_ref(),
            sequence.to_string().as_bytes()
        ],
        bump,
        constraint = auction.to_account_info().owner == program_id,
    )]
    pub auction: Account<'info, Auction>,
    pub system_program: Program<'info, System>,

    // ignore anchor checks, perform manually in IX for max flexibility
    /// CHECK: verify in IX, normal wallet
    #[account(mut)]
    pub leading_bidder: AccountInfo<'info>,
    /// CHECK: verify in IX, possibly garbage if no current bid
    pub current_bid: AccountInfo<'info>,
    /// safe to init as normal PDA because we will use this new bid account if all checks pass
    #[account(
        init,
        seeds = [
            auction.key().as_ref(),
            (auction.num_bids + 1).to_string().as_bytes(),
        ],
        bump,
        payer = bidder,
        space = BID_ACCOUNT_SPACE,
        constraint = next_bid.to_account_info().owner == program_id,
    )]
    pub next_bid: Account<'info, Bid>,
}

#[derive(Accounts)]
#[instruction(
    seed: String,
    sequence: u64
)]
pub struct SettleAuction<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes(),
        ],
        bump,
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(
        mut,
        seeds = [
            AUX_SEED.as_bytes(),
            auction_factory.key().as_ref(),
            sequence.to_string().as_bytes()
        ],
        bump,
        constraint = auction.to_account_info().owner == program_id,
    )]
    pub auction: Account<'info, Auction>,
    #[account(
        seeds = [
            auction.key().as_ref(),
            auction.num_bids.to_string().as_bytes(),
        ],
        bump,
        constraint = bid.to_account_info().owner == program_id,
    )]
    pub bid: Account<'info, Bid>,
    #[account(
        mut,
        constraint = mint.decimals == 0,
        constraint = mint.supply == 1,
    )]
    pub mint: Account<'info, Mint>,
    /// CHECK: no account restrictions, partially validated with anchor check here
    #[account(
        mut,
        constraint = auction_factory.treasury.key() == treasury.key()
    )]
    pub treasury: AccountInfo<'info>,
    /// CHECK: metadata accounts are verified via cpi in the metadata program
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    /// CHECK: not used in the case of auctions without any bids, do account validation on-chain.
    #[account(mut)]
    pub bidder_token_account: AccountInfo<'info>,
    #[account(
        mut,
        constraint = auction_token_account.amount == 1,
        constraint = auction_token_account.owner == auction.key()
    )]
    pub auction_token_account: Account<'info, TokenAccount>,
    /// CHECK: verified via anchor address check
    #[account(address = mpl_token_metadata::id())]
    pub token_metadata_program: UncheckedAccount<'info>,
    #[account(address = spl_token::id())]
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    seed: String,
    sequence: u64
)]
pub struct CloseAuctionTokenAccount<'info> {
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes(),
        ],
        bump,
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(
        mut,
        seeds = [
            AUX_SEED.as_bytes(),
            auction_factory.key().as_ref(),
            sequence.to_string().as_bytes()
        ],
        bump,
        constraint = auction.to_account_info().owner == program_id,
    )]
    pub auction: Account<'info, Auction>,
    /// CHECK: no account restrictions, partially validated with anchor check here
    #[account(
        mut,
        constraint = auction_factory.treasury.key() == treasury.key()
    )]
    pub treasury: AccountInfo<'info>,
    #[account(
        mut,
        constraint = auction_token_account.amount == 0,
        constraint = auction_token_account.owner == auction.key()
    )]
    pub auction_token_account: Account<'info, TokenAccount>,
    #[account(address = spl_token::id())]
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

/// ===================================
/// context for admin instructions  ///
/// ===================================

#[derive(Accounts)]
#[instruction(
    seed: String,
    config_seed: String,
    data: AuctionFactoryData
)]
pub struct InitializeAuctionFactory<'info> {
    // payer is initial auction factory authority
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: no account restrictions, partially validated with anchor check here
    // is this sufficient to verify treasury account exists? if not, there is risk treasury funds
    // will be lost again until updated.
    #[account(constraint= treasury.lamports() > 0)]
    pub treasury: AccountInfo<'info>,
    // note: fully remove config account
    // #[account(
    //     seeds = [
    //         URI_CONFIG_SEED.as_bytes(),
    //         config_seed.as_bytes(),
    //     ],
    //     bump,
    //     constraint = config.to_account_info().owner == program_id,
    // )]
    // pub config: Account<'info, Config>,
    #[account(init,
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes()
        ],
        bump,
        payer = payer,
        space = AUCTION_FACTORY_ACCOUNT_SPACE,
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(seed: String)]
pub struct ModifyAuctionFactory<'info> {
    pub payer: Signer<'info>,
    #[account(mut,
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes()
        ],
        bump,
        constraint = auction_factory.authority.key() == payer.key(),
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
}

#[derive(Accounts)]
#[instruction(seed: String)]
pub struct TransferAuctionFactoryLamportsToTreasury<'info> {
    pub payer: Signer<'info>,
    #[account(mut,
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes()
        ],
        bump,
        constraint = auction_factory.authority.key() == payer.key(),
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    /// CHECK: no account restrictions, partially validated with anchor check here
    // is this sufficient to verify treasury account exists? if not, there is risk treasury funds
    // will be lost again until updated.
    #[account(mut,
        constraint = treasury.lamports() > 0,
        constraint = treasury.key() == auction_factory.treasury.key()
    )]
    pub treasury: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(seed: String)]
pub struct UpdateAuctionFactoryAuthority<'info> {
    pub payer: Signer<'info>,
    /// CHECK: no account restrictions, risky operation
    pub new_authority: AccountInfo<'info>,
    #[account(mut,
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes()
        ],
        bump,
        constraint = auction_factory.authority.key() == payer.key(),
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
}

#[derive(Accounts)]
#[instruction(seed: String)]
pub struct UpdateAuctionFactoryTreasury<'info> {
    pub payer: Signer<'info>,
    #[account(mut,
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes()
        ],
        bump,
        constraint = auction_factory.authority.key() == payer.key(),
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    /// CHECK: no account restrictions, partially validated with anchor check here
    // is this sufficient to verify treasury account exists? if not, there is risk treasury funds
    // will be lost again until updated.
    #[account(
        constraint = treasury.lamports() > 0,
        // since we are setting a new treasury, ignore check treasury.key() == auction_factory.treasury.key()
    )]
    pub treasury: AccountInfo<'info>,
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
    pub fn into_burn_token_context(&self) -> CpiContext<'_, '_, '_, 'info, Burn<'info>> {
        let cpi_program = self.token_program.to_account_info();

        // burn field changed `to` to `from`
        // https://github.com/coral-xyz/anchor/commit/4d9bd6adc6435252ea2973ea6531477d3dc2c8bb
        let cpi_accounts = Burn {
            mint: self.mint.to_account_info(),
            from: self.auction_token_account.to_account_info(),
            authority: self.auction.to_account_info(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}

impl<'info> CloseAuctionTokenAccount<'info> {
    pub fn into_close_token_account_context(
        &self,
    ) -> CpiContext<'_, '_, '_, 'info, CloseAccount<'info>> {
        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = CloseAccount {
            account: self.auction_token_account.to_account_info(),
            // send rent lamports to treasury
            destination: self.treasury.to_account_info(),
            authority: self.auction.to_account_info(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}

impl<'info> SupplyResource<'info> {
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

    pub fn into_update_metadata_context(
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

    pub fn into_sign_metadata_context(&self) -> CpiContext<'_, '_, '_, 'info, SignMetadata<'info>> {
        let cpi_program = self.token_metadata_program.to_account_info();

        let cpi_accounts = SignMetadata {
            metadata: self.metadata.to_account_info(),
            creator: self.auction_factory.to_account_info(),
            token_metadata_program: self.token_metadata_program.to_account_info(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}
