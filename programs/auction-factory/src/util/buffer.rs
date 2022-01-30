use {anchor_lang::prelude::*, solana_program::msg, std::convert::TryInto};

use crate::{constant::MAX_URI_LENGTH, error::ErrorCode};

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
) -> ProgramResult {
    let mut config_idx = 0;
    let mut continue_loop_iter = true;
    while continue_loop_iter {
        let bounds = get_bounds(seq, *last_updated_idx, buffer.len(), max_buffer_len)?;

        let bound_diff = bounds
            .upper
            .checked_sub(bounds.lower)
            .ok_or(ErrorCode::NumericalUnderflowError)?;

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

    Ok(())
}

pub fn get_item(
    buffer: &Vec<String>,
    max_supply: usize,
    sequence: usize,
    update_idx: usize,
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
        // no matter what the leading pointer is, we never want to the idx
        // (adjusted seq) to exceed the update_idx adjusted for 0 indexed offset.
        let adj_update_idx = if update_idx == 0 { 0 } else { update_idx - 1 };
        if idx == adj_update_idx.try_into().unwrap() {
            return Err(ErrorCode::InsufficientConfigError.into());
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

    if adj_update_idx < adj_sequence {
        return Ok(Bounds {
            lower: adj_update_idx,
            upper: adj_sequence,
            can_wrap: false,
            append: false,
        });
    }

    return Ok(Bounds {
        lower: adj_sequence,
        upper: adj_update_idx,
        can_wrap: adj_sequence != adj_update_idx,
        append: false,
    });
}

// comprehensive tests for buffer utils
// run with: `cargo test buffer_tests`
#[cfg(test)]
mod buffer_tests {
    use crate::{error::ErrorCode, util::buffer::add_to_circular_buffer, util::buffer::get_item};

    fn check_vec_equality<T: PartialEq>(a: &Vec<T>, b: &Vec<T>) -> bool {
        let matching = a.iter().zip(b.iter()).filter(|&(a, b)| a == b).count();
        matching == a.len() && matching == b.len()
    }

    #[test]
    fn new_config_adds_max_config_input() {
        let mut buffer: Vec<String> = Vec::new();
        let config_data = vec![
            "1".to_string(),
            "2".to_string(),
            "3".to_string(),
            "4".to_string(),
            "5".to_string(),
        ];
        let mut last_updated_idx = 0;
        let max_buffer_len: usize = 10;
        let _ = add_to_circular_buffer(
            0,
            &mut buffer,
            max_buffer_len,
            &config_data,
            &mut last_updated_idx,
        );
        assert_eq!(last_updated_idx, config_data.len());
        let expected_result: Vec<String> = vec![
            "1".to_string(),
            "2".to_string(),
            "3".to_string(),
            "4".to_string(),
            "5".to_string(),
        ];
        let vecs_match = check_vec_equality(&buffer, &expected_result);
        assert_eq!(vecs_match, true);
    }

    #[test]
    fn new_config_adds_max_buffer_size() {
        let mut buffer: Vec<String> = Vec::new();
        let config_data = vec![
            "1".to_string(),
            "2".to_string(),
            "3".to_string(),
            "4".to_string(),
            "5".to_string(),
            "6".to_string(),
            "7".to_string(),
            "8".to_string(),
            "9".to_string(),
            "10".to_string(),
            "11".to_string(),
        ];
        let mut last_updated_idx = 0;
        let max_buffer_len: usize = 10;
        let _ = add_to_circular_buffer(
            0,
            &mut buffer,
            max_buffer_len,
            &config_data,
            &mut last_updated_idx,
        );
        assert_eq!(last_updated_idx, 0);
        let expected_result: Vec<String> = vec![
            "1".to_string(),
            "2".to_string(),
            "3".to_string(),
            "4".to_string(),
            "5".to_string(),
            "6".to_string(),
            "7".to_string(),
            "8".to_string(),
            "9".to_string(),
            "10".to_string(),
        ];
        let vecs_match = check_vec_equality(&buffer, &expected_result);
        assert_eq!(vecs_match, true);
    }

    #[test]
    fn fill_max_buffer_and_nothing_else() {
        let sequence = 3;
        let mut buffer: Vec<String> = vec![
            "1".to_string(),
            "2".to_string(),
            "3".to_string(),
            "4".to_string(),
            "5".to_string(),
        ];
        let config_data: Vec<String> = vec![
            "6".to_string(),
            "7".to_string(),
            "8".to_string(),
            "9".to_string(),
            "10".to_string(),
        ];
        let mut last_updated_idx = 5;
        let max_buffer_len: usize = 10;
        let _ = add_to_circular_buffer(
            sequence,
            &mut buffer,
            max_buffer_len,
            &config_data,
            &mut last_updated_idx,
        );
        assert_eq!(last_updated_idx, 0);
        let expected_result: Vec<String> = vec![
            "1".to_string(),
            "2".to_string(),
            "3".to_string(),
            "4".to_string(),
            "5".to_string(),
            "6".to_string(),
            "7".to_string(),
            "8".to_string(),
            "9".to_string(),
            "10".to_string(),
        ];
        let vecs_match = check_vec_equality(&buffer, &expected_result);
        assert_eq!(vecs_match, true);
    }

    #[test]
    fn fill_max_buffer_and_wrap_to_sequence() {
        let sequence = 3;
        let mut buffer: Vec<String> = vec![
            "1".to_string(),
            "2".to_string(),
            "3".to_string(),
            "4".to_string(),
            "5".to_string(),
        ];
        let config_data: Vec<String> = vec![
            "6".to_string(),
            "7".to_string(),
            "8".to_string(),
            "9".to_string(),
            "10".to_string(),
            "11".to_string(),
            "12".to_string(),
            "13".to_string(),
        ];
        let mut last_updated_idx = 5;
        let max_buffer_len: usize = 10;
        let _ = add_to_circular_buffer(
            sequence,
            &mut buffer,
            max_buffer_len,
            &config_data,
            &mut last_updated_idx,
        );
        assert_eq!(last_updated_idx, sequence); // 3
        let expected_result: Vec<String> = vec![
            "11".to_string(),
            "12".to_string(),
            "13".to_string(),
            "4".to_string(),
            "5".to_string(),
            "6".to_string(),
            "7".to_string(),
            "8".to_string(),
            "9".to_string(),
            "10".to_string(),
        ];
        let vecs_match = check_vec_equality(&buffer, &expected_result);
        assert_eq!(vecs_match, true);
    }

    #[test]
    fn fill_max_buffer_and_wrap_to_less_than_sequence() {
        let sequence = 3;
        let mut buffer: Vec<String> = vec![
            "1".to_string(),
            "2".to_string(),
            "3".to_string(),
            "4".to_string(),
            "5".to_string(),
        ];
        let config_data: Vec<String> = vec![
            "6".to_string(),
            "7".to_string(),
            "8".to_string(),
            "9".to_string(),
            "10".to_string(),
            "11".to_string(),
        ];
        let mut last_updated_idx = 5;
        let max_buffer_len: usize = 10;
        let _ = add_to_circular_buffer(
            sequence,
            &mut buffer,
            max_buffer_len,
            &config_data,
            &mut last_updated_idx,
        );
        assert_eq!(last_updated_idx, 1);
        let expected_result: Vec<String> = vec![
            "11".to_string(),
            "2".to_string(),
            "3".to_string(),
            "4".to_string(),
            "5".to_string(),
            "6".to_string(),
            "7".to_string(),
            "8".to_string(),
            "9".to_string(),
            "10".to_string(),
        ];
        let vecs_match = check_vec_equality(&buffer, &expected_result);
        assert_eq!(vecs_match, true);
    }

    #[test]
    fn fill_from_last_updated_to_sequence_stop_with_small_config() {
        let sequence = 8;
        let mut buffer: Vec<String> = vec![
            "1".to_string(),
            "2".to_string(),
            "3".to_string(),
            "4".to_string(),
            "5".to_string(),
            "6".to_string(),
            "7".to_string(),
            "8".to_string(),
            "9".to_string(),
            "10".to_string(),
        ];
        let config_data: Vec<String> = vec!["11".to_string(), "12".to_string()];
        let mut last_updated_idx = 2;
        let max_buffer_len: usize = 10;
        // clone because we want val before updated
        let starting_updated_idx = last_updated_idx.clone();
        let _ = add_to_circular_buffer(
            sequence,
            &mut buffer,
            max_buffer_len,
            &config_data,
            &mut last_updated_idx,
        );
        assert_eq!(last_updated_idx, starting_updated_idx + config_data.len());
        let expected_result: Vec<String> = vec![
            "1".to_string(),
            "2".to_string(),
            "11".to_string(),
            "12".to_string(),
            "5".to_string(),
            "6".to_string(),
            "7".to_string(),
            "8".to_string(),
            "9".to_string(),
            "10".to_string(),
        ];
        let vecs_match = check_vec_equality(&buffer, &expected_result);
        assert_eq!(vecs_match, true);
    }

    #[test]
    fn fill_from_last_updated_to_sequence_and_nothing_else() {
        let sequence = 8;
        let mut buffer: Vec<String> = vec![
            "1".to_string(),
            "2".to_string(),
            "3".to_string(),
            "4".to_string(),
            "5".to_string(),
            "6".to_string(),
            "7".to_string(),
            "8".to_string(),
            "9".to_string(),
            "10".to_string(),
        ];
        let config_data: Vec<String> = vec![
            "11".to_string(),
            "12".to_string(),
            "13".to_string(),
            "14".to_string(),
            "15".to_string(),
            "16".to_string(),
            "17".to_string(),
            "18".to_string(),
            "19".to_string(),
            "20".to_string(),
        ];
        let mut last_updated_idx = 2;
        let max_buffer_len: usize = 10;

        // clone because we want val before updated
        let starting_updated_idx = last_updated_idx.clone();
        let _ = add_to_circular_buffer(
            sequence,
            &mut buffer,
            max_buffer_len,
            &config_data,
            &mut last_updated_idx,
        );
        assert_eq!(last_updated_idx, sequence);

        let expected_result: Vec<String> = vec![
            "1".to_string(),
            "2".to_string(),
            "11".to_string(),
            "12".to_string(),
            "13".to_string(),
            "14".to_string(),
            "15".to_string(),
            "16".to_string(),
            "9".to_string(),
            "10".to_string(),
        ];
        let vecs_match = check_vec_equality(&buffer, &expected_result);
        assert_eq!(vecs_match, true);
    }

    #[test]
    fn get_item_fetch_index_past_current_buffer_size() {
        let buffer: Vec<String> = vec!["a".to_string(), "b".to_string(), "c".to_string()];
        let max_buffer_len: usize = 10;
        let sequence = 3; // idx beyond buffer size
        let update_idx = 0;
        // get items from vec
        let result = get_item(&buffer, max_buffer_len, sequence, update_idx);
        assert!(result.is_err());
    }

    #[test]
    fn get_item_fetch_element_at_zero_index() {
        let buffer: Vec<String> = vec![
            "a".to_string(),
            "b".to_string(),
            "c".to_string(),
            "d".to_string(),
            "e".to_string(),
            "f".to_string(),
            "g".to_string(),
            "h".to_string(),
            "i".to_string(),
            "j".to_string(),
        ];
        let max_buffer_len: usize = 10;
        let sequence = 10; // 0
        let update_idx = 9;
        // get items from vec
        let result = get_item(&buffer, max_buffer_len, sequence, update_idx);
        assert!(!result.is_err());
        assert_eq!(result.unwrap(), "a".to_string());
    }

    #[test]
    fn get_item_fetch_element_at_first_index() {
        let buffer: Vec<String> = vec![
            "a".to_string(),
            "b".to_string(),
            "c".to_string(),
            "d".to_string(),
            "e".to_string(),
            "f".to_string(),
            "g".to_string(),
            "h".to_string(),
            "i".to_string(),
            "j".to_string(),
        ];
        let max_buffer_len: usize = 10;
        let sequence = 11; // 1
        let update_idx = 9;
        // get items from vec
        let result = get_item(&buffer, max_buffer_len, sequence, update_idx);
        assert!(!result.is_err());
        assert_eq!(result.unwrap(), "b".to_string());
    }

    #[test]
    fn get_item_attempt_to_fetch_element_but_idx_overlap() {
        let buffer: Vec<String> = vec![
            "a".to_string(),
            "b".to_string(),
            "c".to_string(),
            "d".to_string(),
            "e".to_string(),
            "f".to_string(),
            "g".to_string(),
            "h".to_string(),
            "i".to_string(),
            "j".to_string(),
        ];
        let max_buffer_len: usize = 10;
        let sequence = 13; // 4
        let update_idx = 4;
        // get items from vec
        let result = get_item(&buffer, max_buffer_len, sequence, update_idx);
        assert!(result.is_err());
    }
}
