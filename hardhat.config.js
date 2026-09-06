export default {
  solidity: "0.8.20",
  paths: {
    sources: "./blockchain/contracts",
    artifacts: "./blockchain/artifacts",
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
};