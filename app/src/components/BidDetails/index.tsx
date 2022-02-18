import { PublicKey } from '@solana/web3.js';
import { BN } from '@project-serum/anchor';
import Avatar from "boring-avatars";

import { getAddressLink, toDisplayString } from '../../utils/address';
import { getFormattedBidAmount } from '../../utils/auction';
import { AVATAR_COLORS } from '../../utils/constants';
import { timestampToDateString, toDateSubString } from '../../utils/util';

import "./BidDetails.css";

export interface LeadingBidProps {
    bidder: PublicKey;
    amount: BN;
    timestamp: BN;
}

const BidDetails = (props: LeadingBidProps) => {
    const {
        bidder,
        amount,
        timestamp
    } = props;

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
                {" "} bid <b><span className="sol--text--symbol">◎</span>{getFormattedBidAmount(amount)}</b> on {timestampToDateString(timestamp)}
            </span>
        </div>
    );
}

export default BidDetails;