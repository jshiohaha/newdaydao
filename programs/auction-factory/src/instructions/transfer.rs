use {
    anchor_lang::{prelude::*, solana_program},
    solana_program::program::{invoke_signed, invoke},
    spl_token::instruction::transfer
};
pub use spl_token::ID;

// local imports
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct TransferLamports<'info> {
    pub from: AccountInfo<'info>,
    pub to: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub struct TokenTransferParams<'a: 'b, 'b> {
    /// source
    pub source: AccountInfo<'a>,
    /// destination
    pub destination: AccountInfo<'a>,
    /// amount
    pub amount: u64,
    /// authority
    pub authority: AccountInfo<'a>,
    /// authority_signer_seeds
    pub authority_signer_seeds: &'b [&'b [u8]],
    /// token_program
    pub token_program: AccountInfo<'a>,
}

pub fn transfer_from_signer<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, TransferLamports<'info>>,
    amount: u64,
) -> ProgramResult {
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

pub fn spl_token_transfer(params: TokenTransferParams<'_, '_>) -> ProgramResult {
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
