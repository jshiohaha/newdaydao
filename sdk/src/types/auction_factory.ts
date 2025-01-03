export type AuctionFactory = {
  "version": "0.1.0",
  "name": "auction_factory",
  "instructions": [
    {
      "name": "mintToAuction",
      "accounts": [
        {
          "name": "mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMintAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "auctionFactory",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "auction",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "auctionFactoryBump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "auctionBump",
          "type": "u8"
        },
        {
          "name": "sequence",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createFirstAuction",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "auction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "auctionFactoryBump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "auctionBump",
          "type": "u8"
        },
        {
          "name": "sequence",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createNextAuction",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "currentAuction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "nextAuction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "auctionFactoryBump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "currentAuctionBump",
          "type": "u8"
        },
        {
          "name": "nextAuctionBump",
          "type": "u8"
        },
        {
          "name": "currentSeq",
          "type": "u64"
        },
        {
          "name": "nextSeq",
          "type": "u64"
        }
      ]
    },
    {
      "name": "supplyResourceToAuction",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "auctionFactory",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "auction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "masterEdition",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMetadataProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "auctionFactoryBump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "auctionBump",
          "type": "u8"
        },
        {
          "name": "configBump",
          "type": "u8"
        },
        {
          "name": "configSeed",
          "type": "string"
        },
        {
          "name": "sequence",
          "type": "u64"
        }
      ]
    },
    {
      "name": "placeBid",
      "accounts": [
        {
          "name": "bidder",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "leadingBidder",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "auction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "auctionFactoryBump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "auctionBump",
          "type": "u8"
        },
        {
          "name": "sequence",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "settleAuction",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "auction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "bidderTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "auctionTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMetadataProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bidderAccountBump",
          "type": "u8"
        },
        {
          "name": "auctionFactoryBump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "auctionBump",
          "type": "u8"
        },
        {
          "name": "sequence",
          "type": "u64"
        }
      ]
    },
    {
      "name": "closeAuctionTokenAccount",
      "accounts": [
        {
          "name": "payer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "auction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "auctionTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "auctionFactoryBump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "auctionBump",
          "type": "u8"
        },
        {
          "name": "sequence",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeAuctionFactory",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "treasury",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "config",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "configBump",
          "type": "u8"
        },
        {
          "name": "configSeed",
          "type": "string"
        },
        {
          "name": "data",
          "type": {
            "defined": "AuctionFactoryData"
          }
        }
      ]
    },
    {
      "name": "toggleAuctionFactoryStatus",
      "accounts": [
        {
          "name": "payer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        }
      ]
    },
    {
      "name": "modifyAuctionFactoryData",
      "accounts": [
        {
          "name": "payer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "data",
          "type": {
            "defined": "AuctionFactoryData"
          }
        }
      ]
    },
    {
      "name": "updateAuthority",
      "accounts": [
        {
          "name": "payer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "newAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        }
      ]
    },
    {
      "name": "updateTreasury",
      "accounts": [
        {
          "name": "payer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        }
      ]
    },
    {
      "name": "transferLamportsToTreasury",
      "accounts": [
        {
          "name": "payer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        }
      ]
    },
    {
      "name": "initializeConfig",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "maxSupply",
          "type": "u32"
        }
      ]
    },
    {
      "name": "addUrisToConfig",
      "accounts": [
        {
          "name": "payer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "auctionFactory",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "auctionFactoryBump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "configBump",
          "type": "u8"
        },
        {
          "name": "configSeed",
          "type": "string"
        },
        {
          "name": "configData",
          "type": {
            "vec": "string"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "auction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "sequence",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "startTime",
            "type": "u64"
          },
          {
            "name": "endTime",
            "type": "u64"
          },
          {
            "name": "finalizedEndTime",
            "type": "u64"
          },
          {
            "name": "settled",
            "type": "bool"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "bidder",
            "type": "publicKey"
          },
          {
            "name": "bidTime",
            "type": "u64"
          },
          {
            "name": "resource",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "bids",
            "type": {
              "vec": {
                "defined": "Bid"
              }
            }
          }
        ]
      }
    },
    {
      "name": "auctionFactory",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "seed",
            "type": "string"
          },
          {
            "name": "sequence",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "data",
            "type": {
              "defined": "AuctionFactoryData"
            }
          },
          {
            "name": "initializedAt",
            "type": "u64"
          },
          {
            "name": "activeSince",
            "type": "u64"
          },
          {
            "name": "treasury",
            "type": "publicKey"
          },
          {
            "name": "config",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "seed",
            "type": "string"
          },
          {
            "name": "maxSupply",
            "type": "u32"
          },
          {
            "name": "updateIdx",
            "type": "u32"
          },
          {
            "name": "isUpdated",
            "type": "bool"
          },
          {
            "name": "buffer",
            "type": {
              "vec": "string"
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "Bid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bidder",
            "type": "publicKey"
          },
          {
            "name": "updatedAt",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "AuctionFactoryData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "timeBuffer",
            "type": "u64"
          },
          {
            "name": "minBidPercentageIncrease",
            "type": "u64"
          },
          {
            "name": "minReservePrice",
            "type": "u64"
          },
          {
            "name": "duration",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "IncorrectOwner",
      "msg": "Account does not have correct owner!"
    },
    {
      "code": 6001,
      "name": "Uninitialized",
      "msg": "Account is not initialized!"
    },
    {
      "code": 6002,
      "name": "TokenAccountNotOwnedByWinningBidder",
      "msg": "Token account not owned by winning bidder"
    },
    {
      "code": 6003,
      "name": "MintMismatch",
      "msg": "Mint Mismatch!"
    },
    {
      "code": 6004,
      "name": "InactiveAuctionFactory",
      "msg": "Activate auction factory before performing such action."
    },
    {
      "code": 6005,
      "name": "TreasuryMismatch",
      "msg": "Treasury mismatch!"
    },
    {
      "code": 6006,
      "name": "AuctionFactoryUuidInvalidLengthError",
      "msg": "Uuid must be length 5"
    },
    {
      "code": 6007,
      "name": "ConfigUuidInvalidLengthError",
      "msg": "Uuid must be length 5"
    },
    {
      "code": 6008,
      "name": "ConfigElementTooShortError",
      "msg": "Config element too short. Config data elements must be at least 1 char in length."
    },
    {
      "code": 6009,
      "name": "ConfigElementTooLongError",
      "msg": "Config element too long. Must be less than max length!"
    },
    {
      "code": 6010,
      "name": "InsufficientConfigError",
      "msg": "Insufficient config error!"
    },
    {
      "code": 6011,
      "name": "InactiveAuction",
      "msg": "Auction is not in a state to perform such action."
    },
    {
      "code": 6012,
      "name": "AuctionResourceAlreadyExists",
      "msg": "Auction resource can only be generated once."
    },
    {
      "code": 6013,
      "name": "UnsettledAuction",
      "msg": "Must settle any ongoing auction before creating a new auction."
    },
    {
      "code": 6014,
      "name": "AuctionAlreadySettled",
      "msg": "Auction is already settled."
    },
    {
      "code": 6015,
      "name": "AuctionIsLive",
      "msg": "Auction is live and cannot be settled."
    },
    {
      "code": 6016,
      "name": "InvalidBidAmount",
      "msg": "Bid must be a non-negative, non-zero amount. Bid must also beat previous bid by some percent."
    },
    {
      "code": 6017,
      "name": "NoActiveAuction",
      "msg": "Cannot modify an auction that does not exist."
    },
    {
      "code": 6018,
      "name": "AuctionAddressMismatch",
      "msg": "Auction address mismatch."
    },
    {
      "code": 6019,
      "name": "AuctionsAlreadyInitialized",
      "msg": "Initialize auctions can only be called once."
    },
    {
      "code": 6020,
      "name": "BidderAlreadyWinning",
      "msg": "Bidder is already winning the auction"
    },
    {
      "code": 6021,
      "name": "WrongSettleAuctionEndpoint",
      "msg": "Wrong settle auction endpoint!"
    },
    {
      "code": 6022,
      "name": "AuctionHasNoResourceAvailable",
      "msg": "Must supply resource to auction before settling!"
    },
    {
      "code": 6023,
      "name": "NumericalOverflowError",
      "msg": "Numerical overflow error!"
    },
    {
      "code": 6024,
      "name": "NumericalUnderflowError",
      "msg": "Numerical underflow error!"
    },
    {
      "code": 6025,
      "name": "CheckedRemError",
      "msg": "Checked REM error"
    },
    {
      "code": 6026,
      "name": "NumericalDivisionError",
      "msg": "Numerical division error!"
    },
    {
      "code": 6027,
      "name": "NotAuthorized",
      "msg": "Account is not authorized to take such action."
    },
    {
      "code": 6028,
      "name": "PublicKeyMismatch",
      "msg": "Public key mismatch"
    },
    {
      "code": 6029,
      "name": "TokenTransferFailed",
      "msg": "Token transfer failed"
    },
    {
      "code": 6030,
      "name": "InsufficientAccountBalance",
      "msg": "Insufficient account balance!"
    },
    {
      "code": 6031,
      "name": "ForcedError",
      "msg": "Forced error"
    }
  ]
};

