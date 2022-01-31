use anchor_lang::prelude::*;

#[error]
pub enum ErrorCode {
    // token account
    #[msg("Account does not have correct owner!")]
    IncorrectOwner,
    #[msg("Account is not initialized!")]
    Uninitialized,
    #[msg("Token account not owned by winning bidder")]
    TokenAccountNotOwnedByWinningBidder,

    // token mint
    #[msg("Mint Mismatch!")]
    MintMismatch,

    // auction factory
    #[msg("Activate auction factory before performing such action.")]
    InactiveAuctionFactory,
    #[msg("Treasury mismatch!")]
    TreasuryMismatch,
    #[msg("Uuid must be length 10")]
    AuctionFactoryUuidInvalidLengthError,
    #[msg("Uuid must be length 5")]
    ConfigUuidInvalidLengthError,

    // config
    #[msg("Config element too short. Config data elements must be at least 1 char in length.")]
    ConfigElementTooShortError,
    #[msg("Config element too long. Must be less than max length!")]
    ConfigElementTooLongError,
    #[msg("Insufficient config error!")]
    InsufficientConfigError,

    // auction
    #[msg("Auction is not in a state to perform such action.")]
    InactiveAuction,
    #[msg("Auction resource can only be generated once.")]
    AuctionResourceAlreadyExists,
    #[msg("Must settle any ongoing auction before creating a new auction.")]
    UnsettledAuction,
    #[msg("Auction is already settled.")]
    AuctionAlreadySettled,
    #[msg("Auction is live and cannot be settled.")]
    AuctionIsLive,
    #[msg("Bid must be a non-negative, non-zero amount. Bid must also beat previous bid by some percent.")]
    InvalidBidAmount,
    #[msg("Cannot modify an auction that does not exist.")]
    NoActiveAuction,
    #[msg("Auction address mismatch.")]
    AuctionAddressMismatch,
    // not sure this can ever be called because programa invocation *should* fail when trying to re-init
    // an already initialized account.
    #[msg("Initialize auctions can only be called once.")]
    AuctionsAlreadyInitialized,
    #[msg("Bidder is already winning the auction")]
    BidderAlreadyWinning,
    #[msg("Wrong settle auction endpoint!")]
    WrongSettleAuctionEndpoint,
    #[msg("Must supply resource to auction before settling!")]
    AuctionHasNoResourceAvailable,

    // numbooooooor ops
    #[msg("Numerical overflow error!")]
    NumericalOverflowError,
    #[msg("Numerical underflow error!")]
    NumericalUnderflowError,
    #[msg("Checked REM error")]
    CheckedRemError, // https://docs.rs/num-traits/0.2.14/num_traits/ops/checked/trait.CheckedRem.html
    #[msg("Numerical division error!")]
    NumericalDivisionError,

    // misc
    #[msg("Account is not authorized to take such action.")]
    NotAuthorized,
    #[msg("Public key mismatch")]
    PublicKeyMismatch,
    #[msg("Token transfer failed")]
    TokenTransferFailed,
    #[msg("Insufficient account balance!")]
    InsufficientAccountBalance,
    #[msg("Forced error")]
    ForcedError,
}
