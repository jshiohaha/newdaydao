use {
    crate::error::ErrorCode,
    anchor_lang::{prelude::*, solana_program},
    solana_program::program::{invoke, invoke_signed},
    spl_token::instruction::transfer,
};

pub use spl_token::ID;

#[derive(Accounts)]
pub struct TransferLamports<'info> {
    /// CHECK: verified via cpi in the token program
    pub from: AccountInfo<'info>,
    /// CHECK: verified via cpi in the token program
    pub to: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub struct TokenTransferParams<'a: 'b, 'b> {
    /// CHECK: metadata accounts are verified via cpi in the token program
    /// source
    pub source: AccountInfo<'a>,
    /// CHECK: metadata accounts are verified via cpi in the token program
    /// destination
    pub destination: AccountInfo<'a>,
    /// amount
    pub amount: u64,
    /// CHECK: metadata accounts are verified via cpi in the token program
    /// authority
    pub authority: AccountInfo<'a>,
    /// authority_signer_seeds
    pub authority_signer_seeds: &'b [&'b [u8]],
    /// CHECK: metadata accounts are verified via cpi in the token program
    /// token_program
    pub token_program: AccountInfo<'a>,
}

pub fn transfer_from_signer<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, TransferLamports<'info>>,
    amount: u64,
) -> Result<()> {
    invoke(
        &solana_program::system_instruction::transfer(
            ctx.accounts.from.key,
            ctx.accounts.to.key,
            amount,
        ),
        &[
            ctx.accounts.from,
            ctx.accounts.to,
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    Ok(())
}

pub fn spl_token_transfer(params: TokenTransferParams<'_, '_>) -> Result<()> {
    let TokenTransferParams {
        source,
        destination,
        authority,
        token_program,
        amount,
        authority_signer_seeds,
    } = params;

    let result = invoke_signed(
        &transfer(
            token_program.key,
            source.key,
            destination.key,
            authority.key,
            &[],
            amount,
        )?,
        &[source, destination, authority, token_program],
        &[authority_signer_seeds],
    );

    result.map_err(|_| ErrorCode::TokenTransferFailed.into())
}

pub fn transfer_lamports(
    source: &AccountInfo<'_>,
    dest: &AccountInfo<'_>,
    amount: u64,
) -> Result<()> {
    let amount_after_deduction: u64 = source
        .lamports()
        .checked_sub(amount)
        .ok_or(ErrorCode::InsufficientAccountBalance)?;

    // sub from source
    **source.lamports.borrow_mut() = amount_after_deduction;

    // add lamports to dest
    **dest.lamports.borrow_mut() = dest
        .lamports()
        .checked_add(amount)
        .ok_or(ErrorCode::NumericalOverflowError)?;

    Ok(())
}
