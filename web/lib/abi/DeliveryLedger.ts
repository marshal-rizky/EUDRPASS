// GENERATED from contracts/src/DeliveryLedger.sol via `forge inspect DeliveryLedger abi --json`.
// Do not edit by hand. Regenerate whenever the contract changes.

export const deliveryLedgerAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "admin",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "registry_",
        "type": "address",
        "internalType": "contract PlotRegistry"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "COLLECTOR_ROLE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "DEFAULT_ADMIN_ROLE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "EXPORTER_ROLE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "assembleShipment",
    "inputs": [
      {
        "name": "deliveryIds",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "outputs": [
      {
        "name": "shipmentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "deliveredKg",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "deliveryCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getDelivery",
    "inputs": [
      {
        "name": "deliveryId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct DeliveryLedger.Delivery",
        "components": [
          {
            "name": "plotId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "season",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "kg",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "timestamp",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "collector",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "shipmentId",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRoleAdmin",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getShipment",
    "inputs": [
      {
        "name": "shipmentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct DeliveryLedger.Shipment",
        "components": [
          {
            "name": "exporter",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "createdAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "totalKg",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "deliveryIds",
            "type": "uint256[]",
            "internalType": "uint256[]"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getShipmentProof",
    "inputs": [
      {
        "name": "shipmentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "shipment",
        "type": "tuple",
        "internalType": "struct DeliveryLedger.Shipment",
        "components": [
          {
            "name": "exporter",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "createdAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "totalKg",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "deliveryIds",
            "type": "uint256[]",
            "internalType": "uint256[]"
          }
        ]
      },
      {
        "name": "lines",
        "type": "tuple[]",
        "internalType": "struct DeliveryLedger.ProofLine[]",
        "components": [
          {
            "name": "deliveryId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "delivery",
            "type": "tuple",
            "internalType": "struct DeliveryLedger.Delivery",
            "components": [
              {
                "name": "plotId",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "season",
                "type": "uint16",
                "internalType": "uint16"
              },
              {
                "name": "kg",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "timestamp",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "collector",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "shipmentId",
                "type": "uint256",
                "internalType": "uint256"
              }
            ]
          },
          {
            "name": "plot",
            "type": "tuple",
            "internalType": "struct PlotRegistry.Plot",
            "components": [
              {
                "name": "docCID",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "locationHash",
                "type": "bytes12",
                "internalType": "bytes12"
              },
              {
                "name": "hectaresE2",
                "type": "uint32",
                "internalType": "uint32"
              },
              {
                "name": "commodity",
                "type": "uint8",
                "internalType": "uint8"
              },
              {
                "name": "yieldRateUsed",
                "type": "uint32",
                "internalType": "uint32"
              },
              {
                "name": "capKg",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "registeredAt",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "revoked",
                "type": "bool",
                "internalType": "bool"
              },
              {
                "name": "cooperative",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "declarationId",
                "type": "string",
                "internalType": "string"
              }
            ]
          },
          {
            "name": "seasonDeliveredKg",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "grantRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "hasRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "recordDelivery",
    "inputs": [
      {
        "name": "plotId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "season",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "kg",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [
      {
        "name": "deliveryId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "registry",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract PlotRegistry"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "renounceRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "callerConfirmation",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "revokeRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "shipmentCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "supportsInterface",
    "inputs": [
      {
        "name": "interfaceId",
        "type": "bytes4",
        "internalType": "bytes4"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "unshippedDeliveries",
    "inputs": [
      {
        "name": "fromId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "toId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "ids",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "Delivered",
    "inputs": [
      {
        "name": "deliveryId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "plotId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "season",
        "type": "uint16",
        "indexed": true,
        "internalType": "uint16"
      },
      {
        "name": "kg",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "seasonTotalKg",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "collector",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleAdminChanged",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "previousAdminRole",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "newAdminRole",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleGranted",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleRevoked",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Shipped",
    "inputs": [
      {
        "name": "shipmentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "exporter",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "deliveryCount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "totalKg",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AccessControlBadConfirmation",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AccessControlUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "neededRole",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "DeliveryAlreadyShipped",
    "inputs": [
      {
        "name": "deliveryId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "shipmentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "EmptyShipment",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MassBalanceExceeded",
    "inputs": [
      {
        "name": "plotId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "attemptedTotal",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "capKg",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "PlotRevoked",
    "inputs": [
      {
        "name": "plotId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnknownDelivery",
    "inputs": [
      {
        "name": "deliveryId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnknownShipment",
    "inputs": [
      {
        "name": "shipmentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroQuantity",
    "inputs": []
  }
] as const;
