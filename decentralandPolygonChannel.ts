import { EPNSChannel } from "../../helpers/epnschannel";
import config from "../../config";
import { Logger } from "winston";
import { Inject, Service } from "typedi";
import decentralandSettings from "./decentralandSettings.json";
import { ethers } from "ethers";
import { decentralandModel } from "./decentralandModel";
import ERC20ABI from "./ERC20.json";
import bidAbi from "./ethereumBidABI.json";
import polygonMarketplaceABI from "./polygonMarketplaceABI.json";
import polygonbidABI from "./polygonBidABI.json";
import polygonMarketplaceABIV2 from "./polygonmarketplaceV2ABI.json";

@Service()
export default class DecentralandPolygonChannel extends EPNSChannel {
  URL_SPACE_PROPOSAL = "https://hub.snapshot.org/graphql";
  constructor(
    @Inject("logger") public logger: Logger,
    @Inject("cached") public cached
  ) {
    super(logger, {
      networkToMonitor: config.web3PolygonMainnetRPC,
      dirname: __dirname,
      name: "DECENTRALAND_POLYGON",
      url: "https://decentraland.org/",
      useOffChain: true,
      address: "0xBCAc4dafB7e215f2F6cb3312aF6D5e4F9d9E7eDA",
    });
  }

  async getBlockNumbers(simulate, contract: ethers.Contract) {
    const decentralandData = await this.getDecentralandDB();

    let fromBlockpolygonMarketPlace = simulate?.logicOverride?.mode
      ? simulate?.logicOverride?.fromBlock
      : decentralandData?.polygonMarketPlaceLatest ??
        (await contract.provider.getBlockNumber());

    let fromBlockpolygonMarketPlaceV2 = simulate?.logicOverride?.mode
      ? simulate?.logicOverride?.fromBlock
      : decentralandData?.polygonMarketplaceV2Latest ??
        (await contract.provider.getBlockNumber());

    let fromBlockpolygonBidLatest = simulate?.logicOverride?.mode
      ? simulate?.logicOverride?.fromBlock
      : decentralandData?.polygonBidLatest ??
        (await contract.provider.getBlockNumber());

    let toBlock = simulate?.logicOverride?.mode
      ? simulate?.logicOverride?.toBlock
      : await contract.provider.getBlockNumber();

    const result = {
      fromBlockpolygonBidLatest,
      fromBlockpolygonMarketPlace,
      fromBlockpolygonMarketPlaceV2,
      toBlock,
    };
    this.log(result);
    return result;
  }

