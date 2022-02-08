use {
    crate::{
        constant::{AUX_FAX_PROGRAM_ID, AUX_SEED},
        error::ErrorCode,
    },
    anchor_lang::prelude::*,
    solana_program::{
        account_info::AccountInfo,
        clock,
        program_error::ProgramError,
        program_pack::{IsInitialized, Pack},
        pubkey::Pubkey,
    },
    std::convert::TryInto,
    std::str::FromStr,
};

pub fn get_auction_account_address(sequence: u64, auction_factory: Pubkey) -> (Pubkey, u8) {
    let seq_seed = sequence.to_string();
    let seeds = &[
        AUX_SEED.as_bytes(),
        auction_factory.as_ref(),
        seq_seed.as_bytes(),
    ];
    let program_id: Pubkey = Pubkey::from_str(AUX_FAX_PROGRAM_ID).unwrap();
    return Pubkey::find_program_address(seeds, &program_id);
}

pub fn get_current_timestamp() -> Result<u64, ProgramError> {
    //i64 -> u64 ok to unwrap
    Ok(clock::Clock::get()?.unix_timestamp.try_into().unwrap())
}

pub fn get_lamports_for_rent(account: &AccountInfo<'_>) -> Result<u64, ProgramError> {
    Ok(Rent::get()?.minimum_balance(account.data_len()))
}

pub fn get_available_lamports(account: &AccountInfo<'_>) -> Result<u64, ProgramError> {
    let rent_lamports = get_lamports_for_rent(account)?;
    let non_rent_lamports = account
        .lamports()
        .checked_sub(rent_lamports)
        .ok_or(ErrorCode::NumericalUnderflowError)?;

    Ok(non_rent_lamports)
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
