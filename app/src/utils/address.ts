import { PublicKey } from "@solana/web3.js";

export const toDisplayString = (
    publicKey: PublicKey,
    sliceLength: number = 4
) => {
    let b58 = publicKey.toBase58();
    return (
        b58.slice(0, sliceLength) +
        "..." +
        b58.slice(b58.length - sliceLength, b58.length)
    );
};

export const getAddressLink = (addr: PublicKey | string) => {
    const _addr = addr instanceof PublicKey ? addr.toString() : addr;
    return `https://explorer.solana.com/address/${_addr}`;
};
