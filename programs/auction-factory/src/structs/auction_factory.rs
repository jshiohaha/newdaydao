// use crate::structs::auction::Auction;
use crate::util::get_current_timestamp;
use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct AuctionFactoryAuthority {
    pub bump: u8,
}

// ?quest: what do all the derive params mean. i.e. PartialEq, Debug
#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, PartialEq, Debug)]
pub struct AuctionFactoryData {
    // min amount of time left in an auction after a new bid is created
    pub time_buffer: u64,
    // min percentage difference between the last bid amount and the current bid, in basis points
    pub min_bid_percentage_increase: u64,
    // min price accepted in an auction
    pub min_reserve_price: u64,
    // duration of a single auction, in seconds
    pub duration: u64,
    // NFT contract address, custom version of candy machine 🍬
    // pub nft_contract: PublicKey,
    // mint address of the auction's payment
    // pub payment_mint: PublicKey,
}

#[account]
#[derive(Default)]
pub struct AuctionFactory {
    pub bump: u8,
    // number of auctions managed by sequence
    pub sequence: u64,
    // authority with permission to modify this auction
    pub authority: Pubkey,
    // representation of if the auction factory is active
    pub is_active: bool,
    // auction factory data that can be initialized and later updated
    // by invoking program functions
    pub data: AuctionFactoryData,
    // epoch time at which the auction factory was initialized
    pub initialized_at: u64,
    // epoch time from which the auction factory has been active;
    // should be the same as initialized_at unless the auction factory is paused and
    // later resumed.
    pub active_since: u64,
}

impl AuctionFactory {
    pub fn init(&mut self, bump: u8, authority: Pubkey, data: AuctionFactoryData) {
        let current_timestamp = get_current_timestamp().unwrap();

        self.bump = bump;
        self.sequence = 0;
        self.authority = authority;
        self.is_active = false;
        self.data = data;

        self.initialized_at = current_timestamp;
        self.active_since = current_timestamp;
    }

    pub fn pause(&mut self) {
        self.is_active = false;
    }

    pub fn resume(&mut self) {
        let current_timestamp = get_current_timestamp().unwrap();

        self.is_active = true;
        self.active_since = current_timestamp;
    }

    pub fn increment_sequence(&mut self) {
        let updated_sequence = self.sequence + 1;
        self.sequence = updated_sequence;
    }
}
