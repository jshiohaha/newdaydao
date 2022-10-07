// program level constants
pub const AUX_FAX_PROGRAM_ID: &str = "2jbfTkQ4DgbSZtb8KTq61v2ox8s1GCuGebKa1EPq3tbY";
pub const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID: &str =
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

// prefixes used in PDA derivations to avoid collisions with other programs.
pub const AUX_FACTORY_SEED: &str = "aux_fax";
pub const AUX_SEED: &str = "aux";
pub const URI_CONFIG_SEED: &str = "config";

// auction factory
pub const AUCTION_FACTORY_SEED_LEN: usize = 5;

// config
pub const CONFIG_SEED_LEN: usize = 5;
pub const MAX_URI_LENGTH: usize = 75;

// metadata
pub const AUCTION_CREATOR_SHARE: u8 = 0;
pub const AUCTION_FACTORY_CREATOR_SHARE: u8 = 100;
pub const SELLER_FEE_BASIS_POINTS: u16 = 750;
pub const TOKEN_BASE_NAME: &str = "NEW DAY DAO";
pub const TOKEN_SYMBOL: &str = "NDD";
