import mongoose, { Schema, Document } from "mongoose";
import type { DocumentFolder } from "./Unit";

export interface IUnitFile extends Document {
  unitId:    mongoose.Types.ObjectId;
  folder:    DocumentFolder;
  filename:  string;
  mimetype:  string;
  size:      number;
  data:      Buffer;
  uploadedAt: Date;
}

const UnitFileSchema = new Schema<IUnitFile>({
  unitId:     { type: Schema.Types.ObjectId, ref: "Unit", required: true, index: true },
  folder:     { type: String, required: true },
  filename:   { type: String, required: true },
  mimetype:   { type: String, required: true },
  size:       { type: Number, required: true },
  data:       { type: Buffer, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const UnitFile = mongoose.models.UnitFile || mongoose.model<IUnitFile>("UnitFile", UnitFileSchema);
export default UnitFile;
