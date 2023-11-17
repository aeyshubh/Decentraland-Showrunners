import { model, Schema, Document } from 'mongoose';

export interface IDecentralandSchema {
  etherMarketplaceLatest?: number;
  etherBidLatest?: number;
  polygonMarketPlaceLatest?: number;
  polygonBidLatest?: number;
  polygonMarketplaceV2Latest?: number;
}

const decentralandDB = new Schema<IDecentralandSchema>({
  _id: {
    type: String,
  },
  etherMarketplaceLatest: {
    type: Number,
  },
  etherBidLatest: {
    type: Number,
  },
  polygonMarketPlaceLatest: {
    type: Number,
  },
  polygonBidLatest: {
    type: Number,
  },
  polygonMarketplaceV2Latest: {
    type: Number,
  },
});

export const decentralandModel = model<IDecentralandSchema>('decentralandDB', decentralandDB);
