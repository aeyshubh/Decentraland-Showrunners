import { EPNSChannel } from "../../helpers/epnschannel";
import config from "../../config";
import { Logger } from "winston";
import { Inject, Service } from "typedi";
import decentralandSettings from "./decentralandSettings.json";
import ethereumMarketplaceABI from "./ethereumMarketPlaceABI.json";
import { ethers } from "ethers";
import { decentralandModel } from "./decentralandModel";
import ERC20ABI from "./ERC20.json";
import bidAbi from "./ethereumBidABI.json";

@Service()
export default class DecentralandChannel extends EPNSChannel {
  URL_SPACE_PROPOSAL = "https://hub.snapshot.org/graphql";
  constructor(
    @Inject("logger") public logger: Logger,
    @Inject("cached") public cached
  ) {
    super(logger, {
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: "DECENTRALAND",
      url: "https://decentraland.org/",
      useOffChain: true,
      address: "0xBCAc4dafB7e215f2F6cb3312aF6D5e4F9d9E7eDA",
    });
  }

  async getBlockNumbers(simulate, contract: ethers.Contract) {
    const decentralandData = await this.getDecentralandDB();

    let fromBlocketherMarketPlace = simulate?.logicOverride?.mode
      ? simulate?.logicOverride?.fromBlock
      : decentralandData?.etherMarketplaceLatest ??
        (await contract.provider.getBlockNumber());

    let fromBlocketherBid = simulate?.logicOverride?.mode
      ? simulate?.logicOverride?.fromBlock
      : decentralandData?.etherBidLatest ??
        (await contract.provider.getBlockNumber());

    let toBlock = simulate?.logicOverride?.mode
      ? simulate?.logicOverride?.toBlock
      : await contract.provider.getBlockNumber();

    const result = {
      fromBlocketherMarketPlace,
      fromBlocketherBid,
      toBlock,
    };
    this.log(result);
    return result;
  }

  async bidCreated(simulate) {
    try {
      const bidContract = await this.getContract(
        decentralandSettings.ethereumBidContarct,
        JSON.stringify(bidAbi)
      );
      const blockNos = await this.getBlockNumbers(
        simulate,
        bidContract.contract
      );
      const events = await this.fetchBidCreatedEvents(
        simulate,
        bidContract.contract,
        blockNos
      );
      if (events) {
        events.forEach(async (event) => {
          const { args } = event;
          const value = ethers.utils.formatEther(
            ethers.BigNumber.from(args._price).toBigInt()
          );

          const tokenID = args._tokenId.toString();
          const tokenContract = await this.getContract(
            args._tokenAddress,
            JSON.stringify(ERC20ABI)
          );
          const name = await tokenContract.contract.name();
          const recipientAddress = await tokenContract.contract.ownerOf(
            tokenID
          );
          const title = `${name} NFT bid created!`;
          const payloadMsg = `${name} NFT bid created with the price: ${value} having bidder: ${args._bidder}`;
          const message = `${name} NFT bid created with the price: ${value} having bidder: ${args._bidder}`;
          const payloadTitle = `${name} NFT bid created!`;
          const notificationType = 3;
          this.sendNotification({
            recipient: recipientAddress,
            title,
            payloadMsg,
            payloadTitle,
            message,
            notificationType,
            simulate,
            image: null,
          });
        });
      }
      await decentralandModel.findByIdAndUpdate(
        {
          _id: "DECENTRALAND_DATA",
        },
        {
          etherBidLatest: blockNos.toBlock,
        },
        {
          upsert: true,
        }
      );
    } catch (e) {
      this.logError(e);
    }
  }

  async BidAccecpted(simulate) {
    try {
      const bidContract = await this.getContract(
        decentralandSettings.ethereumBidContarct,
        JSON.stringify(bidAbi)
      );
      const blockNos = await this.getBlockNumbers(
        simulate,
        bidContract.contract
      );
      const events = await this.fetchBidAcceptedEvents(
        simulate,
        bidContract.contract,
        blockNos
      );

      if (events) {
        events.forEach(async (event) => {
          const { args } = event;
          const value = ethers.utils.formatEther(
            ethers.BigNumber.from(args._price).toBigInt()
          );
          const tokenID = ethers.utils.formatEther(
            ethers.BigNumber.from(args._tokenId).toBigInt()
          );
          const tokenContract = await this.getContract(
            args._tokenAddress,
            JSON.stringify(ERC20ABI)
          );
          const name = await tokenContract.contract.name();
          const title = `${name} NFT Bid accepted`;
          const message = `${name} NFT bid accepted with the price: ${value} having bidder: ${args._bidder}`;
          const payloadTitle = `${name} NFT Bid accepted`;
          const payloadMsg = message;
          const notificationType = 3;
          this.sendNotification({
            recipient: args._bidder,
            title,
            payloadMsg,
            payloadTitle,
            message,
            notificationType,
            simulate,
            image: null,
          });
        });
      }
      await decentralandModel.findByIdAndUpdate(
        {
          _id: "DECENTRALAND_DATA",
        },
        {
          etherBidLatest: blockNos.toBlock,
        },
        {
          upsert: true,
        }
      );
    } catch (e) {
      this.logError(e);
    }
  }

