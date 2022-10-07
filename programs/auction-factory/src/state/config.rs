use {
    crate::{
        error::ErrorCode,
        util::buffer::{add_to_circular_buffer, get_item},
    },
    anchor_lang::prelude::*,
    std::convert::TryInto,
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
///     - in the case that we wrap in the buffer, i.e. reach the end and start at the beginning
///       again, we update the is_updated boolean to true. this tells the read item from buffer
///       operation that it's ok to read an item even when seq = update_idx.
/// 2. get item from the buffer
///     - simply get the buffer element at the specified index. there are two cases we
///       should consider:
///         1. buffer is not full. verify that index < buffer len so that we don't
///            read beyond the buffer.
///         2. buffer is full. due to circular nature of buffer, there is a chance we
///            will read config that has already been used. to mitigate this chance, we
///            will assume all inidices are valid except when we sequence tries to cross
///            update_idx. we will just focus on the cross over point and ignore everything
///            else. however, there is an also an issue with this approach. it's possible that
///            seq == update_idx, and then all elements in the buffer are updated. in this case,
///            the logic described above will not work. so, we fall back on the is_updated boolean
///            to know whether or not we can read unused elements the buffer.
///     - whenever we reach the end of the buffer and wrap, we set is_udpated to false.

#[account]
#[derive(Default)]
pub struct Config {
    pub bump: u8,
    pub seed: String,
    pub max_supply: u32,
    pub update_idx: u32,
    pub is_updated: bool,
    pub buffer: Vec<String>,
}

impl Config {
    pub fn init(&mut self, bump: u8, max_supply: u32, seed: String) {
        self.bump = bump;
        self.seed = seed;
        self.max_supply = max_supply;
        // idx to update next
        self.update_idx = 0;
        self.is_updated = false;
        self.buffer = Vec::new();
    }

    pub fn get_item(&mut self, sequence: usize) -> Result<String> {
        let max_supply: usize = self.max_supply as usize;
        let update_idx: usize = self.update_idx as usize;

        let adj_sequence = sequence
            .checked_sub(1) // auction/auction factory is not 0 idx based
            .ok_or(ErrorCode::NumericalUnderflowError)?
            .checked_rem(max_supply)
            .ok_or(ErrorCode::CheckedRemError)?;

        // eagerly update is_updated value so that we don't read from stale config,
        // THEN update boolean. if we wait to perform after get_item, it's possible that
        //  - adj_sequence == 0, so we try to read from 0th idx of buffer,
        //  - we see is_updated is true,
        //  - proceed to get element at 0th idx,
        //  - then, set is_updated = false.
        // however, this is problematic because that 0th idx config could have
        // already been used.
        if adj_sequence == 0 {
            self.is_updated = false;
        }

        let item = get_item(
            &self.buffer,
            max_supply,
            adj_sequence,
            update_idx,
            self.is_updated,
        )?;

        Ok(item)
    }

    pub fn add_data(&mut self, seq: usize, config_data: Vec<String>) -> Result<()> {
        let last_updated_idx_before_write: usize = self.update_idx as usize;
        let mut last_updated_idx: usize = self.update_idx as usize;
        let max_supply = self.max_supply as usize;

        let buffer_updated = add_to_circular_buffer(
            seq,
            &mut self.buffer,
            max_supply,
            &config_data,
            &mut last_updated_idx,
            self.is_updated,
        )?;

        self.update_idx = last_updated_idx.try_into().unwrap();

        // did we wrap buffer?
        if last_updated_idx <= last_updated_idx_before_write && buffer_updated {
            self.is_updated = true;
        }

        Ok(())
    }
}
