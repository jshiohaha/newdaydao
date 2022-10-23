use crate::{
    constant::{AUX_FACTORY_SEED, AUX_SEED},
    state::{auction::Auction, auction_factory::AuctionFactory},
    verify,
};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

#[derive(Accounts)]
#[instruction(
    seed: String,
    sequence: u64,
)]
pub struct SupplyResource<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
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

// [pending]: remove this
// impl<'info> SupplyResource<'info> {
//     pub fn into_create_metadata_context(
//         &self,
//     ) -> CpiContext<'_, '_, '_, 'info, CreateMetadata<'info>> {
//         let cpi_program = self.token_metadata_program.to_account_info();

//         let cpi_accounts = CreateMetadata {
//             metadata: self.metadata.to_account_info(),
//             mint: self.mint.to_account_info(),
//             mint_authority: self.auction.to_account_info(),
//             payer: self.payer.to_account_info(),
//             update_authority: self.auction.to_account_info(),
//             token_metadata_program: self.token_metadata_program.clone(),
//             token_program: self.token_program.clone(),
//             system_program: self.system_program.clone(),
//             rent: self.rent.clone(),
//         };

//         CpiContext::new(cpi_program, cpi_accounts)
//     }

//     pub fn into_create_master_edition_metadata_context(
//         &self,
//     ) -> CpiContext<'_, '_, '_, 'info, CreateMasterEdition<'info>> {
//         let cpi_program = self.token_metadata_program.to_account_info();

//         let cpi_accounts = CreateMasterEdition {
//             payer: self.payer.to_account_info(),
//             metadata: self.metadata.to_account_info(),
//             master_edition: self.master_edition.to_account_info(),
//             mint: self.mint.to_account_info(),
//             mint_authority: self.auction.to_account_info(),
//             update_authority: self.auction.to_account_info(),
//             token_metadata_program: self.token_metadata_program.clone(),
//             token_program: self.token_program.clone(),
//             system_program: self.system_program.clone(),
//             rent: self.rent.clone(),
//         };

//         CpiContext::new(cpi_program, cpi_accounts)
//     }

//     pub fn into_update_metadata_context(
//         &self,
//     ) -> CpiContext<'_, '_, '_, 'info, UpdateMetadata<'info>> {
//         let cpi_program = self.token_metadata_program.to_account_info();

//         let cpi_accounts = UpdateMetadata {
//             metadata: self.metadata.to_account_info(),
//             update_authority: self.auction.to_account_info(),
//             token_metadata_program: self.token_metadata_program.to_account_info(),
//         };

//         CpiContext::new(cpi_program, cpi_accounts)
//     }

//     pub fn into_sign_metadata_context(&self) -> CpiContext<'_, '_, '_, 'info, SignMetadata<'info>> {
//         let cpi_program = self.token_metadata_program.to_account_info();

//         let cpi_accounts = SignMetadata {
//             metadata: self.metadata.to_account_info(),
//             creator: self.auction_factory.to_account_info(),
//             token_metadata_program: self.token_metadata_program.to_account_info(),
//         };

//         CpiContext::new(cpi_program, cpi_accounts)
//     }
// }

// note: i think we can decouple auction sequence and token number
// [pending]: remove these params?
pub fn handle(ctx: Context<SupplyResource>, _seed: String, _sequence: u64) -> Result<()> {
    // let auction_factory_bump: u8 = *ctx.bumps.get("auction_factory").unwrap();

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

    ctx.accounts.auction.add_resource(ctx.accounts.mint.key());

    // [[ todo(soosh) -- pending ]]: move metadata stuff to separate contract!
    // let seq_str = sequence.to_string();
    // let auction_seeds = &[
    //     AUX_SEED.as_bytes(),
    //     auction_factory_key.as_ref(),
    //     seq_str.as_bytes(),
    //     &[auction_bump],
    // ];

    // ======== handled elsewhere ========

    // let uri = "https://someuri.com/metadata.json".to_string();
    // let auction_factory_key = ctx.accounts.auction_factory.key();
    // let metadata_info = provide_metadata(
    //     ctx.accounts.auction.key(),
    //     auction_factory_key,
    //     current_sequence,
    //     uri,
    // );

    // create_metadata::handle(
    //     ctx.accounts
    //         .into_create_metadata_context()
    //         .with_signer(&[auction_seeds]),
    //     metadata_info,
    // )?;

    // create_master_edition::handle(
    //     ctx.accounts
    //         .into_create_master_edition_metadata_context()
    //         .with_signer(&[auction_seeds]),
    // )?;

    // // update token metadata so that primary_sale_happened = true
    // update_metadata::handle(
    //     ctx.accounts
    //         .into_update_metadata_context()
    //         .with_signer(&[auction_seeds]),
    // )?;

    // // auction factory immediately signs metadata as a creator so that it doesn't have to do later
    // sign_metadata::handle(ctx.accounts.into_sign_metadata_context().with_signer(&[&[
    //     AUX_FACTORY_SEED.as_bytes(),
    //     seed.as_bytes(),
    //     &[auction_factory_bump],
    // ]]))?;

    Ok(())
}

// [pending] remove
// // creators will be auction & auction factory account for purposes of secondary
// // royalties since treasury can change. we will include an on-chain function to dump
// // lamports from auction factory PDA to treasury.
// pub fn provide_metadata(
//     auction: Pubkey,
//     auction_factory: Pubkey,
//     current_sequence: u64,
//     uri: String,
// ) -> MetadataInfo {
//     // source: https://github.com/metaplex-foundation/metaplex/blob/626d15d82be241931425cf0b11105dbf25bc9ef8/rust/token-metadata/program/src/utils.rs#L86
//     let creators = vec![
//         Creator {
//             address: auction,
//             verified: true, // update_authority can be verified by default
//             share: AUCTION_CREATOR_SHARE,
//         },
//         Creator {
//             address: auction_factory,
//             // metaplex metadata prevents us from unilaterally verifying other creators.
//             // auction factory signs after creation.
//             verified: false,
//             share: AUCTION_FACTORY_CREATOR_SHARE,
//         },
//     ];

//     return MetadataInfo {
//         name: format!("{} #{}", TOKEN_BASE_NAME, current_sequence),
//         symbol: TOKEN_SYMBOL.to_string(),
//         uri: format!("https://arweave.net/{}", uri),
//         creators: Some(creators),
//         seller_fee_basis_points: SELLER_FEE_BASIS_POINTS,
//         update_authority_is_signer: true,
//         is_mutable: true,
//         // metaplex metadata v2 optional params
//         collection: None,
//         uses: None,
//     };
// }
