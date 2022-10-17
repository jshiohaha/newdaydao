use anchor_lang::prelude::*;
use solana_program::borsh::try_from_slice_unchecked;

use crate::util::general::get_current_timestamp;

// process of creating a new bid
// -> pass in the current bid & verify account
// -> if new bid meets criteria, create new bid and increment counter
// todo: validate account address, ownership, bid idx

// derive bid PDA from auction and bid index? -> quickly list
#[account]
#[derive(Default)]
pub struct Bid {
    pub bump: u8, // 1
    // pubkey of auction
    pub auction: Pubkey, // 32
    // index of bid in auction
    pub bid_idx: u64, // 8
    // pubkey of bidder
    pub bidder: Pubkey, // 32
    // timestamp at which bid was submitted
    pub submitted_at: u64, // 8
    // bid amount
    pub amount: u64, // 8
}

// bid struct sizing for account init
pub const BID_ACCOUNT_SPACE: usize =
    // discriminator
    8 +
    // bump
    1 +
    // auction
    32 +
    // bid_idx
    8 +
    // bidder
    32 +
    // submitted_at
    8 +
    // bid amount
    8;

pub fn to_bid(account_info: &AccountInfo) -> Bid {
    // .copy_from_slice(&[0u8; 8]);
    try_from_slice_unchecked(&account_info.data.borrow()[0..8]).unwrap()
}

impl Bid {
    pub fn init_bid(
        &mut self,
        bump: u8,
        auction: Pubkey,
        bid_idx: u64,
        bidder: Pubkey,
        amount: u64,
    ) {
        let current_timestamp = get_current_timestamp().unwrap();

        self.bump = bump;
        self.auction = auction;
        self.bid_idx = bid_idx;
        self.bidder = bidder;
        self.submitted_at = current_timestamp;
        self.amount = amount;
    }
}
