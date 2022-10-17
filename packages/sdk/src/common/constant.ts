import { PublicKey } from "@solana/web3.js";
import { BN } from '@project-serum/anchor';

export const AUX_FACTORY_PROGRAM_ID = new PublicKey(
    "2jbfTkQ4DgbSZtb8KTq61v2ox8s1GCuGebKa1EPq3tbY"
);

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export const TOKEN_BURN_ADDRESS = new PublicKey(
    "1nc1nerator11111111111111111111111111111111"
);

export const AUX_SEED = "aux";
export const AUX_FAX_SEED = "aux_fax";
export const URI_CONFIG_SEED = "config";

export const AUCTION_FACTORY_SEED_LEN = 5;
export const CONFIG_SEED_LEN = 5;

export const BN_ZERO = new BN(0);
export const BN_ONE = new BN(1);