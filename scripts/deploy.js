import hre from "hardhat";

async function main() {
  console.log("Starting deployment...");

  // 1. Deploy the KYC Registry
  const kyc = await hre.ethers.deployContract("KYCRegistry_Taha");
  await kyc.waitForDeployment();
  const kycAddress = await kyc.getAddress();
  
  console.log(`KYCRegistry deployed to: ${kycAddress}`);

  // 2. Deploy the Crowdfunding contract, passing the KYC address to it
  const crowdfunding = await hre.ethers.deployContract("Crowdfunding_Taha", [kycAddress]);
  await crowdfunding.waitForDeployment();
  const crowdfundingAddress = await crowdfunding.getAddress();
  
  console.log(`Crowdfunding deployed to: ${crowdfundingAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});