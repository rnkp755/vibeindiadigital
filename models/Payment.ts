import mongoose, { Document, Schema, Types } from 'mongoose';

export type PaymentStatus = 'pending' | 'needs_review' | 'completed' | 'verified' | 'failed';

export interface IPayment extends Document {
  email: string;
  plan: Types.ObjectId;
  amount: number;
  token: string;
  payment_status: PaymentStatus;
  qr_code: string;
  contact_no?: string;
  country_code?: string;
  coupon_code?: string;
  discount_applied?: number;
  screenshot_url?: string;
  ocr_extracted_text?: string;
  credits_granted?: number;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    payment_status: {
      type: String,
      enum: ['pending', 'needs_review', 'completed', 'verified', 'failed'] as PaymentStatus[],
      default: 'pending',
      required: true,
    },
    qr_code: {
      type: String,
      required: true,
    },
    contact_no: {
      type: String,
      trim: true,
    },
    country_code: {
      type: String,
      trim: true,
      default: '+91',
    },
    coupon_code: {
      type: String,
      trim: true,
    },
    discount_applied: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Cloudinary URL of the screenshot, set only when payment goes to needs_review
    screenshot_url: {
      type: String,
    },
    // Raw text extracted by Tesseract OCR from the payment screenshot
    ocr_extracted_text: {
      type: String,
    },
    // Credits that were actually granted to the user upon completion
    credits_granted: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'payments',
  }
);

// Compound index for querying a user's payments
PaymentSchema.index({ email: 1, payment_status: 1 });
PaymentSchema.index({ createdAt: -1 });

const Payment =
  (mongoose.models.Payment as mongoose.Model<IPayment>) ||
  mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment;
