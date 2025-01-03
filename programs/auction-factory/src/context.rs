use {
    crate::{
        constant::{AUX_FACTORY_SEED, AUX_SEED, CONFIG_SEED_LEN, MAX_URI_LENGTH, URI_CONFIG_SEED},
        instructions::{
            create_master_edition::CreateMasterEdition, create_metadata::CreateMetadata,
            transfer::TransferLamports, update_metadata::UpdateMetadata, sign_metadata::SignMetadata
        },
        structs::{
            auction::{Auction, AUCTION_ACCOUNT_SPACE},
            auction_factory::{AuctionFactory, AuctionFactoryData, AUCTION_FACTORY_ACCOUNT_SPACE},
            config::Config,
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
    auction_factory_bump: u8,
    seed: String,
    auction_bump: u8,
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
        bump = auction_factory_bump,
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    #[account(
        seeds = [
            AUX_SEED.as_bytes(),
            auction_factory.key().as_ref(),
            sequence.to_string().as_bytes(),
        ],
        bump = auction_bump,
        constraint = auction.to_account_info().owner == program_id,
    )]
    pub auction: Account<'info, Auction>,
    #[account(address = spl_token::id())]
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(
    auction_factory_bump: u8,
    seed: String,
    auction_bump: u8,
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
        bump = auction_factory_bump,
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
        bump = auction_bump,
        payer = payer,
        space = AUCTION_ACCOUNT_SPACE,
        constraint = auction.to_account_info().owner == program_id,
    )]
    pub auction: Account<'info, Auction>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    auction_factory_bump: u8,
    seed: String,
    current_auction_bump: u8,
    next_auction_bump: u8,
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
        bump = auction_factory_bump,
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
        bump = current_auction_bump,
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
        bump = next_auction_bump,
        payer = payer,
        space = AUCTION_ACCOUNT_SPACE,
        constraint = next_auction.to_account_info().owner == program_id,
    )]
    pub next_auction: Account<'info, Auction>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    auction_factory_bump: u8,
    seed: String,
    auction_bump: u8,
    config_bump: u8,
    config_seed: String,
    sequence: u64,
)]
pub struct SupplyResource<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [
            URI_CONFIG_SEED.as_bytes(),
            config_seed.as_bytes()
        ],
        bump = config_bump,
    )]
    pub config: Account<'info, Config>,
    #[account(
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes(),
        ],
        bump = auction_factory_bump,
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
        bump = auction_bump,
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
    // metadata accounts are verified via cpi in the metadata program
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    #[account(mut)]
    pub master_edition: AccountInfo<'info>,
    // note: executable macro will not work for token_metadata_program on localnet
    #[account(address = mpl_token_metadata::id())]
    pub token_metadata_program: UncheckedAccount<'info>,
    #[account(address = spl_token::id())]
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(
    auction_factory_bump: u8,
    seed: String,
    auction_bump: u8,
    sequence: u64,
    amount: u64
)]
pub struct PlaceBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(mut)]
    pub leading_bidder: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes(),
        ],
        bump = auction_factory_bump,
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
        bump = auction_bump,
        constraint = auction.to_account_info().owner == program_id,
    )]
    pub auction: Account<'info, Auction>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    bidder_account_bump: u8,
    auction_factory_bump: u8,
    seed: String,
    auction_bump: u8,
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
        bump = auction_factory_bump,
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
        bump = auction_bump,
        constraint = auction.to_account_info().owner == program_id,
    )]
    pub auction: Account<'info, Auction>,
    #[account(
        mut,
        constraint = mint.decimals == 0,
        constraint = mint.supply == 1,
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = auction_factory.treasury.key() == treasury.key()
    )]
    pub treasury: AccountInfo<'info>,
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    // not used in the case of auctions without any bids, do account validation on-chain.
    #[account(mut)]
    pub bidder_token_account: AccountInfo<'info>,
    #[account(
        mut,
        constraint = auction_token_account.amount == 1,
        constraint = auction_token_account.owner == auction.key()
    )]
    pub auction_token_account: Account<'info, TokenAccount>,
    #[account(address = mpl_token_metadata::id())]
    pub token_metadata_program: UncheckedAccount<'info>,
    #[account(address = spl_token::id())]
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    auction_factory_bump: u8,
    seed: String,
    auction_bump: u8,
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
        bump = auction_factory_bump,
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
        bump = auction_bump,
        constraint = auction.to_account_info().owner == program_id,
    )]
    pub auction: Account<'info, Auction>,
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
    bump: u8,
    seed: String,
    config_bump: u8,
    config_seed: String,
    data: AuctionFactoryData
)]
pub struct InitializeAuctionFactory<'info> {
    // payer is initial auction factory authority
    #[account(mut)]
    pub payer: Signer<'info>,
    // is this sufficient to verify treasury account exists? if not, there is risk treasury funds
    // will be lost again until updated.
    #[account(constraint= treasury.lamports() > 0)]
    pub treasury: AccountInfo<'info>,
    #[account(
        seeds = [
            URI_CONFIG_SEED.as_bytes(),
            config_seed.as_bytes(),
        ],
        bump = config_bump,
        constraint = config.to_account_info().owner == program_id,
    )]
    pub config: Account<'info, Config>,
    #[account(init,
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes()
        ],
        bump = bump,
        payer = payer,
        space = AUCTION_FACTORY_ACCOUNT_SPACE,
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bump: u8, seed: String)]
pub struct ModifyAuctionFactory<'info> {
    pub payer: Signer<'info>,
    #[account(mut,
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes()
        ],
        bump = bump,
        constraint = auction_factory.authority.key() == payer.key(),
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
}

