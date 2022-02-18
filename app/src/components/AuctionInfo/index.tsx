import { useState, useEffect } from 'react';
import { BN_ONE } from '@auction-factory/sdk';

import AuctionDetails from '../AuctionDetails';
import AuctionAsset from '../AuctionAsset';

import Countdown from '../Countdown';
import { useAuctionFactory } from '../../hooks/useAuctionFactory';

import "./AuctionInfo.css";

const AuctionInfo = () => {
    const {
        auction,
        refreshNftMetadata
    } = useAuctionFactory();
    const [metadataUri, setMetadataUri] = useState<string|undefined>(undefined);
    const [sequence, setSequence] = useState<number>(0);
    const [endTime, setEndTime] = useState<number|undefined>(0);

    useEffect(() => {
        const loadMetadata = async () => {
            return await refreshNftMetadata();
        };

        if (!auction) return;

        loadMetadata()
            .then(uri => {
                setMetadataUri(uri);
            })
            .catch(err => console.log(err));

        setEndTime(auction.endTime.toNumber());
        setSequence(auction.sequence.toNumber());
    }, [auction && auction.sequence]);

    return (
        <div className="auction--display--wrapper">
            <AuctionAsset metadataUri={metadataUri} />

            <div className="auction--info--wrapper">
                <div className="auction--info--container">
                    <h1 className="auction--title">{sequence === 0 ? 'No auctions yet' : `Auction ${sequence}`}</h1>
                    <Countdown endTime={endTime} />

                    <AuctionDetails />
                </div>
            </div>

        </div>
    );
}

export default AuctionInfo;
