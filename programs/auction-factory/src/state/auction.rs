use {
    crate::{state::auction_factory::AuctionFactoryData, util::general::get_current_timestamp},
    anchor_lang::prelude::*,
};

// flow:
// 1. init auctions - set bids to 0 (no context change)
// 2. place bid - 2 accounts - current bid + next bid
// 2. settle auction - find winning bid account + winning bidder and pass that in?

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
    // address of the resource being auctioned; should not be null.
    pub resource: Option<Pubkey>,
    // === bids ===
    // number of bids on the current auction, used to compute bid PDA
    pub num_bids: u64,
    // note: we don't store the curernt bid because we can simply derive it

    // =================================

    // token mint address for the SPL token being used to bid; default to SOL. creating an auction where
    // bids are demonited in an SPL token means that all bids must use that SPL token.
    // ancillary note: there is more work to be done before SPL tokens could be used for auctions.
    // pub token_mint: Option<Pubkey>,
}

// auction struct sizing for account init
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
    // end_time
    8 +
    // finalized_end_time
    8 +
    // settled
    1 +
    // resource
    1 + 32 +
    // num_bids
    8;

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
        self.resource = None;
        self.num_bids = 0;
    }

    pub fn add_resource(&mut self, resource: Pubkey) {
        self.resource = Some(resource);
    }

    pub fn settle(&mut self) {
        let current_timestamp = get_current_timestamp().unwrap();

        self.settled = true;
        self.finalized_end_time = current_timestamp;
    }

    // todo: update as new functionality is needed?
    pub fn update_auction_after_bid(&mut self) -> Result<()> {
        // increment by 1
        self.num_bids = self.num_bids + 1;

        // feat: this is where we can extend the auction end time if someone
        // submits a winning bid within n time of original ending. pull extension from somewhere else.
        // let auction_extension: u64 = 600;
        // if self.end_time.checked_sub(current_timestamp) < auction_extension {
        //     self.end_time = self.end_time.checked_add(auction_extension).unwrap();
        // }

        Ok(())
    }
}
