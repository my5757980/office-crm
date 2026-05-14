import mongoose, { Schema, Document } from "mongoose";

export interface ILead extends Document {
  customerName: string;
  contactPerson: string;
  address?: string;
  phone: string;
  email?: string;
  country: string;
  countryCode: string;
  port: string;
  status: "new" | "in_progress" | "closed" | "invoice_requested" | "invoiced";
  isCustomer: boolean;
  createdBy: mongoose.Types.ObjectId;
  duplicateAttemptBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    customerName: { type: String, trim: true, default: "" },
    contactPerson: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    country: { type: String, required: true },
    countryCode: { type: String, required: true },
    port: { type: String, required: true },
    status: {
      type: String,
      enum: ["new", "in_progress", "closed", "invoice_requested", "invoiced"],
      default: "new",
    },
    isCustomer: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    duplicateAttemptBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

LeadSchema.index({ country: 1 });
LeadSchema.index({ createdAt: -1 });

if (mongoose.models.Lead) delete (mongoose.models as Record<string, unknown>).Lead;
const Lead = mongoose.model<ILead>("Lead", LeadSchema);
export default Lead;
