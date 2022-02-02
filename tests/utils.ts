import { expect } from "chai";
import { Keypair } from "@solana/web3.js";
import fs from "fs";

import { LOCAL_WALLET_PATH } from './constants';
import { hasUncaughtExceptionCaptureCallback } from "process";

export const expectThrowsAsync = async (method, errorMessage = undefined) => {
    let error = null;
    try {
        await method();
    } catch (err) {
        error = err;
    }
    expect(error).to.be.an("Error");
    if (errorMessage) {
        expect(error.message).to.equal(errorMessage);
    }
};

export const sleep = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export const provideWallet = () => {
    if (!LOCAL_WALLET_PATH || LOCAL_WALLET_PATH.length === 0) {
        throw Error("Local wallet path not set via LOCAL_WALLET_PATH env var");
    }

    return Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(LOCAL_WALLET_PATH, "utf8")))
    );
}
