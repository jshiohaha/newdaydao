use {
    anchor_lang::prelude::*,
    solana_program::{
        account_info::AccountInfo,
        program_error::ProgramError,
        program_pack::{IsInitialized, Pack},
        pubkey::Pubkey,
    },
    std::convert::TryFrom,
    std::str::FromStr,
};

use crate::constant::{AUX_FAX_PROGRAM_ID, AUX_SEED};
use crate::error::ErrorCode;

pub fn get_auction_account_address(
    sequence: u64,
    auction_factory: Pubkey,
) -> (Pubkey, u8) {
    let seq_seed = sequence.to_string();
    let seeds = &[
        AUX_SEED.as_bytes(),
        auction_factory.as_ref(),
        seq_seed.as_bytes()
    ];
    let program_id: Pubkey = Pubkey::from_str(AUX_FAX_PROGRAM_ID).unwrap();
    return Pubkey::find_program_address(seeds, &program_id);
}

pub fn get_current_timestamp() -> Result<u64, ProgramError> {
    let clock = Clock::get()?;
    return Ok(u64::try_from(clock.unix_timestamp).unwrap());
}

pub fn assert_initialized<T: Pack + IsInitialized>(
    account_info: &AccountInfo,
) -> Result<T, ProgramError> {
    let account: T = T::unpack_unchecked(&account_info.data.borrow())?;
    if !account.is_initialized() {
        Err(ErrorCode::Uninitialized.into())
    } else {
        Ok(account)
    }
}

pub fn assert_owned_by(account: &AccountInfo, owner: &Pubkey) -> ProgramResult {
    if account.owner != owner {
        Err(ErrorCode::IncorrectOwner.into())
    } else {
        Ok(())
    }
}