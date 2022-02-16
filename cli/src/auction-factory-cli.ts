import { program } from "commander";
import log from "loglevel";
import { BN, Wallet } from "@project-serum/anchor";
import {
    AuctionFactoryData,
    AuctionFactoryClient,
} from "@auction-factory/sdk";

import { Cluster, clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { loadWalletKey, logAuctionData, epochToDateString } from "./helpers/account";

program.version("0.0.1");
log.setLevel("info");

// ============================================================================
// show account data commands
// ============================================================================

programCommand("show_config")
    .option("-s, --seed <string>", "Config seed")
    .action(async (_, cmd) => {
        const { keypair, env, seed } = cmd.opts();

        const walletKeyPair = loadWalletKey(keypair);
        const client = createClient(env, walletKeyPair);
        const [addr, bump] = await client.findConfigPda(seed);
        const config = await client.fetchConfig(addr);

        log.info("===========================================");
        log.info("Config address:", addr.toString());
        log.info("Config bump:", bump);
        log.info("===========================================");
        log.info("Config");
        log.info("Max Supply: ", config.maxSupply);
        log.info("Update Idx: ", config.updateIdx);
        log.info("Is Updated: ", config.isUpdated);
        const buffer = config.buffer as string[];
        log.info("Buffer Size: ", buffer.length);
        log.info("Buffer Contents... ");
        buffer.forEach((el, idx) => log.info(`idx: ${idx}: ${el}`));
    });

programCommand("show_auction_factory")
    .option("-s, --seed <string>", "Auction Factory seed")
    .action(async (_, cmd) => {
        const { keypair, env, seed } = cmd.opts();

        const walletKeyPair = loadWalletKey(keypair);
        const client = createClient(env, walletKeyPair);
        const [addr, bump] = await client.findAuctionFactoryPda(seed);
        const af = await client.fetchAuctionFactory(addr);

        log.info("===========================================");
        log.info("Auction Factory address:", addr.toString());
        log.info("Auction Factory bump:", bump);
        log.info("===========================================");
        log.info("Auction Factory");
        log.info("Sequence: ", af.sequence.toNumber());
        log.info("Authority: ", af.authority.toString());
        log.info("Is active: ", af.isActive);
        log.info("Data => Time Buffer: ", af.data.timeBuffer.toNumber());
        log.info(
            "Data => Min Bid Percentage Increase: ",
            af.data.minBidPercentageIncrease.toNumber()
        );
        log.info(
            "Data => Min Reserve Price: ",
            af.data.minReservePrice.toNumber()
        );
        log.info("Data => Duration: ", af.data.duration.toNumber());
        log.info("Initialized At: ", epochToDateString(af.initializedAt.toNumber()));
        log.info("Active since: ",epochToDateString(af.activeSince.toNumber()));
        log.info("Treasury: ", af.treasury.toString());
        log.info("Config: ", af.config.toString());
    });

programCommand("show_current_auction")
    .option("-s, --seed <string>", "Auction Factory seed")
    .action(async (_, cmd) => {
        const { keypair, env, seed } = cmd.opts();

        const walletKeyPair = loadWalletKey(keypair);
        const client = createClient(env, walletKeyPair);

        const [afAddr, _afBump] = await client.findAuctionFactoryPda(seed);
        const af = await client.fetchAuctionFactory(afAddr);

        const [aAddr, aBump] = await client.findAuctionPda(af.sequence, afAddr);
        const auction = await client.fetchAuction(aAddr);

        logAuctionData(aAddr, aBump, auction as any);
    });

programCommand("show_auction")
    .option("-s, --seed <string>", "Auction Factory seed")
    .option("-seq, --sequence <number>", "Auction Factory sequence")
    .action(async (_, cmd) => {
        const { keypair, env, seed, sequence } = cmd.opts();

        const walletKeyPair = loadWalletKey(keypair);
        const client = createClient(env, walletKeyPair);

        const [afAddr, _afBump] = await client.findAuctionFactoryPda(seed);
        const [aAddr, aBump] = await client.findAuctionPda(
            new BN(sequence),
            afAddr
        );
        const auction = await client.fetchAuction(aAddr);

        logAuctionData(aAddr, aBump, auction as any);
    });

// ============================================================================
// config commands
// ============================================================================

programCommand("init_config")
    .option("-s, --seed <string>", "Auction Factory seed")
    .option("-ms, --maxSupply <string>", "Auction Factory treasury")
    .action(async (_, cmd) => {
        const { keypair, env, seed, maxSupply } = cmd.opts();

        const walletKeyPair = loadWalletKey(keypair);
        const client = createClient(env, walletKeyPair);
        const [addr, bump] = await client.findConfigPda(seed);

        await client.initializeConfig(
            addr,
            bump,
            seed,
            maxSupply,
            walletKeyPair
        );
    });

// todo: add config from file later
programCommand("add_config")
    .option("-cs, --configSeed <string>", "Config seed")
    .option("-s, --seed <string>", "Auction Factory seed")
    .option("-d, --data <string>", "Comma separated strings to add to config")
    .action(async (_, cmd) => {
        const { keypair, env, configSeed, seed, data } = cmd.opts();

        const walletKeyPair = loadWalletKey(keypair);
        const client = createClient(env, walletKeyPair);

        const [config, cBump] = await client.findConfigPda(configSeed);
        client.updateConfigDetails(config, cBump, configSeed);

        const [addr, bump] = await client.findAuctionFactoryPda(seed);
        client.updateAuctionFactoryDetails(addr, bump, seed);

        const _data = data
            .trim()
            .split(",")
            .map((el) => el.trim());
            log.info(`Adding ${_data.length} items to config`);
        _data.forEach(el => log.info(el));

        await client.addConfig(_data, walletKeyPair);
    });

// ============================================================================
// auction factory commands
// ============================================================================

programCommand("init_auction_factory")
    .option("-cs, --configSeed <string>", "Auction Factory seed")
    .option("-s, --seed <string>", "Auction Factory seed")
    .option("-t, --treasury <string>", "Auction Factory treasury")
    .option("-d, --duration <number>", "Duration for each auction")
    .option(
        "-b, --timeBuffer <number>",
        "Time Buffer for each auction. Currently unused."
    )
    .option(
        "-mpi, --minBidPercentageIncrease <number>",
        "Minimum bid percentage increase for each auction"
    )
    .option(
        "-mrp, --minReservePrice <number>",
        "Minimum reserve price for each auction"
    )
    .action(async (_, cmd) => {
        const {
            keypair,
            env,
            configSeed,
            seed,
            treasury,
            duration,
            timeBuffer,
            minBidPercentageIncrease,
            minReservePrice,
        } = cmd.opts();

        const walletKeyPair = loadWalletKey(keypair);
        const client = createClient(env, walletKeyPair);

        const [config, cBump] = await client.findConfigPda(configSeed);
        client.updateConfigDetails(config, cBump, configSeed);

        const _treasury = new PublicKey(treasury)
        const [addr, bump] = await client.findAuctionFactoryPda(seed);
        await client.initialize(
            addr,
            bump,
            seed,
            {
                duration: new BN(duration),
                timeBuffer: new BN(timeBuffer),
                minBidPercentageIncrease: new BN(minBidPercentageIncrease),
                minReservePrice: new BN(minReservePrice),
            } as AuctionFactoryData,
            _treasury,
            walletKeyPair
        );
    });

programCommand("activate_auction_factory")
    .option("-s, --seed <string>", "Auction Factory seed")
    .action(async (_, cmd) => {
        const { keypair, env, seed } = cmd.opts();

        const walletKeyPair = loadWalletKey(keypair);
        const client = createClient(env, walletKeyPair);
        const [addr, bump] = await client.findAuctionFactoryPda(seed);

        client.updateAuctionFactoryDetails(addr, bump, seed);

        await client.toggleStatus(walletKeyPair);
    });

programCommand("modify_auction_factory")
    .option("-s, --seed <string>", "Auction Factory seed")
    .option("-d, --duration <number>", "Duration for each auction. Optional.")
    .option(
        "-b, --timeBuffer <number>",
        "Time Buffer for each auction. Currently unused. Optional."
    )
    .option(
        "-mpi, --minBidPercentageIncrease <number>",
        "Minimum bid percentage increase for each auction. Optional."
    )
    .option(
        "-mrp, --minReservePrice <number>",
        "Minimum reserve price for each auction. Optional."
    )
    .action(async (_, cmd) => {
        const {
            keypair,
            env,
            seed,
            duration,
            timeBuffer,
            minBidPercentageIncrease,
            minReservePrice,
        } = cmd.opts();

        const walletKeyPair = loadWalletKey(keypair);
        const client = createClient(env, walletKeyPair);
        const [addr, bump] = await client.findAuctionFactoryPda(seed);
        client.updateAuctionFactoryDetails(addr, bump, seed);

        const af = await client.fetchAuctionFactory(addr);
        await client.modify(
            {
                duration: duration ? new BN(duration) : af.data.duration,
                timeBuffer: timeBuffer
                    ? new BN(timeBuffer)
                    : af.data.timeBuffer,
                minBidPercentageIncrease: minBidPercentageIncrease
                    ? new BN(minBidPercentageIncrease)
                    : af.data.minBidPercentageIncrease,
                minReservePrice: minReservePrice
                    ? new BN(minReservePrice)
                    : af.data.minReservePrice,
            },
            walletKeyPair
        );
    });

programCommand("update_auction_factory_treasury")
    .option("-s, --seed <string>", "Auction Factory seed")
    .option("-t, --treasury <string>", "New treasury")
    .action(async (_, cmd) => {
        const { keypair, env, seed, treasury } = cmd.opts();

        const walletKeyPair = loadWalletKey(keypair);
        const client = createClient(env, walletKeyPair);
        const [addr, bump] = await client.findAuctionFactoryPda(seed);
        client.updateAuctionFactoryDetails(addr, bump, seed);

        await client.updateTreasury(treasury, walletKeyPair);
    });

// ============================================================================
// helper commands
// ============================================================================

function programCommand(name: string) {
    return program
        .command(name)
        .option(
            "-e, --env <string>",
            "Solana cluster env name",
            "devnet" // mainnet-beta, testnet, devnet
        )
        .option(
            "-k, --keypair <path>",
            `Solana wallet location`,
            "--keypair not provided"
        )
        .option("-l, --log-level <string>", "log level", setLogLevel);
}

const createClient = (cluster: Cluster, keypair: Keypair) => {
    const connection = new Connection(clusterApiUrl(cluster));
    const wallet = new Wallet(keypair);

    const client = new AuctionFactoryClient(connection, wallet);

    return client;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setLogLevel(value, prev) {
    if (value === undefined || value === null) {
        return;
    }
    log.info("setting the log value to: " + value);
    log.setLevel(value);
}

program.parse(process.argv);
