import { PublicKey } from "@solana/web3.js";

export const AUX_FACTORY_PROGRAM_ID = new PublicKey(
    "44viVLXpTZ5qTdtHDN59iYLABZUaw8EBwnTN4ygehukp"
);

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

export const TOKEN_BURN_ADDRESS = new PublicKey(
    "1nc1nerator11111111111111111111111111111111"
);

export const AUX_SEED = "aux";
export const AUX_FAX_SEED = "aux_fax";
export const URI_CONFIG_SEED = "config";

export const AUCTION_FACTORY_UUID_LEN = 5;
export const CONFIG_UUID_LEN = 5;

export const LOCAL_WALLET_PATH = process.env.LOCAL_WALLET_PATH;

export const DEFAULT_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';