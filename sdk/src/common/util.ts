import { Keypair } from "@solana/web3.js";
import * as lodash from "lodash";

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

export const isBlank = (val: string): boolean => {
    return lodash.isEmpty(val) && !lodash.isNumber(val) || lodash.isNaN(val);
}