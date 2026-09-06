import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';

async function main() {
  console.log("Connecting to local blockchain...");

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const signer = await provider.getSigner(0);

  // Correct path to ProofRegistry.json
  const artifactPath = path.resolve('./blockchain/artifacts/blockchain/contracts/ProofPointRegistry.sol/ProofRegistry.json');
  const contractJson = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const factory = new ethers.ContractFactory(contractJson.abi, contractJson.bytecode, signer);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  console.log(`ProofRegistry deployed to: ${deployedAddress}`);
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});