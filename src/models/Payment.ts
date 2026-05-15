import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
  invoiceId: mongoose.Types.ObjectId;
  sellingPrice: number;
  amountReceived: number;
  receivedDate: Date;
  exchangeRate: number;
  yenAmount: number;
  recordedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    invoiceId:      { type: Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    sellingPrice:   { type: Number, required: true },
    amountReceived: { type: Number, required: true },
    receivedDate:   { type: Date,   required: true },
    exchangeRate:   { type: Number, required: true },
    yenAmount:      { type: Number, required: true },
    recordedBy:     { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PaymentSchema.index({ createdAt: -1 });

const Payment = mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);
export default Payment;
