import { program } from "commander";
import log from "loglevel";
import { BN, Wallet } from "@project-serum/anchor";
import { AuctionFactoryData, AuctionFactoryClient } from "@auction-factory/sdk";

import {
  Cluster,
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import {
  loadWalletKey,
  logAuctionData,
  epochToDateString,
} from "./helpers/account";

program.version("0.0.1");
log.setLevel("info");

// ============================================================================
// show account data commands
// ============================================================================

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
    log.info("Data => Min Reserve Price: ", af.data.minReservePrice.toNumber());
    log.info("Data => Duration: ", af.data.duration.toNumber());
    log.info(
      "Initialized At: ",
      epochToDateString(af.initializedAt.toNumber())
    );
    log.info("Active since: ", epochToDateString(af.activeSince.toNumber()));
    log.info("Treasury: ", af.treasury.toString());
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
// auction factory commands
// ============================================================================

programCommand("init_auction_factory")
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
      seed,
      treasury,
      duration,
      timeBuffer,
      minBidPercentageIncrease,
      minReservePrice,
    } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const client = createClient(env, walletKeyPair);

    const _treasury = new PublicKey(treasury);
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
        timeBuffer: timeBuffer ? new BN(timeBuffer) : af.data.timeBuffer,
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