  async orderExecutedSuccessfully(simulate) {
    try {
      const marketPlaceContract = await this.getContract(
        decentralandSettings.ethereumMarketplaceContract,
        JSON.stringify(ethereumMarketplaceABI)
      );
      const blockNos = await this.getBlockNumbers(
        simulate,
        marketPlaceContract.contract
      );
      const events = await this.fetchOrderSuccessfullEvents(
        simulate,
        marketPlaceContract.contract,
        blockNos
      );
      if (events) {
        events.forEach(async (event) => {
          const { args } = event;
          const erc20Contract = await this.getContract(
            args.nftAddress,
            JSON.stringify(ERC20ABI)
          );
          const name = await erc20Contract.contract.name();
          const value = ethers.utils.formatEther(
            ethers.BigNumber.from(args.totalPrice).toBigInt()
          );
          const title = `${name} NFT order successfull on Decentraland!`;
          const payloadTitle = `${name} NFT order successfull on Decentraland!`;
          const msg = `${name} NFT order successfully of ${value} price, buyer is: ${args.buyer} and seller: ${args.seller}`;
          const payloadMsg = `${name} NFT order successfully of ${value} price, buyer is: ${args.buyer} and seller: ${args.seller}`;
          const notificationType = 3;
          await this.sendNotification({
            recipient: args.seller, // still confusion
            title,
            message: msg,
            payloadMsg,
            payloadTitle,
            notificationType,
            simulate,
            image: null,
          });
        });
      }
      await decentralandModel.findByIdAndUpdate(
        {
          _id: "DECENTRALAND_DATA",
        },
        {
          etherMarketplaceLatest: blockNos.toBlock,
        },
        {
          upsert: true,
        }
      );
    } catch (e) {
      this.logError(e);
    }
  }

  async getDecentralandDB() {
    this.logInfo("Getting data from Decentraland DB...");
    const data = await decentralandModel.findOne({ _id: "DECENTRALAND_DATA" });
    this.log("Data obtained");
    return data;
  }

  async setDecentralandDB(data) {
    await decentralandModel.findByIdAndUpdate(
      { _id: "DECENTRALAND_DATA" },
      data,
      { upsert: true }
    );
    this.log("Decentraland DB updated");
  }

  async fetchOrderSuccessfullEvents(
    simulate,
    marketPlaceContract: ethers.Contract,
    blockNos: any
  ) {
    try {
      const filter = marketPlaceContract.filters.OrderSuccessful();
      const { fromBlocketherMarketPlace, toBlock } = blockNos;
      const evts = await marketPlaceContract.queryFilter(
        filter,
        fromBlocketherMarketPlace,
        toBlock
      );
      return evts;
    } catch (e) {
      this.logError(e);
    }
  }

  async fetchBidCreatedEvents(
    simulate,
    bidContract: ethers.Contract,
    blockNos: any
  ) {
    try {
      const filter = bidContract.filters.BidCreated();
      const { fromBlocketherBid, toBlock } = blockNos;
      const evts = await bidContract.queryFilter(
        filter,
        fromBlocketherBid,
        toBlock
      );
      return evts;
    } catch (e) {
      this.logError(e);
    }
  }

  async fetchBidAcceptedEvents(
    simulate,
    bidContract: ethers.Contract,
    blockNos: any
  ) {
    try {
      const filter = bidContract.filters.BidAccepted();
      const { fromBlocketherBid, toBlock } = blockNos;
      const evts = await bidContract.queryFilter(
        filter,
        fromBlocketherBid,
        toBlock
      );
      return evts;
    } catch (e) {
      this.logError(e);
    }
  }
}
