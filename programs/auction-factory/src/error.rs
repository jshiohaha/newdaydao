use anchor_lang::prelude::*;

#[error]
pub enum ErrorCode {
    #[msg("Activate auction factory before performing such action.")]
    InactiveAuctionFactory,
    #[msg("Unexpected active value.")]
    UnexpectedActiveValue,
    #[msg("Auction is not in a state to perform such action.")]
    InactiveAuction,
    #[msg("Must settle any ongoing auction before creating a new auction.")]
    UnsettledAuction,
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
    #[msg("Token transfer failed")]
    TokenTransferFailed,
    #[msg("GENERAL ERRROR")]
    GeneralError,
}
// BidOnExpiredAuction
