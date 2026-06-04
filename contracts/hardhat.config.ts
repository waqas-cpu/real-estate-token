import { HardhatUserConfig } from 'hardhat/config';

import '@nomicfoundation/hardhat-toolbox';

import * as dotenv from 'dotenv';



dotenv.config({ path: '../backend/.env' });

dotenv.config({ path: '.env' });



const deployerKey = process.env.DEPLOYER_PRIVATE_KEY ?? '';

const sepoliaRpc = process.env.SEPOLIA_RPC_URL ?? process.env.VITE_ETHEREUM_RPC ?? '';



const config: HardhatUserConfig = {

  solidity: {

    compilers: [

      {
        version: '0.8.17',
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
      {
        version: '0.8.20',
        settings: { optimizer: { enabled: true, runs: 200 } },
      },

    ],

  },

  paths: {

    sources: './src',

    artifacts: './artifacts',

    cache: './cache',

  },

  networks: {

    hardhat: {},

    sepolia: {

      url: sepoliaRpc || 'https://rpc.sepolia.org',

      accounts: deployerKey ? [deployerKey] : [],

      chainId: 11155111,

    },

  },

  etherscan: {

    apiKey: process.env.ETHERSCAN_API_KEY ?? '',

  },

};



export default config;

