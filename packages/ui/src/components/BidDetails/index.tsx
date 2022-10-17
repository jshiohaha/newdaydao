import { PublicKey } from '@solana/web3.js';
import { BN } from '@project-serum/anchor';
import Avatar from "boring-avatars";

import { getAddressLink, toDisplayString } from '../../utils/address';
import { getFormattedBidAmount } from '../../utils/auction';
import { AVATAR_COLORS } from '../../utils/constants';
import { getNow, timestampToDateString, toDateSubString } from '../../utils/util';

import "./BidDetails.css";
import ReactTooltip from 'react-tooltip';
import { useState } from 'react';

export interface LeadingBidProps {
    bidder: PublicKey;
    amount: BN;
    timestamp: BN;
    idx?: number;
}

const BidDetails = (props: LeadingBidProps) => {
    const {
        bidder,
        amount,
        timestamp,
        idx
    } = props;

    const [_amount, _setAmount] = useState(amount === undefined ? 0 : amount);

    const [_key, _setKey] = useState(idx ? idx : getNow(false));

    return (
        <div className="leading--bid--wrapper">
            <Avatar
                size={30}
                name={bidder.toString()}
                variant="marble"
                colors={AVATAR_COLORS}
            />

            <span className='bid--text--details'>
                <a className="bidder--address--link" href={getAddressLink(bidder)} target="_blank">
                    {toDisplayString(bidder)}
                </a>
                {" "} bid <b data-tip data-for={`expanded-amount-${_key}`}><span className="sol--text--symbol">◎</span>{getFormattedBidAmount(amount)}</b> {" "} on {timestampToDateString(timestamp)}
                <ReactTooltip id={`expanded-amount-${_key}`} place="top" type="light" effect="float">
                    <b>◎{getFormattedBidAmount(amount, false, 4)}</b>
                </ReactTooltip>
            </span>
        </div>
    );
}


export default BidDetails;