#[derive(Accounts)]
#[instruction(bump: u8, seed: String)]
pub struct TransferAuctionFactoryLamportsToTreasury<'info> {
    pub payer: Signer<'info>,
    #[account(mut,
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes()
        ],
        bump = bump,
        constraint = auction_factory.authority.key() == payer.key(),
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    // is this sufficient to verify treasury account exists? if not, there is risk treasury funds
    // will be lost again until updated.
    #[account(mut,
        constraint = treasury.lamports() > 0,
        constraint = treasury.key() == auction_factory.treasury.key()
    )]
    pub treasury: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(bump: u8, seed: String)]
pub struct UpdateAuctionFactoryAuthority<'info> {
    pub payer: Signer<'info>,
    pub new_authority: AccountInfo<'info>,
    #[account(mut,
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes()
        ],
        bump = bump,
        constraint = auction_factory.authority.key() == payer.key(),
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
}

#[derive(Accounts)]
#[instruction(auction_factory_bump: u8, seed: String)]
pub struct UpdateAuctionFactoryTreasury<'info> {
    pub payer: Signer<'info>,
    #[account(mut,
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes()
        ],
        bump = auction_factory_bump,
        constraint = auction_factory.authority.key() == payer.key(),
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
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

        let cpi_accounts = Burn {
            mint: self.mint.to_account_info(),
            to: self.auction_token_account.to_account_info(),
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

    pub fn into_sign_metadata_context(
        &self,
    ) -> CpiContext<'_, '_, '_, 'info, SignMetadata<'info>> {
        let cpi_program = self.token_metadata_program.to_account_info();

        let cpi_accounts = SignMetadata {
            metadata: self.metadata.to_account_info(),
            creator: self.auction_factory.to_account_info(),
            token_metadata_program: self.token_metadata_program.to_account_info(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}

/// ===================================
/// context for new config          ///
/// ===================================

#[derive(Accounts)]
#[instruction(bump: u8, seed: String, max_supply: u32)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(init,
        seeds = [
            URI_CONFIG_SEED.as_bytes(),
            seed.as_bytes(),
        ],
        bump = bump,
        payer = payer,
        space = InitializeConfig::space(max_supply),
        constraint = config.to_account_info().owner == program_id,
    )]
    pub config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(auction_factory_bump: u8, seed: String, config_bump: u8, config_seed: String)]
pub struct AddUrisToConfig<'info> {
    pub payer: Signer<'info>,
    #[account(mut,
        seeds = [
            URI_CONFIG_SEED.as_bytes(),
            config_seed.as_bytes(),
        ],
        bump = config_bump,
    )]
    pub config: Account<'info, Config>,
    #[account(
        seeds = [
            AUX_FACTORY_SEED.as_bytes(),
            seed.as_bytes()
        ],
        bump = auction_factory_bump,
        constraint = auction_factory.authority.key() == payer.key(),
        constraint = auction_factory.config.key() == config.key(),
        constraint = auction_factory.to_account_info().owner == program_id,
    )]
    pub auction_factory: Account<'info, AuctionFactory>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeConfig<'info> {
    // 10 MB is max account storage size. max uri len in metaplex metadata standard is 200.
    // assume max str len for upper bound when determining max_supply, e.g. 100.
    // for this impl, we are only going to use arweave hashes. the URLs are never that
    // long.

    // assuming max uri len of 100, max supply will be topped at
    // (10240 - 16) / 104 = n ~ 98 elements. kind of an annoying number.
    // to achieve max_supply = 100, we need max uri len of at most 98.
    // again, a bit annoying.

    // most arweave hashes i have seen in my (non-exhaustive) search are 43 chars long
    // without prepended url constant. set max uri 75 for now, some extra room just in case.

    // max account size is 10280. if user specifies bad combo of max_supply and MAX_URI_LENGTH
    // that is greater than that, we will let tx fail in solana rather than setting account size
    // to max of 10280. that could create problems down the road.
    fn space(max_supply: u32) -> usize {
        return
            // discriminator
            8 +
            // seed, string + size_of_char * num seed chars
            4 + (8 * CONFIG_SEED_LEN) +
            // max_supply
            4 +
            // update_idx
            4 +
            // is_udpated
            1 +
            // vec of Strings representing URI
            4 + ((max_supply as usize) * (4 + MAX_URI_LENGTH));
        // a little extra buffer
        // 8;
    }
}