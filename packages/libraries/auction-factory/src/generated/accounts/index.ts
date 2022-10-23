export * from './Auction'
export * from './AuctionFactory'
export * from './Bid'

import { AuctionFactory } from './AuctionFactory'
import { Auction } from './Auction'
import { Bid } from './Bid'

export const accountProviders = { AuctionFactory, Auction, Bid }
