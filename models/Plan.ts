import mongoose, { Document, Model, Schema } from 'mongoose';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ICoupon {
  code: string;
  discount: number; // Percentage discount (0-100)
}

export interface IAvailablePlan extends Document {
  name: 'silver' | 'gold' | 'platinum';
  credits: number;
  amount: number; // Price in INR
  coupons: ICoupon[];
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const CouponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const AvailablePlanSchema = new Schema<IAvailablePlan>(
  {
    name: {
      type: String,
      enum: ['silver', 'gold', 'platinum'],
      required: true,
      unique: true,
      index: true,
    },
    credits: {
      type: Number,
      required: true,
      min: 1,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    coupons: {
      type: [CouponSchema],
      default: [],
    },
    features: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'available_plans',
  }
);

// ─── Model ────────────────────────────────────────────────────────────────────

// Prevent model re-compilation during hot reloads in development.
const AvailablePlan: Model<IAvailablePlan> =
  (mongoose.models.Plan as Model<IAvailablePlan>) ||
  mongoose.model<IAvailablePlan>('Plan', AvailablePlanSchema);

export default AvailablePlan;
