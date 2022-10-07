import { Keypair, PublicKey } from "@solana/web3.js";
import { FC, ReactNode, useCallback, useEffect, useState } from "react";
import { AuctionFactoryContext } from "../hooks/useAuctionFactory";

import {
    useWallet,
    WalletContextState,
    useConnection,
} from "@solana/wallet-adapter-react";
import { SignerWalletAdapter } from "@solana/wallet-adapter-base";

import { createDefaultAuctionFactory } from "../utils/auctionFactory";
import {
    AuctionFactoryClient,
    TokenAccount,
    Auction,
    AuctionFactory,
    BN_ZERO,
    BN_ONE,
} from "@auction-factory/sdk";
import { BN } from "@project-serum/anchor";

import { getMetadata, decodeMetadata } from "../utils/metadata";

export interface AuctionFactoryProviderProps {
    children: ReactNode;
}

export const AuctionFactoryProvider: FC<AuctionFactoryProviderProps> = ({
    children,
}) => {
    const [staleToggle, setStaleToggle] = useState<boolean>(false);
    const [nftMetadataUri, setNftMetadataUri] = useState<string>('');
    const [client, setClient] = useState<AuctionFactoryClient>();
    const [auctionFactoryAddress, setAuctionFactoryAddress] = useState<
        PublicKey | undefined
    >(undefined);
    const [auction, setAuction] = useState<Auction | undefined>();
    const [auctionFactory, setAuctionFactory] = useState<
        AuctionFactory | undefined
    >();
    const [sequence, setSequence] = useState<BN>(auctionFactory ? auctionFactory.sequence : BN_ZERO);

    const connection = useConnection();
    const wallet: WalletContextState = useWallet();

    const _fetchAuction = async (
        sequence: BN,
        afAddress: PublicKey
    ): Promise<any> => {
        if (!client) return;
        if (!auctionFactory) return;

        console.log('sequence: ', sequence.toNumber());

        const [addr, _bump] = await client.findAuctionPda(
            sequence,
            afAddress
        );

        return await client.fetchAuction(addr);
    };

    const requestProviderRefresh = () => setStaleToggle(!staleToggle);

    const getValidatedWalletConnection = (
        wallet: WalletContextState
    ): PublicKey => {
        if (!wallet.publicKey) {
            throw new Error("wallet is not connected");
        }

        return wallet.publicKey;
    };

    // never refresh
    useEffect(() => {
        const init = async (): Promise<AuctionFactoryClient> => {
            return await createDefaultAuctionFactory(
                connection.connection,
                wallet.adapter as SignerWalletAdapter
            );
        };

        init()
            .then((_client) => {
                if (!_client) return;
                setClient(_client);
                setAuctionFactoryAddress(_client.auctionFactory.config.address);
            })
            .catch((err) => console.log("err: ", err));
    }, []);

    useEffect(() => {
        const fetchAuctionFactory = async (address: PublicKey): Promise<any> =>
            await client?.fetchAuctionFactory(address);

        if (auctionFactoryAddress) {
            fetchAuctionFactory(auctionFactoryAddress)
                .then((_auctionFactory) => {
                    setAuctionFactory(_auctionFactory);
                    setSequence(_auctionFactory.sequence);
                })
                .catch((err) => console.log("load auction factory err: ", err));
        }
    }, [auctionFactoryAddress, staleToggle]);

    useEffect(() => {
        if (auctionFactoryAddress && auctionFactory) {
            _fetchAuction(sequence, auctionFactoryAddress)
                .then((_auction) => {
                    console.log('auction: ', _auction)
                    setAuction(_auction);
                })
                .catch((err: any) => {
                    console.log('auction err: ', err);
                    setAuction(undefined)
                });
        }
    }, [auctionFactory, sequence, staleToggle]); // want to re-run when auction factory actually loads; avoid checking equality on whole auction factory object.

    // const fetchAuctionWithSequence = (seq: BN) => {
    //     if (auctionFactoryAddress && auctionFactory) {
    //         const currentSequence = auctionFactory.sequence;
    //         _fetchAuction(seq, auctionFactoryAddress)
    //             .then((_auction) => {
    //                 console.log('auction: ', _auction)
    //                 setAuction(_auction);
    //             })
    //             .catch((err: any) => {
    //                 console.log('auction err: ', err);
    //                 setAuction(undefined)
    //             });
    //     }
    // }

    const refreshNftMetadata = async (): Promise<string|undefined> => {
        if (!client || !auction || !auction.resource) return;

        const md = await getMetadata(auction.resource.toString());

        const cachedUri = localStorage.getItem(md);
        if (!cachedUri) {
            const mdPublicKey = new PublicKey(md);
            const accountInfo = await client.connection.getAccountInfo(mdPublicKey);

            if (!accountInfo) return;
            const raw_metadata = decodeMetadata(accountInfo.data);

            localStorage.setItem(md, raw_metadata.data.uri);
            return raw_metadata.data.uri;
        } else {
            return cachedUri;
        }
    };

    // todo: can we return tx hash to display in the ui?
    const createAuction = async (wallet: WalletContextState): Promise<any> => {
        if (!auctionFactory) return;
        const userPublickey: PublicKey = getValidatedWalletConnection(wallet);
        const _client = await createDefaultAuctionFactory(
            connection.connection,
            wallet
        );

        const _sequence: BN = sequence.add(BN_ONE);
        const [addr, bump] = await _client.findAuctionPda(
            _sequence,
            _client.auctionFactory.config.address
        );

        await _client.createAuction(addr, bump, _sequence, userPublickey);

        setSequence(_sequence);
    };

    const mintNftToAuctionWithRpcCall = async (
        wallet: WalletContextState
    ): Promise<void> => {
        if (!auctionFactory) return;
        if (!auction) return;

        const userPublickey: PublicKey = getValidatedWalletConnection(wallet);
        const _client = await createDefaultAuctionFactory(
            connection.connection,
            wallet
        );

        // when minting an NFT to the auction directly after creating it, we need to
        // force refresh the sequence due to async nature of updates.
        const _currentAuctionFactory = await _client.fetchAuctionFactory(_client.auctionFactory.config.address);
        console.log('seq: ', sequence.toNumber());
        console.log('_currentAuctionFactory seq: ', _currentAuctionFactory.sequence.toNumber());

        const mint = Keypair.generate();
        await _client.mintTokenToAuction(
            sequence,
            mint,
            userPublickey
        );

        await _client.supplyResource(
            sequence,
            mint.publicKey,
            userPublickey
        );

        await refreshNftMetadata();
    };

    const placeBid = async (
        amount: BN,
        wallet: WalletContextState
    ): Promise<any> => {
        if (!auctionFactory) return;

        const userPublickey: PublicKey = getValidatedWalletConnection(wallet);
        const _client = await createDefaultAuctionFactory(
            connection.connection,
            wallet
        );

        const _amount = new BN(amount);
        await _client.placeBid(sequence, _amount, userPublickey);
    };

    const settleAuction = async (wallet: WalletContextState): Promise<any> => {
        if (!auctionFactory) return;
        if (!auction) return;
        if (!auction.resource)
            throw new Error("Unititialized current auction resource");

        const _client = await createDefaultAuctionFactory(
            connection.connection,
            wallet
        );
        const userPublickey: PublicKey = getValidatedWalletConnection(wallet);

        let bidderTokenAccountData: TokenAccount | undefined = undefined;
        if (auction.bidder) {
            const [bidderTokenAccount, bidderTokenAccountBump] =
                await _client.getAssociatedTokenAccountAddress(
                    auction.bidder,
                    auction.resource
                );
            bidderTokenAccountData = {
                address: bidderTokenAccount,
                bump: bidderTokenAccountBump,
            } as TokenAccount;
        }

        console.log('bidderTokenAccountData pubkey: ', bidderTokenAccountData?.address.toString());
        console.log('bidderTokenAccountData bump: ', bidderTokenAccountData?.bump);

        await _client.settleAuction(
            sequence,
            bidderTokenAccountData,
            auction.resource,
            userPublickey
        );
    };

    const incrementSequence = (): void => {
        setSequence(sequence.add(BN_ONE));
        // set metadata to undefined?
    }

    const decrementSequence = (): void => {
        setSequence(sequence.sub(BN_ONE));
    }

    // https://github.com/solana-labs/solana-pay/blob/06775cf15fabe5b8c7600f7aa276e9d59ce9c265/point-of-sale/src/components/contexts/TransactionsProvider.tsx
    return (
        <AuctionFactoryContext.Provider
            value={{
                client,
                auction,
                auctionFactory,
                requestProviderRefresh,
                refreshNftMetadata,
                createAuction,
                mintNftToAuctionWithRpcCall,
                placeBid,
                settleAuction,
                incrementSequence,
                decrementSequence
            }}
        >
            {children}
        </AuctionFactoryContext.Provider>
    );
};