export const IDL: AuctionFactory = {
  "version": "0.1.0",
  "name": "auction_factory",
  "instructions": [
    {
      "name": "mintToAuction",
      "accounts": [
        {
          "name": "mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMintAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "auctionFactory",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "auction",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "auctionFactoryBump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "auctionBump",
          "type": "u8"
        },
        {
          "name": "sequence",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createFirstAuction",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "auction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "auctionFactoryBump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "auctionBump",
          "type": "u8"
        },
        {
          "name": "sequence",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createNextAuction",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "currentAuction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "nextAuction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "auctionFactoryBump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "currentAuctionBump",
          "type": "u8"
        },
        {
          "name": "nextAuctionBump",
          "type": "u8"
        },
        {
          "name": "currentSeq",
          "type": "u64"
        },
        {
          "name": "nextSeq",
          "type": "u64"
        }
      ]
    },
    {
      "name": "supplyResourceToAuction",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "auctionFactory",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "auction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "masterEdition",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMetadataProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "auctionFactoryBump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "auctionBump",
          "type": "u8"
        },
        {
          "name": "configBump",
          "type": "u8"
        },
        {
          "name": "configSeed",
          "type": "string"
        },
        {
          "name": "sequence",
          "type": "u64"
        }
      ]
    },
    {
      "name": "placeBid",
      "accounts": [
        {
          "name": "bidder",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "leadingBidder",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "auction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "auctionFactoryBump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "auctionBump",
          "type": "u8"
        },
        {
          "name": "sequence",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "settleAuction",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "auction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "bidderTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "auctionTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMetadataProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bidderAccountBump",
          "type": "u8"
        },
        {
          "name": "auctionFactoryBump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "auctionBump",
          "type": "u8"
        },
        {
          "name": "sequence",
          "type": "u64"
        }
      ]
    },
    {
      "name": "closeAuctionTokenAccount",
      "accounts": [
        {
          "name": "payer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "auction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "auctionTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "auctionFactoryBump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "auctionBump",
          "type": "u8"
        },
        {
          "name": "sequence",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeAuctionFactory",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "treasury",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "config",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "configBump",
          "type": "u8"
        },
        {
          "name": "configSeed",
          "type": "string"
        },
        {
          "name": "data",
          "type": {
            "defined": "AuctionFactoryData"
          }
        }
      ]
    },
    {
      "name": "toggleAuctionFactoryStatus",
      "accounts": [
        {
          "name": "payer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        }
      ]
    },
    {
      "name": "modifyAuctionFactoryData",
      "accounts": [
        {
          "name": "payer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "data",
          "type": {
            "defined": "AuctionFactoryData"
          }
        }
      ]
    },
    {
      "name": "updateAuthority",
      "accounts": [
        {
          "name": "payer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "newAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        }
      ]
    },
    {
      "name": "updateTreasury",
      "accounts": [
        {
          "name": "payer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        }
      ]
    },
    {
      "name": "transferLamportsToTreasury",
      "accounts": [
        {
          "name": "payer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "auctionFactory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        }
      ]
    },
    {
      "name": "initializeConfig",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "maxSupply",
          "type": "u32"
        }
      ]
    },
    {
      "name": "addUrisToConfig",
      "accounts": [
        {
          "name": "payer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "auctionFactory",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "auctionFactoryBump",
          "type": "u8"
        },
        {
          "name": "seed",
          "type": "string"
        },
        {
          "name": "configBump",
          "type": "u8"
        },
        {
          "name": "configSeed",
          "type": "string"
        },
        {
          "name": "configData",
          "type": {
            "vec": "string"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "auction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "sequence",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "startTime",
            "type": "u64"
          },
          {
            "name": "endTime",
            "type": "u64"
          },
          {
            "name": "finalizedEndTime",
            "type": "u64"
          },
          {
            "name": "settled",
            "type": "bool"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "bidder",
            "type": "publicKey"
          },
          {
            "name": "bidTime",
            "type": "u64"
          },
          {
            "name": "resource",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "bids",
            "type": {
              "vec": {
                "defined": "Bid"
              }
            }
          }
        ]
      }
    },
    {
      "name": "auctionFactory",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "seed",
            "type": "string"
          },
          {
            "name": "sequence",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "data",
            "type": {
              "defined": "AuctionFactoryData"
            }
          },
          {
            "name": "initializedAt",
            "type": "u64"
          },
          {
            "name": "activeSince",
            "type": "u64"
          },
          {
            "name": "treasury",
            "type": "publicKey"
          },
          {
            "name": "config",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "seed",
            "type": "string"
          },
          {
            "name": "maxSupply",
            "type": "u32"
          },
          {
            "name": "updateIdx",
            "type": "u32"
          },
          {
            "name": "isUpdated",
            "type": "bool"
          },
          {
            "name": "buffer",
            "type": {
              "vec": "string"
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "Bid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bidder",
            "type": "publicKey"
          },
          {
            "name": "updatedAt",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "AuctionFactoryData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "timeBuffer",
            "type": "u64"
          },
          {
            "name": "minBidPercentageIncrease",
            "type": "u64"
          },
          {
            "name": "minReservePrice",
            "type": "u64"
          },
          {
            "name": "duration",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "IncorrectOwner",
      "msg": "Account does not have correct owner!"
    },
    {
      "code": 6001,
      "name": "Uninitialized",
      "msg": "Account is not initialized!"
    },
    {
      "code": 6002,
      "name": "TokenAccountNotOwnedByWinningBidder",
      "msg": "Token account not owned by winning bidder"
    },
    {
      "code": 6003,
      "name": "MintMismatch",
      "msg": "Mint Mismatch!"
    },
    {
      "code": 6004,
      "name": "InactiveAuctionFactory",
      "msg": "Activate auction factory before performing such action."
    },
    {
      "code": 6005,
      "name": "TreasuryMismatch",
      "msg": "Treasury mismatch!"
    },
    {
      "code": 6006,
      "name": "AuctionFactoryUuidInvalidLengthError",
      "msg": "Uuid must be length 5"
    },
    {
      "code": 6007,
      "name": "ConfigUuidInvalidLengthError",
      "msg": "Uuid must be length 5"
    },
    {
      "code": 6008,
      "name": "ConfigElementTooShortError",
      "msg": "Config element too short. Config data elements must be at least 1 char in length."
    },
    {
      "code": 6009,
      "name": "ConfigElementTooLongError",
      "msg": "Config element too long. Must be less than max length!"
    },
    {
      "code": 6010,
      "name": "InsufficientConfigError",
      "msg": "Insufficient config error!"
    },
    {
      "code": 6011,
      "name": "InactiveAuction",
      "msg": "Auction is not in a state to perform such action."
    },
    {
      "code": 6012,
      "name": "AuctionResourceAlreadyExists",
      "msg": "Auction resource can only be generated once."
    },
    {
      "code": 6013,
      "name": "UnsettledAuction",
      "msg": "Must settle any ongoing auction before creating a new auction."
    },
    {
      "code": 6014,
      "name": "AuctionAlreadySettled",
      "msg": "Auction is already settled."
    },
    {
      "code": 6015,
      "name": "AuctionIsLive",
      "msg": "Auction is live and cannot be settled."
    },
    {
      "code": 6016,
      "name": "InvalidBidAmount",
      "msg": "Bid must be a non-negative, non-zero amount. Bid must also beat previous bid by some percent."
    },
    {
      "code": 6017,
      "name": "NoActiveAuction",
      "msg": "Cannot modify an auction that does not exist."
    },
    {
      "code": 6018,
      "name": "AuctionAddressMismatch",
      "msg": "Auction address mismatch."
    },
    {
      "code": 6019,
      "name": "AuctionsAlreadyInitialized",
      "msg": "Initialize auctions can only be called once."
    },
    {
      "code": 6020,
      "name": "BidderAlreadyWinning",
      "msg": "Bidder is already winning the auction"
    },
    {
      "code": 6021,
      "name": "WrongSettleAuctionEndpoint",
      "msg": "Wrong settle auction endpoint!"
    },
    {
      "code": 6022,
      "name": "AuctionHasNoResourceAvailable",
      "msg": "Must supply resource to auction before settling!"
    },
    {
      "code": 6023,
      "name": "NumericalOverflowError",
      "msg": "Numerical overflow error!"
    },
    {
      "code": 6024,
      "name": "NumericalUnderflowError",
      "msg": "Numerical underflow error!"
    },
    {
      "code": 6025,
      "name": "CheckedRemError",
      "msg": "Checked REM error"
    },
    {
      "code": 6026,
      "name": "NumericalDivisionError",
      "msg": "Numerical division error!"
    },
    {
      "code": 6027,
      "name": "NotAuthorized",
      "msg": "Account is not authorized to take such action."
    },
    {
      "code": 6028,
      "name": "PublicKeyMismatch",
      "msg": "Public key mismatch"
    },
    {
      "code": 6029,
      "name": "TokenTransferFailed",
      "msg": "Token transfer failed"
    },
    {
      "code": 6030,
      "name": "InsufficientAccountBalance",
      "msg": "Insufficient account balance!"
    },
    {
      "code": 6031,
      "name": "ForcedError",
      "msg": "Forced error"
    }
  ]
};
