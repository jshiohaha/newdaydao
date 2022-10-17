use {
    crate::{
        constant::{
            AUCTION_CREATOR_SHARE, AUCTION_FACTORY_CREATOR_SHARE, SELLER_FEE_BASIS_POINTS,
            TOKEN_BASE_NAME, TOKEN_SYMBOL,
        },
        state::metadata::MetadataInfo,
    },
    mpl_token_metadata::state::Creator,
    solana_program::pubkey::Pubkey,
};

// creators will be auction & auction factory account for purposes of secondary
// royalties since treasury can change. we will include an on-chain function to dump
// lamports from auction factory PDA to treasury.
pub fn provide_metadata(
    auction: Pubkey,
    auction_factory: Pubkey,
    current_sequence: u64,
    uri: String,
) -> MetadataInfo {
    // source: https://github.com/metaplex-foundation/metaplex/blob/626d15d82be241931425cf0b11105dbf25bc9ef8/rust/token-metadata/program/src/utils.rs#L86
    let creators = vec![
        Creator {
            address: auction,
            verified: true, // update_authority can be verified by default
            share: AUCTION_CREATOR_SHARE,
        },
        Creator {
            address: auction_factory,
            // metaplex metadata prevents us from unilaterally verifying other creators.
            // auction factory signs after creation.
            verified: false,
            share: AUCTION_FACTORY_CREATOR_SHARE,
        },
    ];

    return MetadataInfo {
        name: format!("{} #{}", TOKEN_BASE_NAME, current_sequence),
        symbol: TOKEN_SYMBOL.to_string(),
        uri: format!("https://arweave.net/{}", uri),
        creators: Some(creators),
        seller_fee_basis_points: SELLER_FEE_BASIS_POINTS,
        update_authority_is_signer: true,
        is_mutable: true,
        // metaplex metadata v2 optional params
        collection: None,
        uses: None,
    };
}
