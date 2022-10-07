import { useState, useEffect } from "react";
import BeatLoader from "react-spinners/BeatLoader";
import {LazyLoadImage} from 'react-lazy-load-image-component';

import {
    LOADING_COLOR,
    LOADING_SPEED_MULTIPLIER,
    LOADING_STATE_SIZE,
    OVERRIDE,
} from "../../utils/constants";

import "./AuctionAsset.css";

export interface AuctionAssetProps {
    metadataUri: string | undefined;
}

const fetchWithUri = async (uri: string): Promise<any> => {
    return fetch(uri, {
        method: "GET",
    })
        .then((response) => response.json())
        .then((body) => body)
        .catch((_) => {
            return undefined;
        });
};

const AuctionAsset = (props: AuctionAssetProps) => {
    const { metadataUri } = props;

    const [assetUri, setAssetUri] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // don't try and load uri if undefined
        if (!metadataUri) return;
        setIsLoading(true);
        setAssetUri(undefined);

        fetchWithUri(metadataUri)
            .then((md) => {
                setAssetUri(md["image"]);
                setIsLoading(false);
            })
            .catch((err) => console.log("err: ", err));
    }, [metadataUri]);

    return (
        <div className="asset--wrapper">
            {!assetUri ? (
                <div className="asset--content undefined--asset--content">
                    {metadataUri ? (
                        // md exists, wait for asset to populate
                        <p className="loading--asset--wrapper">
                            {/* <BeatLoader
                                color={LOADING_COLOR}
                                loading={isLoading}
                                css={OVERRIDE}
                                size={LOADING_STATE_SIZE}
                                speedMultiplier={LOADING_SPEED_MULTIPLIER}
                            /> */}
                        </p>
                    ) : (
                        // no md exists
                        <p className="asset--text">No asset to display</p>
                    )}
                </div>
            ) : (
                <>
                    <LazyLoadImage
                        afterLoad={() => console.log('after')}
                        beforeLoad={() => console.log('before')}
                        className="asset--content"
                        effect={undefined}
                        height={480}
                        key={assetUri}
                        placeholderSrc={undefined}
                        src={assetUri}
                        threshold={100}
                        width={480}
                        wrapperClassName="gallery-img-wrapper" />
                    <div className="asset--content asset--content--placeholder"></div> 
                </>
            )}
        </div>
    );
};

export default AuctionAsset;
