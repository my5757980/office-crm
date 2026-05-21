import mongoose, { Schema, Document } from "mongoose";

export interface IUnitFinancial extends Document {
  unitId:       mongoose.Types.ObjectId;
  currency:     "JPY" | "USD";
  // JPY info fields
  lotNo:        string;
  auctionName:  string;
  // JPY breakdown fields (stored in JPY)
  buying:       number;
  domestic:     number;
  storage:      number;
  inspect:      number;
  repairs:      number;
  misc:         number;
  agencyFee:    number;
  freight:      number;
  dhl:          number;
  exchangeRate: number; // 1 USD = X JPY
  // USD direct
  costUSD:      number;
  // Computed & stored
  costOfUnitJPY: number;
  costOfUnitUSD: number;
  sellingPrice:  number;
  profit:        number;
  createdBy:    mongoose.Types.ObjectId;
  updatedAt:    Date;
}

const UnitFinancialSchema = new Schema<IUnitFinancial>(
  {
    unitId:       { type: Schema.Types.ObjectId, ref: "Unit", required: true, unique: true, index: true },
    currency:     { type: String, enum: ["JPY", "USD"], required: true },
    lotNo:        { type: String, default: "" },
    auctionName:  { type: String, default: "" },
    buying:       { type: Number, default: 0 },
    domestic:     { type: Number, default: 0 },
    storage:      { type: Number, default: 0 },
    inspect:      { type: Number, default: 0 },
    repairs:      { type: Number, default: 0 },
    misc:         { type: Number, default: 0 },
    agencyFee:    { type: Number, default: 0 },
    freight:      { type: Number, default: 0 },
    dhl:          { type: Number, default: 0 },
    exchangeRate: { type: Number, default: 0 },
    costUSD:      { type: Number, default: 0 },
    costOfUnitJPY: { type: Number, default: 0 },
    costOfUnitUSD: { type: Number, default: 0 },
    sellingPrice:  { type: Number, default: 0 },
    profit:        { type: Number, default: 0 },
    createdBy:    { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

const UnitFinancial =
  mongoose.models.UnitFinancial ||
  mongoose.model<IUnitFinancial>("UnitFinancial", UnitFinancialSchema);
export default UnitFinancial;
