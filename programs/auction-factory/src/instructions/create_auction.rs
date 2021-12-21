use anchor_lang::prelude::*;
use std::convert::TryFrom;

use crate::structs::auction::Auction;
use crate::structs::auction_factory::AuctionFactory;

pub fn create(
    bump: u8,
    auction: &mut Auction,
    auction_factory: &mut AuctionFactory,
) -> ProgramResult {
    let clock = Clock::get()?;
    let current_timestamp = u64::try_from(clock.unix_timestamp).unwrap();

    auction.init(
        bump,
        auction_factory.sequence,
        auction_factory.authority.key(),
        current_timestamp,
        auction_factory.data,
    );

    auction_factory.increment_sequence();

    Ok(())
}
