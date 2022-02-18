import { useState, useEffect } from 'react';

import "./AuctionAsset.css";

export interface AuctionAssetProps {
    metadataUri: string | undefined;
}

const fetchWithUri = async (
    uri: string,
): Promise<any> => {
    return fetch(uri, {
        method: "GET",
    }).then(response => response.json())
      .then(body => body)
      .catch((_) => {
        return undefined;
    });
}

const AuctionAsset = (props: AuctionAssetProps) => {
    const {
        metadataUri
    } = props;

    const [assetUri, setAssetUri] = useState<string|undefined>();

    useEffect(() => {
        // don't try and load uri if undefined
        if (!metadataUri) return;

        fetchWithUri(metadataUri)
            .then(md => setAssetUri(md["image"]))
            .catch(err => console.log("err: ", err));
    }, [metadataUri]);

    return (
        <div className="asset--wrapper">
            {!assetUri ?
                <div className="asset--content undefined--asset--content">
                    {metadataUri ?
                        // md exists, wait for asset to populate
                        <p className="asset--text">
                            Loading...
                        </p>
                        :
                        // no md exists
                        <p className="asset--text">
                            No asset to display
                        </p>
                    }
                </div>
             : <img className="asset--content" src={assetUri} />}
        </div>
    );
}

export default AuctionAsset;