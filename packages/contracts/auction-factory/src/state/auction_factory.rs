use {crate::util::general::get_current_timestamp, anchor_lang::prelude::*};

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
}

#[account]
#[derive(Default)]
pub struct AuctionFactory {
    pub bump: u8,
    // auction factory seed
    pub seed: String,
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
    // address of the auction factory's treasury. post auction settlement, the winning bid
    // amount will be transferred here.
    pub treasury: Pubkey,
    // todo: prev removed config, need to add descriptor & category accounts
}

impl AuctionFactory {
    pub fn init(
        &mut self,
        bump: u8,
        seed: String,
        authority: Pubkey,
        treasury: Pubkey,
        data: AuctionFactoryData,
    ) {
        let current_timestamp = get_current_timestamp().unwrap();

        self.bump = bump;
        self.seed = seed;
        self.sequence = 0;
        self.authority = authority;
        self.is_active = false;
        self.data = data;
        self.initialized_at = current_timestamp;
        self.active_since = current_timestamp;
        self.treasury = treasury;
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

    pub fn update_authority(&mut self, authority: Pubkey) {
        self.authority = authority;
    }

    pub fn update_treasury(&mut self, treasury: Pubkey) {
        self.treasury = treasury;
    }

    pub fn update_data(&mut self, data: AuctionFactoryData) {
        self.data = data;
    }
}

// auction factory account struct sizing for account init
pub const AUCTION_FACTORY_DATA_SPACE: usize =
    // time_buffer
    8 +
    // min_bid_percentage_increase
    8 +
    // min_reserve_price
    8 +
    // duration
    8;

pub const AUCTION_FACTORY_ACCOUNT_SPACE: usize =
    // discriminator
    8 +
    // bump
    1 +
    // seed string of len 10
    4 + 10 +
    // sequence
    8 +
    // authority
    32 +
    // is_active
    1 +
    // auction factory data
    AUCTION_FACTORY_DATA_SPACE +
    // initialized_at
    8 +
    // active_since
    8 +
    // treasury
    32;
