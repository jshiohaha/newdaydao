use {
    crate::{constant::MAX_URI_LENGTH, error::ErrorCode},
    solana_program::msg,
    std::convert::TryInto,
};

pub fn get_valid_element(
    idx: usize,
    config_data: &Vec<String>,
) -> std::result::Result<String, ErrorCode> {
    let element: &str = config_data.get(idx).unwrap();

    if element.len() == 0 {
        return Err(ErrorCode::ConfigElementTooShortError.into());
    }

    if element.len() > MAX_URI_LENGTH {
        return Err(ErrorCode::ConfigElementTooLongError.into());
    }

    Ok(element.to_string())
}

pub fn add_to_circular_buffer(
    seq: usize,
    buffer: &mut Vec<String>,
    max_buffer_len: usize,
    config_data: &Vec<String>,
    last_updated_idx: &mut usize,
    is_updated: bool,
) -> std::result::Result<bool, ErrorCode> {
    let mut wrote_data = false;
    let mut config_idx = 0;
    let mut continue_loop_iter = true;
    while continue_loop_iter {
        let bounds = get_bounds(
            seq,
            *last_updated_idx,
            buffer.len(),
            max_buffer_len,
            is_updated,
        )?;

        let bound_diff = bounds
            .upper
            .checked_sub(bounds.lower)
            .ok_or(ErrorCode::NumericalUnderflowError)?;

        wrote_data |= bound_diff > 0;

        msg!("max supply: {}, seq: {}, lower bound = {}, upper bound = {}, last_updated_idx: {}, bounds_diff: {}, can_wrap: {}",
            max_buffer_len,
            seq,
            bounds.lower,
            bounds.upper,
            *last_updated_idx,
            bound_diff,
            bounds.can_wrap
        );

        let should_append = bounds.append;
        for idx in bounds.lower..bounds.upper {
            // exceeded config buffer. exit all loops.
            if config_idx >= config_data.len() {
                continue_loop_iter = false;
                break;
            }

            let element = get_valid_element(config_idx, &config_data)?;

            if should_append {
                buffer.push(element);
            } else {
                let _ = std::mem::replace(&mut buffer[idx], element);
            }

            config_idx += 1;
            *last_updated_idx = last_updated_idx
                .checked_add(1)
                .ok_or(ErrorCode::NumericalUnderflowError)?
                .checked_rem(max_buffer_len)
                .ok_or(ErrorCode::NumericalUnderflowError)?;
        }

        continue_loop_iter &= bounds.can_wrap;
    }

    if config_idx < config_data.len() {
        msg!(
            "Ignoring new config data from idx [{}..{}]",
            config_idx,
            config_data.len()
        );
    }

    // self.update_idx = last_updated_idx.try_into().unwrap();
    msg!(
        "end update config info: max supply: {}, items in config vec: {}, last_updated_idx: {}",
        max_buffer_len,
        buffer.len(),
        *last_updated_idx
    );

    Ok(wrote_data)
}

pub fn get_item(
    buffer: &Vec<String>,
    max_supply: usize,
    sequence: usize,
    update_idx: usize,
    is_updated: bool,
) -> Result<String, ErrorCode> {
    // with this, index should never exceed max arr size for idx out of bounds err.
    let idx = sequence
        .checked_rem(max_supply)
        .ok_or(ErrorCode::CheckedRemError)?;
    // uri vec isn't full yet. check that we have enough uri's to get a new uri.
    if buffer.len() < max_supply {
        if idx >= buffer.len() {
            return Err(ErrorCode::InsufficientConfigError.into());
        }
    } else {
        // edge case is first auction when buffer is full (aka update_idx == 0)
        if sequence != 0 {
            // no matter what the leading pointer is, we never want to the idx
            // (adjusted seq) to exceed the update_idx adjusted for 0 indexed offset.
            // let adj_update_idx = if update_idx == 0 { 0 } else { update_idx - 1 };
            if idx == update_idx.try_into().unwrap() && !is_updated {
                msg!("update_idx == idx");
                return Err(ErrorCode::InsufficientConfigError.into());
            }
        }
    }

    Ok(buffer[idx].to_string())
}

// private structs & fns
struct Bounds {
    lower: usize,
    upper: usize,
    can_wrap: bool,
    append: bool,
}

fn get_bounds(
    seq: usize,
    last_updated_idx: usize,
    buffer_len: usize,
    max_buffer_len: usize,
    is_updated: bool,
) -> std::result::Result<Bounds, ErrorCode> {
    // make sure we fill buffer first
    if buffer_len < max_buffer_len {
        return Ok(Bounds {
            lower: buffer_len,
            upper: max_buffer_len,
            can_wrap: true,
            append: true,
        });
    }

    let adj_update_idx = last_updated_idx
        .checked_rem(max_buffer_len)
        .ok_or(ErrorCode::CheckedRemError)?;
    let adj_sequence = seq
        .checked_rem(max_buffer_len)
        .ok_or(ErrorCode::CheckedRemError)?;

    // aka we have already looped through buffer before. fill to end of buffer.
    if adj_update_idx == adj_sequence && !is_updated {
        return Ok(Bounds {
            lower: adj_update_idx,
            upper: max_buffer_len,
            can_wrap: true,
            append: false,
        });
    } else if adj_update_idx < adj_sequence {
        return Ok(Bounds {
            lower: adj_update_idx,
            upper: adj_sequence,
            can_wrap: false,
            append: false,
        });
    }

    // else
    return Ok(Bounds {
        lower: adj_sequence,
        upper: adj_update_idx,
        can_wrap: adj_sequence != adj_update_idx,
        append: false,
    });
}
