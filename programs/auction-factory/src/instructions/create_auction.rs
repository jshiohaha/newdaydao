use {
    crate::{
        structs::auction::Auction, structs::auction_factory::AuctionFactory,
        util::general::get_current_timestamp,
    },
    anchor_lang::prelude::*,
};

pub fn handle(
    bump: u8,
    auction: &mut Auction,
    auction_factory: &mut AuctionFactory,
) -> ProgramResult {
    let current_timestamp = get_current_timestamp().unwrap();

    // don't move: keeps auction factory sequence === auction sequence
    auction_factory.increment_sequence();

    auction.init(
        bump,
        auction_factory.sequence,
        auction_factory.authority.key(),
        current_timestamp,
        auction_factory.data,
    );

    Ok(())
}
