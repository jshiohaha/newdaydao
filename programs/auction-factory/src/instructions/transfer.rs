use anchor_lang::{prelude::*, solana_program};
// crate::utils::{assert_initialized, assert_owned_by, spl_token_transfer, TokenTransferParams},
use crate::error::ErrorCode;

// https://stackoverflow.com/questions/68841171/how-to-sign-token-transaction-in-serum-anchor
#[derive(Accounts)]
pub struct TransferLamports<'info> {
    // #[account(mut)]
    pub from: AccountInfo<'info>,
    // #[account(mut)]
    pub to: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferTokens<'info> {
    pub from: AccountInfo<'info>,
    pub to: AccountInfo<'info>,
    pub authority: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub fn transfer_from_signer<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, TransferLamports<'info>>,
    amount: u64,
) -> ProgramResult {
    solana_program::program::invoke(
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

pub fn transfer_from_pda<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, TransferLamports<'info>>,
    amount: u64,
) -> ProgramResult {
    solana_program::program::invoke_signed(
        &solana_program::system_instruction::transfer(
            ctx.accounts.from.key,
            ctx.accounts.to.key,
            amount,
        ),
        &[
            ctx.accounts.from.to_account_info(),
            ctx.accounts.to.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        ctx.signer_seeds,
    )?;

    Ok(())
}

pub fn transfer_spl_token_from_pda<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, TransferTokens<'info>>,
    amount: u64,
) -> ProgramResult {
    // https://github.com/metaplex-foundation/metaplex/blob/master/rust/nft-candy-machine/src/lib.rs#L57

    // signer is passed in when we generate context
    let result = solana_program::program::invoke_signed(
        &spl_token::instruction::transfer(
            ctx.accounts.token_program.key,
            ctx.accounts.from.key,
            ctx.accounts.to.key,
            ctx.accounts.authority.key,
            &[],
            amount,
        )?,
        &[
            ctx.accounts.from.to_account_info(),
            ctx.accounts.to.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.token_program.to_account_info()
        ],
        ctx.signer_seeds
    );

    result.map_err(|_| ErrorCode::TokenTransferFailed.into())
}
