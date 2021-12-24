use anchor_lang::prelude::*;

#[error]
pub enum ErrorCode {
    #[msg("Account does not have correct owner!")]
    IncorrectOwner,
    #[msg("Account is not initialized!")]
    Uninitialized,
    #[msg("Activate auction factory before performing such action.")]
    InactiveAuctionFactory,
    #[msg("Unexpected active value.")]
    UnexpectedActiveValue,
    #[msg("Mint Mismatch!")]
    MintMismatch,
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
    #[msg("Account is not authorized to take such action.")]
    NotAuthorized,
    #[msg("Auction address mismatch.")]
    AuctionAddressMismatch,
    #[msg("Initialize auctions can only be called once.")]
    AuctionsAlreadyInitialized,
    #[msg("Public key mismatch")]
    PublicKeyMismatch,
    #[msg("Bidder is already winning the auction")]
    BidderAlreadyWinning,
    #[msg("Not enough SOL to pay for this minting")]
    NotEnoughSOL,
    #[msg("Token account not owned by winning bidder")]
    TokenAccountNotOwnedByWinningBidder,
    #[msg("Token transfer failed")]
    TokenTransferFailed,
    #[msg("Treasury mismatch!")]
    TreasuryMismatch,
    #[msg("GENERAL ERRROR")]
    GeneralError,
    #[msg("Numerical overflow error!")]
    NumericalOverflowError,
    #[msg("Insufficient account balance!")]
    InsufficientAccountBalance,
}
