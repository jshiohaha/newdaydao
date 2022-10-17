use crate::state::bid::Bid;

use {
    crate::{
        constant::AUCTION_FACTORY_SEED_LEN,
        error::ErrorCode,
        state::auction::Auction,
        state::auction_factory::AuctionFactory,
        util::general::{
            assert_initialized, assert_owned_by, get_auction_account_address, get_current_timestamp,
        },
        SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    },
    anchor_lang::prelude::*,
    std::str::FromStr,
};

pub fn verify_auction_address_for_factory(
    sequence: u64,
    auction_factory: Pubkey,
    current_auction: Pubkey,
) -> Result<()> {
    // grab the derived current auction address and verify it matches the supplied address
    let (current_auction_address, _bump) = get_auction_account_address(sequence, auction_factory);

    if current_auction != current_auction_address {
        return Err(ErrorCode::AuctionAddressMismatch.into());
    }

    Ok(())
}

pub fn verify_auction_has_resource(auction: &Account<Auction>) -> Result<()> {
    match auction.resource {
        None => {
            return Err(ErrorCode::AuctionHasNoResourceAvailable.into());
        }
        Some(_) => Ok(()),
    }
}

pub fn verify_current_auction_is_over(auction: &Account<Auction>) -> Result<()> {
    let current_timestamp: u64 = get_current_timestamp().unwrap();

    // if not settled, auction is live. must be settled before creating a new auction.
    if !auction.settled || current_timestamp < auction.end_time {
        return Err(ErrorCode::UnsettledAuction.into());
    }

    Ok(())
}

pub fn verify_auction_can_be_settled(auction: &Account<Auction>) -> Result<()> {
    if auction.settled {
        return Err(ErrorCode::AuctionAlreadySettled.into());
    }

    let current_timestamp: u64 = get_current_timestamp().unwrap();

    if current_timestamp < auction.end_time {
        return Err(ErrorCode::AuctionIsLive.into());
    }

    Ok(())
}

pub fn verify_auction_resource_dne(auction: &Account<Auction>) -> Result<()> {
    match auction.resource {
        None => Ok(()),
        Some(_) => {
            return Err(ErrorCode::AuctionResourceAlreadyExists.into());
        }
    }
}

pub fn verify_treasury(auction_factory: &Account<AuctionFactory>, treasury: Pubkey) -> Result<()> {
    if auction_factory.treasury != treasury {
        return Err(ErrorCode::TreasuryMismatch.into());
    }

    Ok(())
}

pub fn verify_auction_factory_for_first_auction(
    auction_factory: &Account<AuctionFactory>,
) -> Result<()> {
    if auction_factory.sequence > 0 {
        return Err(ErrorCode::AuctionsAlreadyInitialized.into());
    }

    Ok(())
}

// restrict who can modify the auction factory
pub fn verify_auction_factory_is_active(auction_factory: &Account<AuctionFactory>) -> Result<()> {
    if !auction_factory.is_active {
        return Err(ErrorCode::InactiveAuctionFactory.into());
    }

    Ok(())
}

pub fn verify_auction_factory_authority(
    auction_factory_authority: Pubkey,
    signer: Pubkey,
) -> Result<()> {
    if auction_factory_authority != signer {
        return Err(ErrorCode::NotAuthorized.into());
    }

    Ok(())
}

pub fn verify_bid_amount(
    new: u64,
    original: u64,
    min_increase_percentage: u64,
    min_reserve_price: u64,
) -> Result<()> {
    // immediately reject bids lower than min reserve price, or equal to 0
    if new < min_reserve_price || new == 0 {
        return Err(ErrorCode::InvalidBidAmount.into());
    }

    let mut minimum_bid = original
        .checked_add(
            original
                .checked_mul(min_increase_percentage)
                .ok_or(ErrorCode::NumericalOverflowError)?
                .checked_div(100)
                .ok_or(ErrorCode::NumericalDivisionError)?,
        )
        .ok_or(ErrorCode::NumericalOverflowError)?;

    // if bid amount is small enough, it's that min increase is going to be 0
    // and thus, original = minimum bid. in this case, set minimum bid to at
    // least 1 unit more than current bid.
    if minimum_bid == original {
        minimum_bid = original
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;
    }

    if new < minimum_bid {
        return Err(ErrorCode::InvalidBidAmount.into());
    }

    Ok(())
}

pub fn derive_bid_address(bid_idx: u64, auction: &Pubkey, bump: u8) -> (Pubkey, u8) {
    let bid_idx_str = bid_idx.to_string();
    let seeds = &[auction.as_ref(), bid_idx_str.as_bytes(), &[bump]];
    return Pubkey::find_program_address(seeds, &crate::id());
}

