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


export type LeadFormData = z.infer<typeof leadSchema>;
export type MessageFormData = z.infer<typeof messageSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type InvoiceRequestFormData = z.infer<typeof invoiceRequestSchema>;
