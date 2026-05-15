import mongoose, { Schema, Document } from "mongoose";

export interface IInvoice extends Document {
  leadId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  consignee: {
    name: string;
    address: string;
    phone: string;
    country: string;
    port: string;
  };
  unit: string;
  chassisNo: string;
  engineNo: string;
  color: string;
  year?: string;
  salesperson?: string;
  fuel?: string;
  transmission?: string;
  m3Rate: number;
  exchangeRate: number;
  pushPrice: number;
  cnfPrice: number;
  advancePercent: number;
  status: "pending" | "approved" | "rejected" | "sent";
  rejectionNote?: string;
  uploadedPdf?: { data: string; filename: string; uploadedAt: Date };
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    leadId:    { type: Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    approvedBy:{ type: Schema.Types.ObjectId, ref: "User" },
    consignee: {
      name:    { type: String, required: true, trim: true },
      address: { type: String, trim: true, default: "" },
      phone:   { type: String, required: true, trim: true },
      country: { type: String, required: true },
      port:    { type: String, required: true },
    },
    unit:         { type: String, required: true, trim: true },
    chassisNo:    { type: String, required: true, trim: true },
    engineNo:     { type: String, required: true, trim: true },
    color:        { type: String, required: true, trim: true },
    year:         { type: String, trim: true, default: "" },
    salesperson:  { type: String, trim: true, default: "" },
    fuel:         { type: String, trim: true, default: "" },
    transmission: { type: String, trim: true, default: "" },
    m3Rate:       { type: Number, required: true },
    exchangeRate: { type: Number, required: true },
    pushPrice:    { type: Number, required: true },
    cnfPrice:       { type: Number, required: true },
    advancePercent: { type: Number, required: true, default: 50 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "sent"],
      default: "pending",
    },
    rejectionNote: { type: String },
    uploadedPdf: {
      data:       { type: String },
      filename:   { type: String },
      uploadedAt: { type: Date },
    },
  },
  { timestamps: true }
);

InvoiceSchema.index({ createdAt: -1 });

if (mongoose.models.Invoice) delete (mongoose.models as Record<string, unknown>).Invoice;
const Invoice = mongoose.model<IInvoice>("Invoice", InvoiceSchema);
export default Invoice;
