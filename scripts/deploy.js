import { ethers } from "ethers";
import fs from "fs";

async function main() {
  console.log("Connecting to local blockchain...");
  // 1. Connect to the local Hardhat Node we just started
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  // 2. Use Hardhat's default Account #0 private key to deploy
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const wallet = new ethers.Wallet(privateKey, provider);

  // 3. Read the compiled contract details (ABI and Bytecode)
  console.log("Reading compiled contract artifacts...");
  const artifactPath = "./blockchain/artifacts/blockchain/contracts/ProofPointRegistry.sol/ProofPointRegistry.json";
  const artifactJson = fs.readFileSync(artifactPath, "utf8");
  const artifact = JSON.parse(artifactJson);

  // 4. Deploy the contract
  console.log("Deploying ProofPointRegistry...");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();
  
  // 5. Wait for it to be confirmed on our local blockchain
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("🎉 SUCCESS! Contract deployed perfectly at address:", address);
}

main().catch(console.error);