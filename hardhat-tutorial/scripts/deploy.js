const { ethers } = require("hardhat");
require("dotenv").config({path: ".env"});
const {CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS } =  require("../constants");

async function main() {
  const cryptoDevTokenAddress = CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS;
  /**
   * A contractFactory in ethers.js is an abstraction used to deploy new smart contracts,
   * so exchangeContract here is a factory for instances of out Exchange contract
   */
  const exchangeContract = await ethers.getContractFactory("Exchange");

  // here we deploy the contract
  const deployedExchangeContract = await exchangeContract.deploy(
    cryptoDevTokenAddress 
  );
  await deployedExchangeContract.deployed();

  // print the address od the deployed contract
  console.log("Exchange Contract Address:", deployedExchangeContract.address);
}

// call the main function and catch if there is any error
main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
});