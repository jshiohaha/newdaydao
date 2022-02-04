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
