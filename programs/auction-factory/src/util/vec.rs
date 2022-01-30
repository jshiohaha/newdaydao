// local imports
use crate::error::ErrorCode;

pub fn update_vec<T: Clone>(
    vec: &mut Vec<T>,
    val: T,
    max_vec_size: usize,
) -> std::result::Result<(), ErrorCode> {
    if vec.len() < max_vec_size {
        vec.push(val);
    } else {
        // there's probably a better, more ~rusty~ way to do this :shrug:
        let mut updated_vec = Vec::new();
        updated_vec.extend_from_slice(&vec[1..]);
        updated_vec.push(val);

        *vec = updated_vec;
    }

    Ok(())
}

// comprehensive tests for buffer utils
// run with: cargo test buffer_tests
#[cfg(test)]
mod update_vec_tests {
    use crate::{error::ErrorCode, util::vec::update_vec};

    #[test]
    fn update_vec_add_first_item() {
        let max_vec_size = 5;
        let mut array = vec![];
        let result = update_vec(&mut array, 0, max_vec_size);

        assert!(!result.is_err());
        assert_eq!(array, vec![0]);
    }

    #[test]
    fn update_vec_add_second_item() {
        let max_vec_size = 5;
        let mut array = vec![0];
        let result = update_vec(&mut array, 1, max_vec_size);

        assert!(!result.is_err());
        assert_eq!(array, vec![0, 1]);
    }

    #[test]
    fn update_vec_add_last_item() {
        let max_vec_size = 5;
        let mut array = vec![0, 1, 2, 3];
        let result = update_vec(&mut array, 4, max_vec_size);

        assert!(!result.is_err());
        assert_eq!(array, vec![0, 1, 2, 3, 4]);
    }

    #[test]
    fn update_vec_shift_first_element() {
        let max_vec_size = 5;
        let mut array = vec![0, 1, 2, 3, 4];
        let result = update_vec(&mut array, 5, max_vec_size);

        assert!(!result.is_err());
        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }
}
