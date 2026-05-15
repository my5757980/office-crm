import { z } from "zod";

export const leadSchema = z.object({
  customerName: z.string().optional().or(z.literal("")),
  contactPerson: z.string().min(1, "Contact person is required"),
  address: z.string().optional(),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  country: z.string().min(1, "Country is required"),
  countryCode: z.string().min(1, "Country code is required"),
  port: z.string().min(1, "Port is required"),
});

export const messageSchema = z.object({
  message: z.string().min(1, "Message is required").max(1000, "Message too long"),
});

export const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["user", "admin", "manager", "super_admin"]),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const invoiceRequestSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  consignee: z.object({
    name:    z.string().min(1, "Consignee name is required"),
    address: z.string().optional(),
    phone:   z.string().min(1, "Consignee phone is required"),
    country: z.string().min(1, "Consignee country is required"),
    port:    z.string().min(1, "Consignee port is required"),
  }),
  unit:         z.string().min(1, "Unit/Make is required"),
  year:         z.string().optional().default(""),
  chassisNo:    z.string().min(1, "Chassis number is required"),
  engineNo:     z.string().min(1, "Engine number is required"),
  color:        z.string().min(1, "Color is required"),
  m3Rate:       z.number().positive("M3 rate must be positive"),
  exchangeRate: z.number().positive("Exchange rate must be positive"),
  pushPrice:    z.number().positive("Push price must be positive"),
  cnfPrice:     z.number().positive("CNF price must be positive"),
});


export const paymentSchema = z.object({
  invoiceId:      z.string().min(1, "Invoice ID is required"),
  sellingPrice:   z.number().positive("Selling price must be positive"),
  amountReceived: z.number().positive("Amount received must be positive"),
  receivedDate:   z.string().min(1, "Received date is required"),
  exchangeRate:   z.number().positive("Exchange rate must be positive").optional(),
  yenAmount:      z.number().positive("Yen amount must be positive").optional(),
  receiptImage:   z.object({
    data:     z.string(),
    filename: z.string(),
  }).optional(),
});

export const unitSchema = z.object({
  paymentId:    z.string().optional(),
  invoiceId:    z.string().min(1, "Invoice ID is required"),
  make:         z.string().min(1, "Make is required"),
  carModel:     z.string().min(1, "Model is required"),
  year:         z.number().int().min(1900).max(2100),
  color:        z.string().min(1, "Color is required"),
  chassis:      z.string().min(1, "Chassis is required"),
  engineCC:     z.number().positive("Engine CC must be positive"),
  drive:        z.string().min(1, "Drive is required"),
  fuel:         z.string().min(1, "Fuel is required"),
  mileage:      z.number().min(0, "Mileage cannot be negative"),
  transmission: z.string().min(1, "Transmission is required"),
  steering:     z.string().min(1, "Steering is required"),
  doors:        z.number().int().min(1).max(10),
  seats:        z.number().int().min(1).max(20),
  location:     z.string().min(1, "Location is required"),
});

export type LeadFormData = z.infer<typeof leadSchema>;
export type MessageFormData = z.infer<typeof messageSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type InvoiceRequestFormData = z.infer<typeof invoiceRequestSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
export type UnitFormData = z.infer<typeof unitSchema>;
