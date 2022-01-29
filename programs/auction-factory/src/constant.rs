
// prefixes used in PDA derivations to avoid collisions with other programs.
pub const AUX_FACTORY_SEED: &[u8] = b"aux_fax";
pub const AUX_SEED: &[u8] = b"aux";
pub const URI_CONFIG_SEED: &[u8] = b"config";
pub const AUX_FAX_PROGRAM_ID: &str = "44viVLXpTZ5qTdtHDN59iYLABZUaw8EBwnTN4ygehukp";
pub const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID: &str =
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

// pub const MAX_ACCOUNT_SIZE: usize = 10280;

pub const AUCTION_CREATOR_SHARE: u8 = 0;
pub const AUCTION_FACTORY_CREATOR_SHARE: u8 = 100;
pub const SELLER_FEE_BASIS_POINTS: u16 = 750;

// TODO: fix this
pub const TOKEN_BASE_NAME: &str = "NEW DAY DAO";
pub const TOKEN_SYMBOL: &str = "NDD";
pub const MAX_URI_LENGTH: usize = 75;
