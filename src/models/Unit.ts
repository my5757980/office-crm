import mongoose, { Schema, Document } from "mongoose";

export const DOCUMENT_FOLDERS = [
  "Auction Details/Pics",
  "Export Certificate",
  "Yard Pictures",
  "Inspection Certificate",
  "BL / Surrender",
  "DHL",
] as const;

export type DocumentFolder = (typeof DOCUMENT_FOLDERS)[number];

export interface IUnit extends Document {
  paymentId?: mongoose.Types.ObjectId;
  invoiceId:  mongoose.Types.ObjectId;
  make:        string;
  carModel:    string;
  year:        number;
  color:       string;
  chassis:     string;
  engineCC:    number;
  drive:       string;
  fuel:        string;
  mileage:     number;
  transmission: string;
  steering:    string;
  doors:       number;
  seats:       number;
  location:    string;
  createdBy:   mongoose.Types.ObjectId;
  createdAt:   Date;
}

const UnitSchema = new Schema<IUnit>(
  {
    paymentId:    { type: Schema.Types.ObjectId, ref: "Payment", index: true },
    invoiceId:    { type: Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    make:         { type: String, required: true, trim: true },
    carModel:     { type: String, required: true, trim: true },
    year:         { type: Number, required: true },
    color:        { type: String, required: true, trim: true },
    chassis:      { type: String, required: true, trim: true },
    engineCC:     { type: Number, required: true },
    drive:        { type: String, required: true },
    fuel:         { type: String, required: true },
    mileage:      { type: Number, required: true },
    transmission: { type: String, required: true },
    steering:     { type: String, required: true },
    doors:        { type: Number, required: true },
    seats:        { type: Number, required: true },
    location:     { type: String, required: true, trim: true },
    createdBy:    { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Unit = mongoose.models.Unit || mongoose.model<IUnit>("Unit", UnitSchema);
export default Unit;
