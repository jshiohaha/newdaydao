import React, { useEffect, useState, useRef, ChangeEvent, useCallback } from 'react';
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

// import { Auction, AuctionHouseContractFunction } from '../../wrappers/nounsAuction';
// import { connectContractToSigner, useEthers, useContractFunction } from '@usedapp/core';
// import { useAppSelector } from '../../hooks';
// import { utils, BigNumber as EthersBN } from 'ethers';
// import BigNumber from 'bignumber.js';
// import { Spinner, InputGroup, FormControl, Button } from 'react-bootstrap';
// import { useAuctionMinBidIncPercentage } from '../../wrappers/nounsAuction';
// import { useAppDispatch } from '../../hooks';
// import { AlertModal, setAlertModal } from '../../state/slices/application';
// import { NounsAuctionHouseFactory } from '@nouns/sdk';
// import config from '../../config';

import './Bid.css';

const computeMinimumNextBid = (
  currentBid: number,
  minBidIncPercentage: number | undefined,
): number => {
  return !minBidIncPercentage
    ? 0
    : (currentBid / LAMPORTS_PER_SOL) * (minBidIncPercentage / 100) + 1;
    // : currentBid.times(minBidIncPercentage.div(100).plus(1));
};

const minBidSol = (minBid: number): string => {
  if (minBid === 0) {
    return '0.01';
  }

  const roundedSol = Math.ceil((minBid / LAMPORTS_PER_SOL) * 100) / 100;
  return roundedSol.toString();
};

const currentBid = (bidInputRef: React.RefObject<HTMLInputElement>) => {
  if (!bidInputRef.current || !bidInputRef.current.value) {
    return 0;
  }
  return +bidInputRef.current.value / LAMPORTS_PER_SOL;
};

//   const { send: placeBid, state: placeBidState } = useContractFunction(
//     nounsAuctionHouseContract,
//     AuctionHouseContractFunction.createBid,
//   );
//   const { send: settleAuction, state: settleAuctionState } = useContractFunction(
//     nounsAuctionHouseContract,
//     AuctionHouseContractFunction.settleCurrentAndCreateNewAuction,
//   );

