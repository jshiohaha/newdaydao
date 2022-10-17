export * from './Auction'
export * from './AuctionFactory'
export * from './Bid'
export * from './Config'

import { AuctionFactory } from './AuctionFactory'
import { Auction } from './Auction'
import { Bid } from './Bid'
import { Config } from './Config'

export const accountProviders = { AuctionFactory, Auction, Bid, Config }
