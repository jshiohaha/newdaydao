use anchor_lang::prelude::*;
use std::str::FromStr;

use crate::{
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    error::ErrorCode,
    structs::auction::Auction,
    structs::auction_factory::AuctionFactory,
    util::{
        assert_initialized, assert_owned_by, get_auction_account_address, get_current_timestamp,
    }
};

pub fn verify_auction_address_for_factory(
    sequence: u64,
    auction_factory: Pubkey,
    current_auction: Pubkey,
) -> ProgramResult {
    // grab the derived current auction address and verify it matches the supplied address
    let (current_auction_address, _bump) = get_auction_account_address(sequence, auction_factory);

    // TODO: use create public key from seed. should be cheaper.
    if current_auction != current_auction_address {
        return Err(ErrorCode::AuctionAddressMismatch.into());
    }

    Ok(())
}

pub fn verify_auction_has_resource(auction: &Account<Auction>) -> ProgramResult {
    match auction.resource {
        None => {
            return Err(ErrorCode::AuctionHasNoResourceAvailable.into());
        }
        Some(_) => Ok(())
    }
}

pub fn verify_current_auction_is_over(auction: &Account<Auction>) -> ProgramResult {
    let current_timestamp: u64 = get_current_timestamp().unwrap();

    // if not settled, auction is live. must be settled before creating a new auction.
    if !auction.settled || current_timestamp < auction.end_time {
        return Err(ErrorCode::UnsettledAuction.into());
    }

    Ok(())
}

pub fn verify_auction_can_be_settled(auction: &Account<Auction>) -> ProgramResult {
    if auction.settled {
        return Err(ErrorCode::AuctionAlreadySettled.into());
    }

    let current_timestamp: u64 = get_current_timestamp().unwrap();

    if current_timestamp < auction.end_time {
        return Err(ErrorCode::AuctionIsLive.into());
    }

    Ok(())
}

pub fn verify_auction_resource_dne(auction: &Account<Auction>) -> ProgramResult {
    match auction.resource {
        None => Ok(()),
        Some(_) => {
            return Err(ErrorCode::AuctionResourceAlreadyExists.into());
        }
    }
}

pub fn verify_treasury(
    auction_factory: &Account<AuctionFactory>,
    treasury: Pubkey,
) -> ProgramResult {
    if auction_factory.treasury != treasury {
        return Err(ErrorCode::TreasuryMismatch.into());
    }

    Ok(())
}

pub fn verify_auction_factory_for_first_auction(
    auction_factory: &Account<AuctionFactory>,
) -> ProgramResult {
    if auction_factory.sequence > 0 {
        return Err(ErrorCode::AuctionsAlreadyInitialized.into());
    }

    Ok(())
}

// restrict who can modify the auction factory
pub fn verify_auction_factory_is_active(
    auction_factory: &Account<AuctionFactory>,
) -> ProgramResult {
    if !auction_factory.is_active {
        return Err(ErrorCode::InactiveAuctionFactory.into());
    }

    Ok(())
}

pub fn verify_auction_factory_authority(
    auction_factory_authority: Pubkey,
    signer: Pubkey,
) -> ProgramResult {
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
) -> ProgramResult {
    // immediately reject bids lower than min reserve price
    if new <= min_reserve_price {
        return Err(ErrorCode::InvalidBidAmount.into());
    }

    let minimum_bid = original
        .checked_add(
            original
                .checked_mul(min_increase_percentage)
                .unwrap()
                .checked_div(100)
                .unwrap(),
        )
        .unwrap();

    if new < minimum_bid {
        return Err(ErrorCode::InvalidBidAmount.into());
    }

    Ok(())
}

pub fn verify_bidder_has_sufficient_account_balance(
    bidder: AccountInfo,
    amount: u64,
) -> ProgramResult {
    if bidder.lamports() < amount {
        return Err(ErrorCode::NotEnoughSOL.into());
    }

    Ok(())
}

// looks at both the amount and auction state
pub fn verify_bid_for_auction(
    auction_factory: &Account<AuctionFactory>,
    auction: &Account<Auction>,
    amount: u64,
) -> ProgramResult {
    let current_timestamp: u64 = get_current_timestamp().unwrap();

    let auction_has_not_started = current_timestamp < auction.start_time;
    let auction_past_end_time = current_timestamp > auction.end_time;

    if auction.settled || auction_has_not_started || auction_past_end_time {
        return Err(ErrorCode::InactiveAuction.into());
    }

    verify_bid_amount(
        amount,
        auction.amount,
        auction_factory.data.min_bid_percentage_increase,
        auction_factory.data.min_reserve_price,
    )?;

    Ok(())
}

pub fn verify_bidder_not_already_winning(
    winning_bidder: Pubkey,
    new_bidder: Pubkey,
) -> ProgramResult {
    if winning_bidder == new_bidder {
        return Err(ErrorCode::BidderAlreadyWinning.into());
    }

    Ok(())
}

pub fn get_token_mint_account(
    owner: Pubkey,
    mint: Pubkey,
    bump: u8,
) -> Pubkey {
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
    token_account_bump: u8,
) -> ProgramResult {
    let spl_token_address: Pubkey = spl_token::id();

    assert_owned_by(&bidder_token_account, &spl_token_address)?;

    let token_account: spl_token::state::Account = assert_initialized(&bidder_token_account)?;
    if let Some(auction_resource) = auction.resource {
        if token_account.mint != auction_resource {
            return Err(ErrorCode::MintMismatch.into());
        }

        let computed_token_account_pubkey = get_token_mint_account(
            auction.bidder,
            auction_resource,
            token_account_bump
        );

        if bidder_token_account.key() != computed_token_account_pubkey {
            return Err(ErrorCode::TokenAccountNotOwnedByWinningBidder.into());
        }
    }

    Ok(())
}
