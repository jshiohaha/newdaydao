use {
    metaplex_token_metadata::state::Creator,
    solana_program::pubkey::Pubkey,
};

pub struct MetadataInfo {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub creators: Option<Vec<Creator>>,
    pub seller_fee_basis_points: u16,
    pub update_authority_is_signer: bool,
    pub is_mutable: bool
}

// TODO: udpate this to be more dynamic
pub fn get_metadata_info(
    auction_authority: Pubkey,
) -> MetadataInfo {
    let creators = vec![Creator {
        address: auction_authority,
        verified: true, // verified by default since the auction factory is the only creator
        share: 100,
    }];

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
