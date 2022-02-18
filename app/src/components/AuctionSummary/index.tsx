import { BN } from '@project-serum/anchor';

import "./AuctionSummary.css";

export interface AuctionSummaryProps {
    sequence: BN | undefined;
}

const AuctionSummary = (props: AuctionSummaryProps) => {
    const { sequence } = props;

    const getOrdinalSuffix = (n: BN) => {
        const ordinalSuffix: Map<number, string> = new Map([
            [1, 'st'],
            [2, 'nd'],
            [3, 'rd'],
        ]);

        const _n = n.toNumber();
        if (_n < 4) {
            return `${_n}${ordinalSuffix.get(_n)}`
        }

        return `${_n}th`
    }

    return (
        <div className="auction--summary--wrapper">
            <span>
                This {sequence && sequence.toNumber() > 0 ? ` is the ${getOrdinalSuffix(sequence)} auction ` : ' auction is part '} of the New Day DAO project.
                Owning this NFT grants the owner governance rights within the DAO.
                Governance activities include submitting and voting on proposals that
                dictate how the DAO operates, how the DAO uses treasury funds, and more.
            </span>
        </div>
    );
}

export default AuctionSummary;
