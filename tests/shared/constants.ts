import { PublicKey } from "@solana/web3.js";

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export const DEFAULT_ALPHABET =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export const AUCTION_FACTORY_UUID_LEN = 5;
export const CONFIG_UUID_LEN = 5;

// ============================================================================
// combined with network check (== localnet), boolean controls which tests are run.
// true = all tests, including
//      - main auction lifecycle
//      - creating & settling a bunch of auctions
//      - creating an auction and receiving many bids
//      - create auction factory and max out config
// false = only run main auction lifecycle tests
// ============================================================================
// note: i recommend only running these tests that require this boolean on localnet.
// i'm guessing they will use up quite a bit of sweet sweet SOL, otherwise.
// ============================================================================
export const RUN_ALL_TESTS = true;
// ============================================================================
