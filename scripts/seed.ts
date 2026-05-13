import mongoose from "mongoose";
import bcryptjs from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI!;

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,
  role: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const LeadSchema = new mongoose.Schema({
  customerName: String,
  contactPerson: String,
  phone: String,
  country: String,
  countryCode: String,
  port: String,
  status: { type: String, default: "new" },
  createdBy: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const InvoiceSchema = new mongoose.Schema({
  leadId: mongoose.Schema.Types.ObjectId,
  createdBy: mongoose.Schema.Types.ObjectId,
  approvedBy: mongoose.Schema.Types.ObjectId,
  consignee: { name: String, address: String, phone: String, country: String, port: String },
  unit: String, chassisNo: String, engineNo: String, color: String,
  m3Rate: Number, exchangeRate: Number, pushPrice: Number, cnfPrice: Number,
  status: { type: String, default: "pending" },
  rejectionNote: String,
}, { timestamps: true });

const NotificationSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  message: String,
  type: String,
  invoiceId: mongoose.Schema.Types.ObjectId,
  read: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } });

const MessageSchema = new mongoose.Schema({
  leadId: mongoose.Schema.Types.ObjectId,
  sender: String,
  message: String,
}, { timestamps: true });

const User         = mongoose.models.User         || mongoose.model("User",         UserSchema);
const Lead         = mongoose.models.Lead         || mongoose.model("Lead",         LeadSchema);
const Invoice      = mongoose.models.Invoice      || mongoose.model("Invoice",      InvoiceSchema);
const Notification = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
const Message      = mongoose.models.Message      || mongoose.model("Message",      MessageSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // Clean ALL collections
  await Promise.all([
    User.deleteMany({}),
    Lead.deleteMany({}),
    Invoice.deleteMany({}),
    Notification.deleteMany({}),
    Message.deleteMany({}),
  ]);
  console.log("All collections cleared.");

  const hash = (pw: string) => bcryptjs.hash(pw, 12);

  await User.create({
    name: "SBK Admin",
    email: "admin@sbk.com",
    password: await hash("Admin@SBK1"),
    role: "admin",
  });

  await User.create({
    name: "SBK Manager",
    email: "manager@sbk.com",
    password: await hash("Manager@SBK1"),
    role: "manager",
  });

  console.log("Seed complete:");
  console.log("  ADMIN:   admin@sbk.com   / Admin@SBK1");
  console.log("  MANAGER: manager@sbk.com / Manager@SBK1");
  console.log("  Supervisors aur Agents portal ke andar se banein ge.");

  await mongoose.disconnect();
}

seed().catch(console.error);
