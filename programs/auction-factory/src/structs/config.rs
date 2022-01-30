use {anchor_lang::prelude::*, std::convert::TryInto};

use crate::{
    error::ErrorCode,
    util::buffer::{add_to_circular_buffer, get_item},
};

/// Config manages NFT metadata via a circular buffer and a few pointers.
/// There are 2 operations one can perform on this buffer:
///
/// 1. add element(s) to the buffer
///     - add items to buffer until buffer size == max_supply, then
///     - add items to buffer between update_idx and sequence (from auction factory).
///       update_idx represents the last updated index in the buffer + 1 (since
///       buffers are zero-indexed) because we don't want to update buffer with more
///       elements than needed. sequence is the upper bound idx to which we will write
///       items in the buffer.
/// 2. get item from the buffer
///     - simply get the buffer element at the specified index. there are two cases we
///       should consider:
///         1. buffer is not full. verify that index < buffer len so that we don't
///            read beyond the buffer.
///         2. buffer is full. due to circular nature of buffer, there is a chance we
///            will read config that has already been used. to mitigate this chance, we
///            will assume all inidices are valid except when we sequence tries to cross
///            update_idx. we will just focus on the cross over point and ignore everything
///            else.

#[account]
#[derive(Default)]
pub struct Config {
    pub bump: u8,
    pub max_supply: u32,
    pub update_idx: u32,
    pub buffer: Vec<String>,
}

impl Config {
    pub fn init(&mut self, bump: u8, max_supply: u32) {
        self.bump = bump;

        self.max_supply = max_supply;
        // idx to update next
        self.update_idx = 0;
        self.buffer = Vec::new();
    }

    pub fn get_item(&mut self, sequence: usize) -> Result<String, ErrorCode> {
        let max_supply: usize = self.max_supply as usize;
        let update_idx: usize = self.update_idx as usize;

        let item = get_item(&self.buffer, max_supply, sequence, update_idx)?;

        Ok(item)
    }

    pub fn add_data(
        &mut self,
        seq: usize,
        config_data: Vec<String>,
    ) -> ProgramResult {
        let mut last_updated_idx: usize = self.update_idx as usize;

        add_to_circular_buffer(
            seq,
            &mut self.buffer,
            self.max_supply as usize,
            &config_data,
            &mut last_updated_idx,
        )?;

        self.update_idx = last_updated_idx.try_into().unwrap();

        Ok(())
    }
}
