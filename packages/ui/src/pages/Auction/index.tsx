import { useState, useEffect } from 'react';

import AuctionDetails from '../../components/AuctionDetails';
import AuctionAsset from '../../components/AuctionAsset';
import Countdown from '../../components/Countdown';
import { useAuctionFactory } from '../../hooks/useAuctionFactory';

import "./Auction.css";
import { BN_ONE, BN_ZERO } from '@auction-factory/sdk';

const Auction = () => {
    const {
        auction,
        auctionFactory,
        refreshNftMetadata,
        incrementSequence,
        decrementSequence
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
    }, [auction?.sequence]);

    const decrementAuctionSequence = () => decrementSequence();

    const incrementAuctionSequence = () => incrementSequence();

    const isLeftNavigationDisalbled = () => auction?.sequence.eq(BN_ONE);

    const isRightNavigationDisalbled = () => auction?.sequence.gte(auctionFactory!.sequence)

    return (
        <div className="auction--display--wrapper">
            <div className="auction--navigation--wrapper">
                <button className={`auction--navigation navigation--left ${isLeftNavigationDisalbled() && 'navigation--disabled'}`} disabled={isLeftNavigationDisalbled()} onClick={decrementAuctionSequence}>←</button>
                <button className={`auction--navigation navigation--right ${isRightNavigationDisalbled() && 'navigation--disabled'}`} disabled={isRightNavigationDisalbled()} onClick={incrementAuctionSequence}>→</button>
            </div>

            <AuctionAsset metadataUri={metadataUri} />

            <div className="auction--info--wrapper">
                <div className="auction--info--container">
                    <h1 className="auction--title">{sequence === 0 ? 'No auctions yet' : `Auction ${sequence}`}</h1>
                    {/* <Countdown endTime={endTime} /> */}

                    <AuctionDetails />
                </div>
            </div>

        </div>
    );
}

export default Auction;
