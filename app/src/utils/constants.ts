import { Keypair, PublicKey } from "@solana/web3.js";
import { NodeWallet } from "@metaplex/js";

import auctionFactoryIdl from "../idl.json";

export type AUCTION_FACTORY_PROGRAM = typeof auctionFactoryIdl;

export const AUCTION_FACTORY_IDL = auctionFactoryIdl;

export const PROGRAM_ENDPOINT = "https://api.devnet.solana.com";

export const AUX_SEED = "aux";

export const AUX_FAX_SEED = "aux_fax";

export const AUTHORITY_PUBLIC_KEY = new PublicKey(
    "8L2s5h1hSU79naWcS7cvT3oxiPL6ofTDWmqTK1S4F99g"
);

export const ASSOCIATED_PROGRAM_ID = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

export const AUX_FACTORY_PROGRAM_ID = new PublicKey(
    "2jbfTkQ4DgbSZtb8KTq61v2ox8s1GCuGebKa1EPq3tbY"
);

export const CONFIG_ADDRESS = new PublicKey(
    process.env.REACT_APP_CONFIG_ADDRESS!
);

export const CONFIG_BUMP: number =
    +process.env.REACT_APP_CONFIG_BUMP!;

export const CONFIG_SEED: string = process.env.REACT_APP_CONFIG_SEED!;

export const AUX_FACTORY_ADDRESS = new PublicKey(
    process.env.REACT_APP_AUCTION_FACTORY_ADDRESS!
);

export const AUX_FACTORY_BUMP: number =
    +process.env.REACT_APP_AUCTION_FACTORY_BUMP!;

export const AUX_FACTORY_SEED: string =
    process.env.REACT_APP_AUCTION_FACTORY_SEED!;

export const AUX_FACTORY_TREASURY_ADDRESS = new PublicKey(
    process.env.REACT_APP_AUCTION_FACTORY_TREASURY!
);

// when we only want to view data, no need to connect a real wallet
export const LEAKED_WALLET_KEYPAIR = () => {
    const leakedKp = Keypair.fromSecretKey(
        Uint8Array.from([
            208, 175, 150, 242, 88, 34, 108, 88, 177, 16, 168, 75, 115, 181,
            199, 242, 120, 4, 78, 75, 19, 227, 13, 215, 184, 108, 226, 53, 111,
            149, 179, 84, 137, 121, 79, 1, 160, 223, 124, 241, 202, 203, 220,
            237, 50, 242, 57, 158, 226, 207, 203, 188, 43, 28, 70, 110, 214,
            234, 251, 15, 249, 157, 62, 80,
        ])
    );
    return new NodeWallet(leakedKp);
};

export const AVATAR_COLORS = [
    "#92A1C6",
    "#146A7C",
    "#F0AB3D",
    "#C271B4",
    "#C20D90",
];