const Bid = () => {
  // const minBidIncPercentage = 0.2;
  // const minBid = 0;
  // // const activeAccount = useAppSelector(state => state.account.activeAccount);
  // // const { library } = useEthers();
  // const { auction, auctionEnded } = props;
  // // const nounsAuctionHouseContract = new NounsAuctionHouseFactory().attach(
  // //   config.addresses.nounsAuctionHouseProxy,
  // // );

  // // const account = useAppSelector(state => state.account.activeAccount);

  // const bidInputRef = useRef<HTMLInputElement>(null);

  // const [bid--input, setBidInput] = useState('');
  // const [bidButtonContent, setBidButtonContent] = useState({
  //   loading: false,
  //   content: auctionEnded ? 'Settle' : 'Bid',
  // });

  // // const dispatch = useAppDispatch();
  // // const setModal = useCallback((modal: AlertModal) => dispatch(setAlertModal(modal)), [dispatch]);

  // // const minBidIncPercentage = useAuctionMinBidIncPercentage();
  // // const minBid = computeMinimumNextBid(
  // //   auction && new auction.amount.toString()),
  // //   minBidIncPercentage,
  // // );

  // const bidInputHandler = (event: ChangeEvent<HTMLInputElement>) => {
  //   const input = event.target.value;

  //   // disable more than 2 digits after decimal point
  //   if (input.includes('.') && event.target.value.split('.')[1].length > 2) {
  //     return;
  //   }

  //   setBidInput(event.target.value);
  // };

  // const placeBidHandler = async () => {
  //   if (!auction || !bidInputRef.current || !bidInputRef.current.value) {
  //     return;
  //   }

  //   // if (currentBid(bidInputRef).isLessThan(minBid)) {
  //     // setModal({
  //     //   show: true,
  //     //   title: 'Insufficient bid amount 🤏',
  //     //   message: `Please place a bid higher than or equal to the minimum bid amount of ${minBidSol(
  //     //     minBid,
  //     //   )} ETH.`,
  //     // });
  //     // setBidInput(minBidSol(minBid));
  //     // return;
  //   // }

  //   // TODO: actually place bid
  // };

  // const settleAuctionHandler = () => {
  //   // settleAuction();
  //   return;
  // };

  // const clearBidInput = () => {
  //   if (bidInputRef.current) {
  //     bidInputRef.current.value = '';
  //   }
  // };

  // // // successful bid using redux store state
  // // useEffect(() => {
  // //   if (!account) return;

  // //   // tx state is mining
  // //   const isMiningUserTx = placeBidState.status === 'Mining';
  // //   // allows user to rebid against themselves so long as it is not the same tx
  // //   const isCorrectTx = currentBid(bidInputRef).isEqualTo(new BigNumber(auction.amount.toString()));
  // //   if (isMiningUserTx && auction.bidder === account && isCorrectTx) {
  // //     placeBidState.status = 'Success';
  // //     // setModal({
  // //     //   title: 'Success',
  // //     //   message: `Bid was placed successfully!`,
  // //     //   show: true,
  // //     // });
  // //     // setBidButtonContent({ loading: false, content: 'Bid' });
  // //     clearBidInput();
  // //   }
  // // }, [auction, placeBidState, account]); // setModal

  // // // placing bid transaction state hook
  // // useEffect(() => {
  // //   switch (!auctionEnded && placeBidState.status) {
  // //     case 'None':
  // //       setBidButtonContent({
  // //         loading: false,
  // //         content: 'Bid',
  // //       });
  // //       break;
  // //     case 'Mining':
  // //       setBidButtonContent({ loading: true, content: '' });
  // //       break;
  // //     case 'Fail':
  // //       setModal({
  // //         title: 'Transaction Failed',
  // //         message: placeBidState.errorMessage ? placeBidState.errorMessage : 'Please try again.',
  // //         show: true,
  // //       });
  // //       setBidButtonContent({ loading: false, content: 'Bid' });
  // //       break;
  // //     case 'Exception':
  // //       setModal({
  // //         title: 'Error',
  // //         message: placeBidState.errorMessage ? placeBidState.errorMessage : 'Please try again.',
  // //         show: true,
  // //       });
  // //       setBidButtonContent({ loading: false, content: 'Bid' });
  // //       break;
  // //   }
  // // }, [placeBidState, auctionEnded, setModal]);

  // // // settle auction transaction state hook
  // // useEffect(() => {
  // //   switch (auctionEnded && settleAuctionState.status) {
  // //     case 'None':
  // //       setBidButtonContent({
  // //         loading: false,
  // //         content: 'Settle Auction',
  // //       });
  // //       break;
  // //     case 'Mining':
  // //       setBidButtonContent({ loading: true, content: '' });
  // //       break;
  // //     case 'Success':
  // //       setModal({
  // //         title: 'Success',
  // //         message: `Settled auction successfully!`,
  // //         show: true,
  // //       });
  // //       setBidButtonContent({ loading: false, content: 'Settle Auction' });
  // //       break;
  // //     case 'Fail':
  // //       setModal({
  // //         title: 'Transaction Failed',
  // //         message: settleAuctionState.errorMessage
  // //           ? settleAuctionState.errorMessage
  // //           : 'Please try again.',
  // //         show: true,
  // //       });
  // //       setBidButtonContent({ loading: false, content: 'Settle Auction' });
  // //       break;
  // //     case 'Exception':
  // //       setModal({
  // //         title: 'Error',
  // //         message: settleAuctionState.errorMessage
  // //           ? settleAuctionState.errorMessage
  // //           : 'Please try again.',
  // //         show: true,
  // //       });
  // //       setBidButtonContent({ loading: false, content: 'Settle Auction' });
  // //       break;
  // //   }
  // // }, [settleAuctionState, auctionEnded, setModal]);

  // // if (!auction) return null;

  // // const isDisabled =
  // //   placeBidState.status === 'Mining' || settleAuctionState.status === 'Mining' || !activeAccount;

  return (
    <>
      {/* <div className="input--group">
        {!auctionEnded && (
          <div className="bid--input--container">
            <input
              aria-label="Example text with button addon"
              aria-describedby="basic-addon1"
              className="bid--input"
              type="number"
              min="0"
              onChange={bidInputHandler}
              ref={bidInputRef}
              value={bid--input}
            />
            <span className="custom--placeholder">SOL</span>
          </div>
        )}
        <button
          className='bid--button'
          onClick={auctionEnded ? settleAuctionHandler : placeBidHandler}
          disabled={false}
        >
          {bidButtonContent.loading ? <Spinner animation="border" /> : bidButtonContent.content}
        </button>
      </div>
      {!auctionEnded && (
        <p className="min--bid--copy">{`Minimum bid: ${minBidSol(minBid)} SOL`}</p>
      )} */}
      </>
  );
};
// {auctionEnded ? 'bid--button--auction--ended' : ''}

export default Bid;