  async getDecentralandDB() {
    this.logInfo("Getting data from Decentraland DB...");
    const data = await decentralandModel.findOne({ _id: "DECENTRALAND_DATA" });
    this.log("Data obtained");
    this.log(data);
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

  async polygonBidAccepted(simulate) {
    try {
      const polygonBidContract = await this.getContract(
        decentralandSettings.polygonBidContract,
        JSON.stringify(polygonbidABI)
      );
      const blockNos = await this.getBlockNumbers(
        simulate,
        polygonBidContract.contract
      );
      const events = await this.fetchBidAcceptedPolygonEvents(
        simulate,
        polygonBidContract.contract,
        blockNos
      );
      const startTime = this.timestamp;
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
          const title = `${name} NFT Bid accepted on polygon(matic) chain`;
          const message = `${name} NFT bid accepted with the price: ${value} having bidder: ${args._bidder}`;
          const payloadTitle = `${name} NFT Bid accepted on polygon(matic) chain`;
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
          polygonBidLatest: blockNos.toBlock,
        },
        {
          upsert: true,
        }
      );
    } catch (e) {
      this.logError(e);
    }
  }

  async polygonOrderSuccessfullV2(simulate) {
    try {
      const polygonMarketplaceContractV2 = await this.getContract(
        decentralandSettings.polygonMarketPlaceContractV2,
        JSON.stringify(polygonMarketplaceABIV2)
      );
      const blockNos = await this.getBlockNumbers(
        simulate,
        polygonMarketplaceContractV2.contract
      );
      const events = await this.fetchOrderSuccessfullEvtsPolygon(
        simulate,
        polygonMarketplaceContractV2.contract,
        blockNos,
        1
      );

      if (events) {
        events.forEach(async (event) => {
          const { args } = event;
          const contract = await this.getContract(
            args.nftAddress,
            JSON.stringify(ERC20ABI)
          );
          const name = await contract.contract.name();
          const value = ethers.utils.formatEther(
            ethers.BigNumber.from(args.totalPrice).toBigInt()
          );
          const title = `${name} NFT order successfull on polygon(matic) chain!`;
          const payloadTitle = `${name} NFT order successfull on polygon(matic) chain!`;
          const msg = `${name} NFT order successfully of ${value} matic, buyer is: ${args.buyer} and seller: ${args.seller}`;
          const payloadMsg = `${name} NFT order successfully of ${value} matic, buyer is: ${args.buyer} and seller: ${args.seller}`;
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
          polygonMarketplaceV2Latest: blockNos.toBlock,
        },
        {
          upsert: true,
        }
      );
    } catch (e) {
      this.logError(e);
    }
  }

  async polygonOrderSuccessfull(simulate) {
    try {
      const polygonMarketPlaceContract = await this.getContract(
        decentralandSettings.polygonMarketPlaceContract,
        JSON.stringify(polygonMarketplaceABI)
      );
      const blockNos = await this.getBlockNumbers(
        simulate,
        polygonMarketPlaceContract.contract
      );
      const events = await this.fetchOrderSuccessfullEvtsPolygon(
        simulate,
        polygonMarketPlaceContract.contract,
        blockNos,
        0
      );

      if (events) {
        events.forEach(async (event) => {
          const { args } = event;
          const contract = await this.getContract(
            args.nftAddress,
            JSON.stringify(ERC20ABI)
          );
          const name = await contract.contract.name();
          const value = ethers.utils.formatEther(
            ethers.BigNumber.from(args.totalPrice).toBigInt()
          );
          const title = `${name} NFT order successfull on polygon(matic) chain!`;
          const payloadTitle = `${name} NFT order successfull on polygon(matic) chain!`;
          const msg = `${name} NFT order successfully of ${value} matic, buyer is: ${args.buyer} and seller: ${args.seller}`;
          const payloadMsg = `${name} NFT order successfully of ${value} matic, buyer is: ${args.buyer} and seller: ${args.seller}`;
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
          polygonMarketPlaceLatest: blockNos.toBlock,
        },
        {
          upsert: true,
        }
      );
    } catch (e) {
      this.logError(e);
    }
  }

  async polygonBidCreated(simulate) {
    try {
      const BidContract = await this.getContract(
        decentralandSettings.polygonBidContract,
        JSON.stringify(polygonbidABI)
      );
      const blockNos = await this.getBlockNumbers(
        simulate,
        BidContract.contract
      );
      const events = await this.fetchBidCreatedPolygonEvents(
        simulate,
        BidContract.contract,
        blockNos
      );
      if (events) {
        events.forEach(async (event) => {
          const { args } = event;
          const tokenID = args._tokenId.toString();
          const value = ethers.utils.formatEther(
            ethers.BigNumber.from(args._price).toBigInt()
          );
          const tokenContract = await this.getContract(
            args._tokenAddress,
            JSON.stringify(ERC20ABI)
          );
          const name = await tokenContract.contract.name();
          const recipientAddress = await tokenContract.contract.ownerOf(
            tokenID
          );
          const title = `${name} NFT bid created on polygon(matic) chain!`;
          const payloadMsg = `${name} NFT bid created with the price: ${value} having bidder: ${args._bidder} on polygon chain`;
          const message = `${name} NFT bid created with the price: ${value} having bidder: ${args._bidder}`;
          const payloadTitle = `${name} NFT bid created on polygon(matic) chain!`;
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
          polygonBidLatest: blockNos.toBlock,
        },
        {
          upsert: true,
        }
      );
    } catch (e) {
      this.logError(e);
    }
  }

  async fetchOrderSuccessfullEvtsPolygon(
    simulate,
    polygonMarketplaceContract: ethers.Contract,
    blockNos: any,
    option: any
  ) {
    try {
      const filter = polygonMarketplaceContract.filters.OrderSuccessful();

      const toBlock = blockNos.toBlock;
      const fromBlock =
        option === 0
          ? blockNos.fromBlockpolygonMarketPlace
          : blockNos.fromBlockpolygonMarketPlaceV2;
      const events = await polygonMarketplaceContract.queryFilter(
        filter,
        fromBlock,
        toBlock
      );
      return events;
    } catch (e) {
      this.logError(e);
    }
  }

  async fetchBidCreatedPolygonEvents(
    simulate,
    bidContract: ethers.Contract,
    blockNos: any
  ) {
    try {
      const filter = bidContract.filters.BidCreated();
      const { fromBlockpolygonBidLatest, toBlock } = blockNos;
      const events = await bidContract.queryFilter(
        filter,
        fromBlockpolygonBidLatest,
        toBlock
      );
      return events;
    } catch (e) {
      this.logError(e);
    }
  }

  async fetchBidAcceptedPolygonEvents(
    simulate,
    bidContract: ethers.Contract,
    blockNos: any
  ) {
    try {
      const filter = bidContract.filters.BidAccepted();
      const { fromBlockpolygonBidLatest, toBlock } = blockNos;
      const events = await bidContract.queryFilter(
        filter,
        fromBlockpolygonBidLatest,
        toBlock
      );
      return events;
    } catch (e) {
      this.logError(e);
    }
  }
}
