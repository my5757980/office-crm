import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage extends Document {
  from: mongoose.Types.ObjectId;
  to:   mongoose.Types.ObjectId;
  text: string;
  read: boolean;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    from: { type: Schema.Types.ObjectId, ref: "User", required: true },
    to:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 2000 },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ChatMessageSchema.index({ from: 1, to: 1, createdAt: -1 });
ChatMessageSchema.index({ to: 1, read: 1 });

const ChatMessage = mongoose.models.ChatMessage || mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
export default ChatMessage;
