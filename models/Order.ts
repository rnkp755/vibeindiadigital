import mongoose, { Document, Model, Schema } from 'mongoose';

// ─── Status Entry ─────────────────────────────────────────────────────────────

export type OrderStatusValue =
  | 'unpaid'
  | 'pending'
  | 'verified'
  | 'in_progress'
  | 'completed';

export interface StatusEntry {
  status: OrderStatusValue;
  updated_at: Date;
}

const StatusEntrySchema = new Schema<StatusEntry>(
  {
    status: {
      type: String,
      enum: ['unpaid', 'pending', 'verified', 'in_progress', 'completed'],
      required: true,
    },
    updated_at: {
      type: Date,
      default: () => new Date(),
    },
  },
  { _id: false }
);

// ─── Track Metadata ───────────────────────────────────────────────────────────

export interface TrackMetadata {
  title: string;
  artist: string[];
}

const TrackMetadataSchema = new Schema<TrackMetadata>(
  {
    title: { type: String, required: true, trim: true },
    artist: { type: [String], required: true },
  },
  { _id: false }
);

// ─── Order Document ───────────────────────────────────────────────────────────

export interface IOrder {
  email: string;
  user_id: string; // Clerk user ID
  order_id: string;
  tracks: number;
  current_status: StatusEntry[];
  asset_url?: string;
  release_date?: Date;
  metadata: TrackMetadata[];
  rights_distribution: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IOrderDocument extends IOrder, Document {}

const OrderSchema = new Schema<IOrderDocument>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    order_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    tracks: {
      type: Number,
      required: true,
      min: 1,
    },
    current_status: {
      type: [StatusEntrySchema],
      default: [],
      validate: {
        validator: (arr: StatusEntry[]) => arr.length > 0,
        message: 'current_status must have at least one entry.',
      },
    },
    asset_url: {
      type: String,
      trim: true,
    },
    release_date: {
      type: Date,
    },
    metadata: {
      type: [TrackMetadataSchema],
      default: [],
    },
    rights_distribution: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Virtual: latest status ───────────────────────────────────────────────────

OrderSchema.virtual('latest_status').get(function (this: IOrderDocument) {
  if (!this.current_status || this.current_status.length === 0) return null;
  return this.current_status[this.current_status.length - 1];
});

// ─── Helper to push a new status entry ───────────────────────────────────────

OrderSchema.methods.pushStatus = function (
  this: IOrderDocument,
  status: OrderStatusValue
) {
  this.current_status.push({ status, updated_at: new Date() });
};

// ─── Export ───────────────────────────────────────────────────────────────────

const Order: Model<IOrderDocument> =
  mongoose.models.Order ??
  mongoose.model<IOrderDocument>('Order', OrderSchema);

export default Order;
