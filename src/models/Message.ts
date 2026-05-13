import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  leadId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  message: string;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    message: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

MessageSchema.index({ createdAt: 1 });

const Message = mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
export default Message;
