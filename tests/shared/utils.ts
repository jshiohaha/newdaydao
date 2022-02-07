import { expect } from "chai";
import * as lodash from "lodash";
import { Network } from "./types";

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

export const getAnchorEnv = () => {
    const providerUrl = process.env.ANCHOR_PROVIDER_URL;

    if (lodash.includes(providerUrl, "testnet")) {
        return Network.Testnet;
    } else if (lodash.includes(providerUrl, "devnet")) {
        return Network.Devnet;
    } else if (lodash.includes(providerUrl, "mainnet")) {
        return Network.Mainnet;
    } else {
        return Network.Localnet;
    }
};
