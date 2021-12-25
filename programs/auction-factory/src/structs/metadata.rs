use {metaplex_token_metadata::state::Creator, solana_program::pubkey::Pubkey};

pub struct MetadataInfo {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub creators: Option<Vec<Creator>>,
    pub seller_fee_basis_points: u16,
    pub update_authority_is_signer: bool,
    pub is_mutable: bool,
}

// TODO: udpate this to be more dynamic
pub fn get_metadata_info(auction: Pubkey, auction_factory: Pubkey) -> MetadataInfo {
    // source: https://github.com/metaplex-foundation/metaplex/blob/626d15d82be241931425cf0b11105dbf25bc9ef8/rust/token-metadata/program/src/utils.rs#L86
    let creators = vec![
        Creator {
            address: auction,
            verified: true, // update_authority can be verified by default
            share: 0,
        },
        Creator {
            address: auction_factory,
            verified: false, // metaplex prevents us from unilaterally verifying other creators
            share: 100,
        },
    ];

    return MetadataInfo {
        name: String::from("NAME"), // name.push_str(&session);
        symbol: String::from("SYMB"),
        uri: String::from("https://arweave.net/EEsj8ZXEZaboA7SxVE9tim4eVje0sygduBbDxV1Lws0"),
        // who do we want the creator address to be?; maybe some treasury?
        creators: Some(creators),
        seller_fee_basis_points: 420, // heh
        update_authority_is_signer: true,
        is_mutable: true,
    };
}
