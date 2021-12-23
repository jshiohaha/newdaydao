use {
    anchor_lang::prelude::*,
    crate::{AUX_FAX_PROGRAM_ID, AUX_SEED},
    solana_program::{
        account_info::AccountInfo,
        msg,
        program::{invoke, invoke_signed},
        program_error::ProgramError,
        pubkey::Pubkey,
        system_instruction,
        sysvar::{rent::Rent},
    },
    std::convert::TryFrom,
    std::convert::TryInto,
    std::str::FromStr,
};

#[inline(always)]
pub fn create_or_allocate_account_raw<'a>(
    program_id: Pubkey,
    new_account_info: &AccountInfo<'a>,
    rent_sysvar_info: &AccountInfo<'a>,
    system_program_info: &AccountInfo<'a>,
    payer_info: &AccountInfo<'a>,
    size: usize,
    signer_seeds: &[&[u8]],
) -> Result<(), ProgramError> {
    let rent = &Rent::from_account_info(rent_sysvar_info)?;
    let required_lamports = rent
        .minimum_balance(size)
        .max(1)
        .saturating_sub(new_account_info.lamports());

    if required_lamports > 0 {
        msg!("Transfer {} lamports to the new account", required_lamports);
        invoke(
            &system_instruction::transfer(&payer_info.key, new_account_info.key, required_lamports),
            &[
                payer_info.clone(),
                new_account_info.clone(),
                system_program_info.clone(),
            ],
        )?;
    }

    msg!("Allocate space for the account");
    invoke_signed(
        &system_instruction::allocate(new_account_info.key, size.try_into().unwrap()),
        &[new_account_info.clone(), system_program_info.clone()],
        &[&signer_seeds],
    )?;

    msg!("Assign the account to the owning program");
    invoke_signed(
        &system_instruction::assign(new_account_info.key, &program_id),
        &[new_account_info.clone(), system_program_info.clone()],
        &[&signer_seeds],
    )?;
    msg!("Completed assignation!");

    Ok(())
}

#[inline(always)]
pub fn get_auction_account_address(
    sequence: u64,
    auction_factory: Pubkey,
    // program_id: Pubkey
) -> (Pubkey, u8) {
    let seq_seed = sequence.to_string();
    let seeds = &[AUX_SEED.as_ref(), auction_factory.as_ref(), seq_seed.as_ref()];

    let program_id: Pubkey = Pubkey::from_str(AUX_FAX_PROGRAM_ID).unwrap();
    return Pubkey::find_program_address(seeds, &program_id);
}

#[inline(always)]
pub fn get_current_timestamp() -> Result<u64, ProgramError> {
    let clock = Clock::get()?;
    return Ok(u64::try_from(clock.unix_timestamp).unwrap());
}
