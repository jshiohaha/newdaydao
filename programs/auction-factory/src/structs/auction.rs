use crate::structs::auction_factory::AuctionFactoryData;
use crate::util::get_current_timestamp;
use anchor_lang::prelude::*;

// #[account]
// #[derive(Default, Debug)]
#[account]
#[derive(Default)]
pub struct Auction {
    pub bump: u8,
    pub sequence: u64,
    // authority with permission to modify this auction
    pub authority: Pubkey,
    // epoch time that the auction started
    pub start_time: u64,
    // epoch time that the auction is scheduled to end
    pub end_time: u64,
    // epoch time that the auction actually ended; affected by auction extension from competing bids
    pub finalized_end_time: u64,
    // Whether ofr not the auction has been settled
    pub settled: bool,
    // current highest bid amount
    pub amount: u64,
    // address of the current highest bid, nullable if no bid
    pub bidder: Pubkey,
    // epoch time of the most recent bid was placed. used to keep track of auction timing.
    pub bid_time: u64,

    // // token ID for the related NFT to be auctioned
    // pub token_id: u64,
    // // token mint address for the SPL token being used to bid; default to SOL
    // pub token_mint: Option<Pubkey>,
}

impl Auction {
    pub fn init(
        &mut self,
        bump: u8,
        sequence: u64,
        authority: Pubkey,
        current_timestamp: u64,
        factory_data: AuctionFactoryData,
    ) {
        self.bump = bump;
        self.sequence = sequence;
        self.authority = authority;
        self.start_time = current_timestamp;
        self.end_time = current_timestamp + factory_data.duration;
        self.settled = false;
        self.amount = 0;
    }

    pub fn settle(&mut self) {
        let current_timestamp = get_current_timestamp().unwrap();

        self.settled = true;
        self.finalized_end_time = current_timestamp;
    }

    pub fn update_auction_with_bid(&mut self, amount: u64, bidder: Pubkey) {
        let current_timestamp = get_current_timestamp().unwrap();

        self.amount = amount;
        self.bidder = bidder;
        self.bid_time = current_timestamp;

        // feat: this is where we can extend the auction end time if someone
        // submits a winning bid within n time of original ending. pull extension from somewhere else.
        // let auction_extension: u64 = 600;
        // if self.end_time.checked_sub(current_timestamp) < auction_extension {
        //     self.end_time = self.end_time.checked_add(auction_extension).unwrap();
        // }
    }
}
