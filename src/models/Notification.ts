import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  message: string;
  type: "invoice_requested" | "invoice_approved" | "invoice_rejected" | "duplicate_lead";
  invoiceId?: mongoose.Types.ObjectId;
  leadId?:    mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    message:   { type: String, required: true },
    type: {
      type: String,
      enum: ["invoice_requested", "invoice_approved", "invoice_rejected", "duplicate_lead"],
      required: true,
    },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    leadId:    { type: Schema.Types.ObjectId, ref: "Lead" },
    read:      { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ createdAt: -1 });

const Notification =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
export default Notification;
