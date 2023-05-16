import { BigNumber, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import styles from "../styles/Home.module.css";
import { addLiquidity } from "@/utils/addLiquidity";
import {
  getCDTokensBalance,
  getEtherBalance,
  getLPTokensBalance,
  getReserveOfCDTokens,
  removeLiquidity,
} from "../utils/removeLiquidity";
import { swapTokens, getAmountOfTokensReceivedFromSwap } from "@/utils/swap";

export default function Home() {
  /**
   * General state variable
   */
  // Loadint is set to true when the transaction is mining and set to false when
  // the transaction has mined
  const [loading, setLoading] = useState(false);
  // We have two tabs in this dapp, liquidity Tab and Swap tab. This variable
  // keeps track of which Tab the user is on. If it is set to true this means 
  // that the user is an 'liquidity' tab else he is on the 'swap' tab
  const [liquidityTab, setLiquidityTab] = useState(true);
  // This variable is the '0' number in form of a BigNumber
  const zero = BigNumber.from(0);
  /**Variables to keep track of amount */
  // 'ethBalance' keeps track of the amount of 'Eth' held by the user's account
  const [ethBalance, setEtherBalance] = useState(zero);
  // 'reservedCD' keeps track of the Crypto Dev tokens Reserve balance in the Exchange contract
  const [reservedCD, setReservedCD] = useState(zero);
  // Keeps track of the ether balance in the contract
  const [etherBalanceContract, setEtherBalanceContract] = useState(zero);
  // cdBalance is the amount of 'CD' tokens help by the users account
  const [cdBalance, setCdBalance] = useState(zero);
  // 'lpBalance' is the amount of LP tokens held by the user's account
  const [lpBalance, setLpBalance] = useState(zero);
  /**Variables to keep track of liquidity to be added or removed */
  // addEther is the amount of Ether that the user wants to add to the liquidity
  const [addEther, setAddEther] = useState(zero);
  // addCdTokens keep track of the amount of CD tokens that the user wants to add to the liquidity
  // in case when there is no initial liquidity and after liquidity gets added it keeps track of the
  // CD tokens that the user can add given a certain amount of Ether
  const [addCDTokens, setAddCDTokens] = useState(zero);
  // removeEther is the amount of 'Ether' that would be sent back to the user based on a certain number of 'LP' tokens
  const [removeEther, setRemoveEther] = useState(zero);
  // removeCD is the amount of 'Crypto Dev' tokens that would be sent back to the user based on a certain number of LP tokens that he wants to withdraw
  const [removeCD, setRemoveCD] = useState(zero);
  // amount of LP tokens that the user wants to remove from liquidity
  const [removeLPTokens, setRemoveLPTokens] = useState("0");
  /** Variables to keep track of swap functionality */
  // Amount that the user wants to swap
  const [swapAmount, setSwapAmount] = useState("");
  // This keeps track of the number of tokens that the user would receive after a swap completes
  const [tokenToBeReceivedAfterSwap, setTokenToBeReceivedAfterSwap] = useState(zero);
  // Keeps track of whether 'Eth' or 'Crypto Dev' token is selected. If 'Eth' is selected it means that the user
  // wants to swap some 'Eth' for some 'Crypto Dev' tokens and vice versa if 'Eth' is not selected
  const [ethSelected, setEthSelected] = useState(true);
  /** Wallet connection */
  // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is opened
  const web3ModalRef = useRef();
  // walletConnected keep track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);

  /**
   * getAmounts call various functions to retrieve amounts for ethBalance,
   * LP tokens etc
   */
  const getAmounts = async () => {
    try {
      const provider = await getProviderOrSigner(false);
      const signer = await getProviderOrSigner(true);
      const address = await signer.getAddress();
      // get the amount of eth in the user's account
      const _ethBalance = await getEtherBalance(provider, address);
      // get the amount of 'Crypto Dev' tokens held by the user
      const _cdBalance = await getCDTokensBalance(provider, address);
      // get the amount of 'Crypto Dev' LP tokens held by the user
      const _lpBalance = await getLPTokensBalance(provider, address);
      // gets the amount of 'CD' tokens that are present in the reserve of the 'Exchange contract'
      const _reservedCD = await getReserveOfCDTokens(provider, address);
      // Get the ether reserves in the contract
      const _ethBalanceContract = await getEtherBalance(provider, null, true);
      setEtherBalance(_ethBalance);
      setCdBalance(_cdBalance);
      setLpBalance(_lpBalance);
      setReservedCD(_reservedCD);
      setEtherBalanceContract(_ethBalanceContract);
    } catch (err) {
      console.error(err);
    }
  };


  /****Swap functions *****/
  /**
   * swapTokens: Swaps 'swapAmountWei' of Eth/Crypto Dev tokens with 'tokenToBeReceivedAfterSwap' amount of Eth/Crypto dev tokens
   */
  const _swapTokens = async () => {
    try {
      // Convert the amount entered by the user to a BigNumber using the 'parseEther' library from 'ethers.js'
      const _swapAmountWei = ethers.utils.parseEther(swapAmount);
      //Check if the user entered zero
      // We are here using the 'eq' method from BigNumber class in 'ether.js'
      if (!_swapAmountWei.eq(zero)) {
        const signer = await getProviderOrSigner(true);
        setLoading(true);
        // Call the swapTokens functions from the 'utils' folder
        await swapTokens(
          signer,
          swapAmountWei,
          tokenToBeReceivedAfterSwap,
          ethSelected
        );
        setLoading(false);
        // Get all the updated ampunts after the swap
        await getAmounts();
        setSwapAmount("");
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setSwapAmount("");
    }
  };

  /**
   * _getAmountOfTokensReceivedFromSwap: Returns the number of Eth/Crypto Dev tokens that can be received
   * when the user swaps '_swapAmountWei' amount of Eth/Crypto Dev tokens
   */
  const _getAmountOfTokensReceivedFromSwap = async (_swapAmount) => {
    try {
      // Converet the amount entered by the user to a BigNumber using the 'parseEther' from the 'ethers.js'
      const _swapAmountWei = utils.parseEther(_swapAmount.toString());
      // Check if the user entered zero
      // We are here using the 'eq' method from BigNumber class in 'ether.js'
      if (!_swapAmountWei.eq(zero)) {
        const provider = await getProviderOrSigner();
        // Get the amount of Ether in the contract
        const _ethBalance = await getEtherBalance(provider, null, true);
        // Call the 'getAmountOfTokensReceivedFromSwap' from the utils folder
        const amountOfTokens = await getAmountOfTokensReceivedFromSwap(
          _swapAmountWei,
          provider,
          ethSelected,
          reservedCD
        );
        setTokenToBeReceivedAfterSwap(amountOfTokens);
      } else {
        setTokenToBeReceivedAfterSwap(zero);
      }
    } catch (err) {
      console.error(err);
    }
  };

  /*******YAY MOVING TO THE UI */

  /*********LIQUIDITY FUNCTIONS */
  /**
   * _addLiquidity helps add liquidity to the exchange,
   * If the user is adding initial liquidity, user decudes the ether and CD tokens he want to add to the exchange
   * If he is adding the liquidity after the initial liquidity has already been added
   * then we calculate the crypto dev tokens he can add, given the Eth he wants to add by keeping the ratios constant
   */
  const _addLiquidity = async () => {
    try {
      // Convert the ether amount entered by the user to BigNumber
      const addEtherWei = utils.parseEther(addEther.toString());
      // Check if the values are zero
      if (!addCDTokens.eq(zero) && !addEtherWei.eq(zero)) {
        const signer = await getProviderOrSigner(true);
        setLoading(true);
        // call the addLiquidity functions from the utils folder 
        await addLiquidity(signer, addCDTokens, addEtherWei);
        setLoading(false);
        // Reinitialize the CD tokens
        setAddCDTokens(zero);
        // Get amounts for all values after the liquidity has been added
        await getAmounts();
      } else {
        setAddCDTokens(zero);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setAddCDTokens(zero);
    }
  };

  /***RROOOOOKKKKKAAAAYYYYYYY in shaggy's voice*/

  /** REMOVE LIQUIDITY FUNCTIONS */

  /**
   * _removeLiquidity: Removes the 'removeLPTokensWei' amoung of LP tokens from
   * liquidity and also the calculated amount of 'ether' and 'CD' tokens
   */
  const _removeLiquidity = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      // Convert the LP tokens entered by the user to a BigNumber
      const removeLPTokensWei = utils.parseEther(removeLPTokens);
      setLoading(true);
      // Call the removeLiquidity funtion from the 'utils' folder
      await removeLiquidity(signer, removeLPTokensWei);
      setLoading(false);
      await getAmounts(false);
      setRemoveCD(zero);
      setRemoveEther(zero);
    } catch (err) {
      console.error(err);
      setLoading(false);
      setRemoveCD(zero);
      setRemoveEther(zero);
    }
  };

  /**
   * _getTokensAfterRemove: Calculates the amount of 'Ether' and 'CD' tokens
   * that would be returned back to user after he removes 'removeLPTokenWei' amount of LP tokens from the contract
   */
  const  _getTokensAfterRemove = async (_removeLPTokens) => {
    try {
      const provider = await getProviderOrSigner();
      // Convert the LP tokens entered by the user to a BigNumber
      const removeLPTokenWei = utils.parseEther(_removeLPTokens);
      // Get the Eth reserves within the exchange contract
      const _ethBalance = await getEtherBalance(provider, null, true);
      // get the crypto dev token reserves from the contract
      const cryptoDevTokenReserve = await getReserveOfCDTokens(provider);
      // call the getTokensAfterRemove from the utils folder
      const { _removeEther, _removeCD} = await getTokensAfterRemove(
        provider,
        removeLPTokenWei,
        _ethBalance,
        cryptoDevTokenReserve
      );
      setRemoveEther(_removeEther);
      setRemoveCD(_removeCD);
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * Connect wallet: Connects the metamask wallet
   */
  const connectWallet = async () => {
    try {
      // Get the provider from web3Modal, which in our case is Metamask
      // When used for the first time, it prompts the user to connect their wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Returns a provider or Signer object representing the Ethereum RPC with or
  // without the signing capabilities of Metamask attached
  /**
   * A 'Provider' is needed to interact with the blockchain - reading
   * transactions, reading balances, reading state, etc
   * 
   * A 'Signer' is a special type of Provider used in a case a 'write' transaction
   * needs to be made to the blockchain, which involves the connected account
   * needing to make a digital signature to authorize the transaction being sent
   * Metamask exposes a Signer API to allow your website to request signature from the user using signer functions
   * 
   * @param {*} needSigner - True if you need the signer, default false, otherwise
   */
  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to Metamask
    // Since we store 'web3Modal' as a reference, we need to access the 'current' value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Sepolia network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 11155111) {
      window.alert("Change the network to Sepolia")
      throw new Error("Change network to Sepolia");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  // useEffects are used to react to changes in state of the website
  // The array at the end of function call represents what state changes will trigger this effect
  // In this case, whenever the value of 'walletConnected' changes - this effect will be called
  useEffect(() => {
    // If wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
    if (!walletConnected) {
      // Assign a web3modal class to the reference object by setting its 'current' value
      // The 'current' value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: "sepolia",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getAmounts();
    }
  }, [walletConnected]);

  /**
   * renderButton: Returns a button based on the state of the dapp
   */

  const renderButton = () => {
    // If wallet is not connected, return a button which allows them to connect to their wallet
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    }

      // If we are currently waiting for something, return a loading button
      if (loading) {
        return <button className={styles.button}>Loading...</button>;
      }

    if (liquidityTab) {
      return (
        <div>
          <div className={styles.description}>
            You have:
            <br/>
            {utils.formatEther(ethBalance)} Ether
            <br/>
            {utils.formatEther(lpBalance)} Crypto Dev LP Tokens
          </div>
          <div>
            {/**If reserved CD is zero, render the state for liquidity where we ask the user how much initial liquidity
             * he wants to add else just render the state where liquidity is not zero and we calculate based on the 'Eth' amount
             * specified by the user how much 'CD' tokens can be added
             */}
            {utils.parseEther(reservedCD.toString()).eq(zero) ? (
              <div>
                <input type="number" placeholder="Amount of Ether" onChange={(e) => setAddEther(e.target.value || "0")} className={styles.input} />
                <input type="number" placeholder="Amount of CryptoDev Token" onChange={(e) => setAddCDTokens(BigNumber.from(utils.parseEther(e.target.value || "0"))
                )
              } className={styles.input} 
              />
              <button className={styles.button1} onClick={_addLiquidity}>
                add
              </button>
              </div>
            ) : (
              <div>
                <input type="number" placeholder="Amount of Ether" onChange={async (e) => {
                  setAddEther(e.target.value || "0");
                  // calculate the number of CD tokens that can be added given 'e.target.value' amount of Eth
                  const _addCDTokens = await calculateCD(
                    e.target.value || "0",
                    etherBalanceContract.
                    reservedCD
                  );
                  setAddCDTokens(_addCDTokens);
                }}
                className={styles.input}
                />
                <div className={styles.inputDiv}>
                  {/**Convert the BigNumber to string using the formatEther function from ether.js */}
                  {'You will need ${utils.formatEther(addCDTokens)} Crypto Dev Tokens'}
                </div>
                <button className={styles.button1} onClick={_addLiquidity}>
                  add
                </button>
              </div>
            )}
            <div>
              <input type="number" placeholder="Amount of LP tokens" onChange={async (e) => {
                setRemoveLPTokens(e.target.value || "0");
                // Calculate the amount of Ether and CD tokens that the user would receive
                // After he removes 'e.target.value' amount of 'LP' tokens
                await _getTokensAfterRemove(e.target.value || "0");
              }}
              className={styles.input}
              />
              <div className={styles.inputDiv}>
                {/** Convert the BigNumber to string using the formatEther function from ether.js */}
                {'You will get ${utils.formatEther(removeCD)} Crypto Dev Tokens and ${utils.formatEther(removeEther)} Eth'}
              </div>
              <button className={styles.button1} onClick={_removeLiquidity}>
                Remove
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div>
          <input type="number" placeholder="Amount" onChange={async (e) => {
            setSwapAmount(e.target.target.value || "");
            // Calculate the amount of tokens user would receive after the swap
            await _getAmountOfTokensReceivedFromSwap(e.target.value || "0");
          }}
          className={styles.input}
          value={swapAmount}
          />
          <select className={styles.select} name="dropdown" id="dropdown" onChange={async () => {
            setEthSelected(!ethSelected);
            // Initialize the values back to zero
            await _getAmountOfTokensReceivedFromSwap(0);
            setSwapAmount("");
          }}
          >
            <option value="eth">Ethereum</option>
            <option value="cryptoDevToken">Crypto Dev Token</option>
          </select>
          <br/>
          <div className={styles.inputDiv}>
            {/** Convert the BigNumber to string using the formatEther function from ether.js */}
            {ethSelected
              ? `You will get ${utils.formatEther(
                  tokenToBeReceivedAfterSwap
                )} Crypto Dev Tokens`
              : `You will get ${utils.formatEther(
                tokenToBeReceivedAfterSwap
                )} Eth`}
          </div>
          <button className={styles.button1} onClick={_swapTokens}>
            Swap
          </button>
        </div>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="Whitelist-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Aden Token Exchange</h1>
          <div className={styles.description}>
            Exchange Ethereum &#60;&#62; Aden Tokens
          </div>
          <div>
            <button className={styles.button} onClick={() => {
              setLiquidityTab(true);
            }}
            >
              Liquidity
            </button>
            <button className={styles.button} onClick={() => {
              setLiquidityTab(false);
            }}
            >
              Swap
            </button>
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="./cryptodev.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; By Ebbie Aden
      </footer>
    </div>
  );
}