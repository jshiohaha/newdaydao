use mpl_token_metadata::state::{Creator, Collection, Uses};

pub struct MetadataInfo {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub creators: Option<Vec<Creator>>,
    pub seller_fee_basis_points: u16,
    pub update_authority_is_signer: bool,
    pub is_mutable: bool,
    pub collection: Option<Collection>,
    pub uses: Option<Uses>
}
