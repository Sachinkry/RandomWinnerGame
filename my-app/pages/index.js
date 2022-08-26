import Head from 'next/head'
import styles from '../styles/Home.module.css'
import { BigNumber, Contract, providers, utils, ethers } from "ethers"
import Web3Modal from "web3modal"
import React, { useState, useEffect, useRef } from 'react'
import { RANDOM_GAME_NFT_CONTRACT_ADDRESS, abi } from '../constants'
import { FETCH_CREATED_GAME } from '../queries'
import { subgraphQuery } from '../utils'

export default function Home() {
  const zero = BigNumber.from("0");
  const web3ModalRef = useRef();
  const [walletConnected, setWalletConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [entryFee, setEntryFee] = useState(zero);
  const [maxPlayers, setMaxPlayers] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [players, setPlayers] = useState([]);
  const [winner, setWinner] = useState();
  const [logs, setLogs] = useState([]);

  const forceUpdate = React.useReducer(() => ({}), {})[1];

  const getProviderOrSigner = async (needSigner = false) => {
    try {
      const provider = await web3ModalRef.current.connect();
      const web3Provider = new providers.Web3Provider(provider);
      const { chainId } = await web3Provider.getNetwork();
      if (chainId !== 80001) {
        window.alert("You are not on Mumbai testnet");
        throw new Error("CHANGE TO POLYGON MUMBAI TESTNET!");
      }

      if (needSigner) {
        const signer = web3Provider.getSigner();
        return signer;
      }
      return web3Provider;

    } catch (error) {
      console.error(error);
    }
  }

  /**
   * startGame: let the owner of the contract to start a game
   */
  const startGame = async () => {
    try {
      // get the signer because we need to sign a transaction
      const signer = await getProviderOrSigner(true);
      // create randomWinnerGame contract instance 
      const randomGameContract = new Contract(
        RANDOM_GAME_NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      const txn = await randomGameContract.startGame(maxPlayers, entryFee);
      setLoading(true);
      await txn.wait();
      setLoading(false);

    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  /**
   * joinGame: it is called by a player who wants to join a game
   */
  const joinGame = async () => {
    try {
      // get the signer because we need to sign a transaction
      const signer = await getProviderOrSigner(true);
      // create randomWinnerGame contract instance 
      const randomGameContract = new Contract(
        RANDOM_GAME_NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      const txn = await randomGameContract.joinGame({
        value: entryFee,
      });
      setLoading(true);
      await txn.wait();
      setLoading(false);

    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  /**
   * checkIfGameStarted: checks if the game has started or not and initializes the logs of the game
   */
  // const checkIfGameStarted = async () => {
  //   try {
  //     const provider = await getProviderOrSigner();
  //     const randomGameContract = new Contract(
  //       RANDOM_GAME_NFT_CONTRACT_ADDRESS,
  //       abi,
  //       provider
  //     );
  //     // read the gameStarted boolean value from the contract
  //     const _gameStarted = await randomGameContract.gameStarted();

  //     const _gameArray = await subgraphQuery(FETCH_CREATED_GAME());
  //     const _game = _gameArray.games[0];
  //     let _logs = [];
  //     // initialize the logs array and query the graph for current gameId

  //     if (_gameStarted) {
  //       _logs = [`Game has started with ID: ${_game.id}`];
  //       if (_game.players && _game.players.length > 0) {
  //         _logs.push(
  //           `${_game.players.length} / ${_game.maxPlayers} already joined 👀`
  //         );

  //         _game.players.forEach(player => {
  //           _logs.push(`${player} joined 🏃‍♂️`);
  //         });
  //       }
  //       setEntryFee(BigNumber.from(_game.entryFee));
  //       setMaxPlayers(_game.maxPlayers);
  //     } else if (!gameStarted && _game.winner) {
  //       _logs = [
  //         `Last game has ended with ID: ${_game.id}`,
  //         `Winner is ${_game.winner} 🎉`,
  //         `Waiting for host to start new game....`
  //       ];
  //       setWinner(_game.winner);
  //     }

  //     setLogs(_logs);
  //     setPlayers(_game.players);
  //     setGameStarted(_gameStarted);
  //     forceUpdate();
  //   } catch (err) {
  //     console.error(err);
  //   }
  // }
  const checkIfGameStarted = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // No need for the Signer here, as we are only reading state from the blockchain
      const provider = await getProviderOrSigner();
      // We connect to the Contract using a Provider, so we will only
      // have read-only access to the Contract
      const randomGameNFTContract = new Contract(
        RANDOM_GAME_NFT_CONTRACT_ADDRESS,
        abi,
        provider
      );
      // read the gameStarted boolean from the contract
      const _gameStarted = await randomGameNFTContract.gameStarted();

      const _gameArray = await subgraphQuery(FETCH_CREATED_GAME());
      const _game = _gameArray.games[0];
      let _logs = [];
      // Initialize the logs array and query the graph for current gameID
      if (_gameStarted) {
        _logs = [`Game has started with ID: ${_game.id}`];
        if (_game.players && _game.players.length > 0) {
          _logs.push(
            `${_game.players.length} / ${_game.maxPlayers} already joined 👀 `
          );
          _game.players.forEach((player) => {
            _logs.push(`${player} joined 🏃‍♂️`);
          });
        }
        setEntryFee(BigNumber.from(_game.entryFee));
        setMaxPlayers(_game.maxPlayers);
      } else if (!gameStarted && _game.winner) {
        _logs = [
          `Last game has ended with ID: ${_game.id}`,
          `Winner is: ${_game.winner} 🎉 `,
          `Waiting for host to start new game....`,
        ];

        setWinner(_game.winner);
      }
      setLogs(_logs);
      setPlayers(_game.players);
      setGameStarted(_gameStarted);
      forceUpdate();
    } catch (error) {
      console.error(error);
    }
  };

  /**
   * getOwner: get the owner of the contract 
   */
  const getOwner = async () => {
    try {
      const provider = await getProviderOrSigner();
      const randomGameContract = new Contract(
        RANDOM_GAME_NFT_CONTRACT_ADDRESS,
        abi,
        provider
      );
      // call the owner function from the contract
      const _owner = await randomGameContract.owner();
      // get the signer
      const signer = await getProviderOrSigner(true);
      // get the address 
      const address = await signer.getAddress();

      if (address.toLowerCase() == _owner.toLowerCase()) {
        setIsOwner(true);
      }
      console.log(isOwner, _owner);
    } catch (err) {
      console.error(err);
    }
  }
  getOwner();

  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "mumbai",
        disableInjectedProvider: false,
        providerOptions: {}
      });
      connectWallet();
      getOwner();
      checkIfGameStarted();
      console.log(getOwner());
      setInterval(() => {
        checkIfGameStarted();
      }, 2000);

    }
  }, [walletConnected])

  const renderButton = () => {
    // If wallet is not connected, return a button which allows them to connect their wllet
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
    // Render when the game has started
    if (gameStarted) {
      if (players.length === maxPlayers) {
        return (
          <button className={styles.button} disabled>
            Choosing winner...
          </button>
        );
      }
      return (
        <div>
          <button className={styles.button} onClick={joinGame}>
            Join Game 🚀
          </button>
        </div>
      );
    }
    // Start the game
    if (isOwner && !gameStarted) {
      return (
        <div>
          <input
            type="number"
            className={styles.input}
            onChange={(e) => {
              // The user will enter the value in ether, we will need to convert
              // it to WEI using parseEther
              setEntryFee(
                e.target.value >= 0
                  ? utils.parseEther(e.target.value.toString())
                  : zero
              );
            }}
            placeholder="Entry Fee (ETH)"
          />
          <input
            type="number"
            className={styles.input}
            onChange={(e) => {
              // The user will enter the value in ether, we will need to convert
              // it to WEI using parseEther
              setMaxPlayers(e.target.value ?? 0);
            }}
            placeholder="Max players"
          />
          <button className={styles.button} onClick={startGame}>
            Start Game 🚀
          </button>
        </div>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>RandomWinnerGame</title>
        <meta name="description" content="RandomeWinnerGame-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Random Winner Game</h1>
          <div className={styles.description}>
            Its a lottery game where a winner is chosen at random and wins the
            entire lottery pool
          </div>
          {renderButton()}
          {logs &&
            logs.map((log, index) => (
              <div className={styles.log} key={index}>
                {log}
              </div>
            ))}
        </div>
        <div>
          <img className={styles.image} src="./randomWinner.png" />
        </div>
      </div>
      <footer className={styles.footer}>
        Made with &#10084; by Sachin!
      </footer>
    </div>
  )
}