pub fn verify_bid_account(
    bid_account: &AccountInfo,
    bid_idx: u64,
    auction: &Pubkey,
    bump: u8,
) -> Result<()> {
    // verify address
    let (derived_address, derived_bump) = derive_bid_address(bid_idx, &auction, bump);
    if derived_address != *bid_account.key || derived_bump != bump {
        return Err(ErrorCode::InvalidBidAccount.into());
    }

    // verify owner
    if bid_account.owner != &crate::id() {
        return Err(ErrorCode::InvalidBidAccount.into());
    }

    Ok(())
}

// 2 possible states with 1 common constraint (cc)
//  1. no bids have been placed yet
//  2. a bid has been placed, but not yet accepted
//
// cc: bid accounts must be owned by the current program
pub fn verify_bid_accounts(
    current_bid: &AccountInfo,
    current_bid_bump: u8,
    next_bid: &AccountInfo,
    next_bid_bump: u8,
    auction: &Account<Auction>,
) -> Result<()> {
    let auction_key = &auction.key();
    if auction.num_bids == 0 {
        // note: no bids, ignore current_bid
        msg!("no bids yet");
        verify_bid_account(next_bid, 0, auction_key, next_bid_bump)?;
    } else {
        msg!("num bids: {}", auction.num_bids);

        verify_bid_account(current_bid, auction.num_bids, auction_key, current_bid_bump)?;
        verify_bid_account(next_bid, auction.num_bids + 1, auction_key, next_bid_bump)?;
    }

    Ok(())
}

pub fn verify_bidder_has_sufficient_account_balance(
    bidder: AccountInfo,
    amount: u64,
) -> Result<()> {
    if bidder.lamports() < amount {
        return Err(ErrorCode::InsufficientAccountBalance.into());
    }

    Ok(())
}

// looks at both the amount and auction state
pub fn verify_bid_for_auction(
    auction_factory: &Account<AuctionFactory>,
    auction: &Account<Auction>,
    bid: &Bid,
    amount: u64,
) -> Result<()> {
    let current_timestamp: u64 = get_current_timestamp().unwrap();

    let auction_has_not_started = current_timestamp < auction.start_time;
    let auction_past_end_time = current_timestamp > auction.end_time;

    if auction.settled || auction_has_not_started || auction_past_end_time {
        return Err(ErrorCode::InactiveAuction.into());
    }

    verify_bid_amount(
        amount,
        bid.amount, // todo: is this right?
        auction_factory.data.min_bid_percentage_increase,
        auction_factory.data.min_reserve_price,
    )?;

    Ok(())
}

pub fn verify_bidder_not_already_winning(winning_bidder: Pubkey, new_bidder: Pubkey) -> Result<()> {
    if winning_bidder == new_bidder {
        return Err(ErrorCode::BidderAlreadyWinning.into());
    }

    Ok(())
}

pub fn get_token_mint_account(owner: Pubkey, mint: Pubkey, bump: u8) -> Pubkey {
    let associated_token_program_id =
        Pubkey::from_str(SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID).unwrap();
    let spl_token_address = spl_token::id();

    let seeds = &[
        owner.as_ref(),
        spl_token_address.as_ref(),
        mint.as_ref(),
        &[bump],
    ];

    return Pubkey::create_program_address(seeds, &associated_token_program_id).unwrap();
}

// assert that bidder token account
// > is initialized
// > is owned by the spl_token program
// > mint matches the auction's resource
// > address matches the expected address
pub fn verify_bidder_token_account(
    bidder_token_account: AccountInfo,
    auction: &Account<Auction>,
    bid: &Bid,
    token_account_bump: u8,
) -> Result<()> {
    let spl_token_address: Pubkey = spl_token::id();

    assert_owned_by(&bidder_token_account, &spl_token_address)?;

    let token_account: spl_token::state::Account = assert_initialized(&bidder_token_account)?;
    if let Some(auction_resource) = auction.resource {
        if token_account.mint != auction_resource {
            return Err(ErrorCode::MintMismatch.into());
        }

        // todo: is bid.bidder right?
        let computed_token_account_pubkey =
            get_token_mint_account(bid.bidder, auction_resource, token_account_bump);

        if bidder_token_account.key() != computed_token_account_pubkey {
            return Err(ErrorCode::TokenAccountNotOwnedByWinningBidder.into());
        }
    }

    Ok(())
}

pub fn verify_auction_factory_seed(seed: &str) -> Result<()> {
    if seed.len() != AUCTION_FACTORY_SEED_LEN {
        return Err(ErrorCode::AuctionFactoryUuidInvalidLengthError.into());
    }

    Ok(())
}
