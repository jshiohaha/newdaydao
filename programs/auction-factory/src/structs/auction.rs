use {
    crate::{
        constant::MAX_BIDS_TO_RECORD, structs::auction_factory::AuctionFactoryData,
        util::general::get_current_timestamp, util::vec::update_vec,
    },
    anchor_lang::prelude::*,
};

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, PartialEq, Debug)]
pub struct Bid {
    // pubkey of bidder
    pub bidder: Pubkey,
    // timestamp at which bid was submitted
    pub updated_at: u64,
    // bid amount
    pub amount: u64,
}

#[account]
#[derive(Default)]
pub struct Auction {
    pub bump: u8,
    // index of auction managed by the auction factory, zero indexed
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
    // address of the resource being auctioned; should not be null.
    pub resource: Option<Pubkey>,
    // vec of bids submitted
    pub bids: Vec<Bid>,
    // token mint address for the SPL token being used to bid; default to SOL
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
        self.resource = None;
        self.bids = Vec::new();
    }

    pub fn add_resource(&mut self, resource: Pubkey) {
        self.resource = Some(resource);
    }

    pub fn settle(&mut self) {
        let current_timestamp = get_current_timestamp().unwrap();

        self.settled = true;
        self.finalized_end_time = current_timestamp;
    }

    pub fn update_auction_with_bid(&mut self, amount: u64, bidder: Pubkey) -> ProgramResult {
        let current_timestamp = get_current_timestamp().unwrap();

        self.amount = amount;
        self.bidder = bidder;
        self.bid_time = current_timestamp;

        let bid = Bid {
            bidder: bidder,
            updated_at: current_timestamp,
            amount: amount,
        };

        update_vec(&mut self.bids, bid, MAX_BIDS_TO_RECORD)?;

        // feat: this is where we can extend the auction end time if someone
        // submits a winning bid within n time of original ending. pull extension from somewhere else.
        // let auction_extension: u64 = 600;
        // if self.end_time.checked_sub(current_timestamp) < auction_extension {
        //     self.end_time = self.end_time.checked_add(auction_extension).unwrap();
        // }

        Ok(())
    }
}

// auction account struct sizing for account init
pub const BID_SPACE: usize =
    // bidder
    32 +
    // updated_at
    8 +
    // bid amount
    8;

pub const AUCTION_ACCOUNT_SPACE: usize =
    // discriminator
    8 +
    // bump
    1 +
    // sequence
    8 +
    // authority
    32 +
    // start_time
    8 +
    // end_tiem
    8 +
    // finalized_end_time
    8 +
    // settled
    1 +
    // amount
    8 +
    // bidder
    32 +
    // bid_time
    8 +
    // resource
    1 + 32 +
    // bids
    4 + (BID_SPACE * MAX_BIDS_TO_RECORD);
