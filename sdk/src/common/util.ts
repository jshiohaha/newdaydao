import { Keypair, PublicKey } from "@solana/web3.js";
import * as lodash from "lodash";

import { isKp } from "../common";
import { SignerInfo } from "../common/types";

export const sleep = async (ms: number) => {
    await new Promise((response) =>
        setTimeout(() => {
            response(0);
        }, ms)
    );
};

export const generateSeed = (seedLen: number) => {
    return Keypair.generate()
        .publicKey.toBase58()
        .slice(0, seedLen);
};

export const isBlank = (val: string | undefined): boolean => {
    return lodash.isEmpty(val) && !lodash.isNumber(val) || lodash.isNaN(val);
}

export const getCurrentSequence = (sequence: number): number => {
    return Math.max(sequence - 1, 0)
}

export const getSignersFromPayer = (
    payer: PublicKey | Keypair
): SignerInfo  => {
    const payerIsKeypair = isKp(payer);
    const _payer = payerIsKeypair ? (<Keypair>payer).publicKey : payer;

    // assert signers is non-empty array?
    const signers = [];
    if (payerIsKeypair) signers.push(<Keypair>payer);

    return {
        payer: _payer,
        signers
    } as SignerInfo;
}