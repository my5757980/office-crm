// Maps snake_case Postgres rows back to the camelCase + `_id` shape the
// frontend already expects from the old Mongoose-populated responses.
// Keeping this shape (instead of touching every component) is what makes
// the Mongo -> Postgres swap a backend-only change.

export interface UserRef { _id: string; name: string; email: string }

function userRef(id: string | null, name: string | null, email?: string | null): UserRef | null {
  if (!id) return null;
  return { _id: id, name: name ?? "", email: email ?? "" };
}

const str = (v: unknown): string => v as string;
const strOrUndef = (v: unknown): string | undefined => (v == null ? undefined : (v as string));
const numOrUndef = (v: unknown): number | undefined => (v == null ? undefined : Number(v));
const bool = (v: unknown): boolean => v as boolean;

export function serializeUser(row: Record<string, unknown>) {
  return {
    _id: str(row.id),
    name: str(row.name),
    email: str(row.email),
    role: str(row.role),
    isActive: bool(row.is_active),
    lastSeen: strOrUndef(row.last_seen),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function serializeLead(row: Record<string, unknown>) {
  return {
    _id: str(row.id),
    customerName: str(row.customer_name),
    contactPerson: str(row.contact_person),
    address: strOrUndef(row.address),
    phone: str(row.phone),
    email: strOrUndef(row.email),
    country: str(row.country),
    countryCode: str(row.country_code),
    port: str(row.port),
    status: str(row.status),
    isCustomer: bool(row.is_customer),
    createdBy: (row.created_by_name !== undefined
      ? userRef(row.created_by as string | null, row.created_by_name as string | null, row.created_by_email as string | null)
      : row.created_by) as UserRef,
    duplicateAttemptBy: strOrUndef(row.duplicate_attempt_by),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function serializeInvoice(row: Record<string, unknown>) {
  return {
    _id: str(row.id),
    leadId: (row.lead_customer_name !== undefined
      ? {
          _id: row.lead_id,
          customerName: row.lead_customer_name,
          contactPerson: row.lead_contact_person,
          country: row.lead_country,
          port: row.lead_port,
        }
      : row.lead_id) as { _id: string; customerName: string; contactPerson?: string; country?: string; port?: string } | string,
    createdBy: (row.created_by_name !== undefined
      ? userRef(row.created_by as string | null, row.created_by_name as string | null, row.created_by_email as string | null)
      : row.created_by) as UserRef,
    approvedBy: (row.approved_by_name !== undefined
      ? userRef(row.approved_by as string | null, row.approved_by_name as string | null)
      : row.approved_by) as UserRef | undefined,
    consignee: {
      name: str(row.consignee_name),
      address: str(row.consignee_address),
      phone: str(row.consignee_phone),
      country: str(row.consignee_country),
      port: str(row.consignee_port),
    },
    unit: str(row.unit),
    chassisNo: str(row.chassis_no),
    engineNo: str(row.engine_no),
    color: str(row.color),
    year: strOrUndef(row.year),
    salesperson: strOrUndef(row.salesperson),
    fuel: strOrUndef(row.fuel),
    transmission: strOrUndef(row.transmission),
    m3Rate: numOrUndef(row.m3_rate) as number,
    exchangeRate: numOrUndef(row.exchange_rate) as number,
    pushPrice: numOrUndef(row.push_price) as number,
    cnfPrice: numOrUndef(row.cnf_price) as number,
    advancePercent: numOrUndef(row.advance_percent) as number,
    status: str(row.status) as "pending" | "approved" | "rejected" | "sent",
    rejectionNote: strOrUndef(row.rejection_note),
    uploadedPdf: row.uploaded_pdf_data
      ? { data: str(row.uploaded_pdf_data), filename: str(row.uploaded_pdf_filename), uploadedAt: str(row.uploaded_pdf_uploaded_at) }
      : undefined,
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function serializePayment(row: Record<string, unknown>) {
  return {
    _id: str(row.id),
    invoiceId: str(row.invoice_id),
    sellingPrice: numOrUndef(row.selling_price) as number,
    amountReceived: numOrUndef(row.amount_received) as number,
    receivedDate: str(row.received_date),
    exchangeRate: numOrUndef(row.exchange_rate),
    yenAmount: numOrUndef(row.yen_amount),
    recordedBy: (row.recorded_by_name !== undefined
      ? userRef(row.recorded_by as string | null, row.recorded_by_name as string | null, row.recorded_by_email as string | null)
      : row.recorded_by) as UserRef,
    receiptImage: row.receipt_image_data
      ? { data: str(row.receipt_image_data), filename: str(row.receipt_image_filename), uploadedAt: str(row.receipt_image_uploaded_at) }
      : undefined,
    createdAt: str(row.created_at),
  };
}

export function serializeUnit(row: Record<string, unknown>) {
  return {
    _id: str(row.id),
    paymentId: strOrUndef(row.payment_id),
    invoiceId: str(row.invoice_id),
    make: str(row.make),
    carModel: str(row.car_model),
    year: numOrUndef(row.year) as number,
    color: str(row.color),
    chassis: str(row.chassis),
    engineCC: numOrUndef(row.engine_cc) as number,
    drive: str(row.drive),
    fuel: str(row.fuel),
    mileage: numOrUndef(row.mileage) as number,
    transmission: str(row.transmission),
    steering: str(row.steering),
    doors: numOrUndef(row.doors) as number,
    seats: numOrUndef(row.seats) as number,
    location: str(row.location),
    createdBy: (row.created_by_name !== undefined
      ? userRef(row.created_by as string | null, row.created_by_name as string | null)
      : row.created_by) as UserRef | undefined,
    createdAt: str(row.created_at),
  };
}

export function serializeUnitFile(row: Record<string, unknown>) {
  return {
    _id: str(row.id),
    unitId: str(row.unit_id),
    folder: str(row.folder),
    filename: str(row.filename),
    mimetype: str(row.mimetype),
    size: numOrUndef(row.size) as number,
    uploadedAt: str(row.uploaded_at),
  };
}

export function serializeUnitFinancial(row: Record<string, unknown>) {
  const num = (v: unknown) => (v != null ? Number(v) : (v as number | null));
  return {
    _id: str(row.id),
    unitId: str(row.unit_id),
    currency: str(row.currency) as "JPY" | "USD",
    lotNo: str(row.lot_no),
    auctionName: str(row.auction_name),
    buying: num(row.buying),
    domestic: num(row.domestic),
    storage: num(row.storage),
    inspect: num(row.inspect),
    repairs: num(row.repairs),
    misc: num(row.misc),
    agencyFee: num(row.agency_fee),
    freight: num(row.freight),
    dhl: num(row.dhl),
    exchangeRate: num(row.exchange_rate),
    costUSD: num(row.cost_usd),
    costOfUnitJPY: num(row.cost_of_unit_jpy),
    costOfUnitUSD: num(row.cost_of_unit_usd),
    sellingPrice: num(row.selling_price),
    profit: num(row.profit),
    createdBy: str(row.created_by),
    updatedAt: str(row.updated_at),
  };
}

export function serializeMessage(row: Record<string, unknown>) {
  return {
    _id: str(row.id),
    leadId: str(row.lead_id),
    userId: str(row.user_id),
    userName: str(row.user_name),
    message: str(row.message),
    createdAt: str(row.created_at),
  };
}

export function serializeNotification(row: Record<string, unknown>) {
  return {
    _id: str(row.id),
    userId: str(row.user_id),
    message: str(row.message),
    type: str(row.type) as "invoice_requested" | "invoice_approved" | "invoice_rejected" | "duplicate_lead",
    invoiceId: strOrUndef(row.invoice_id),
    leadId: strOrUndef(row.lead_id),
    read: bool(row.read),
    createdAt: str(row.created_at),
  };
}

export function serializeChatMessage(row: Record<string, unknown>) {
  return {
    _id: str(row.id),
    from: str(row.from_user),
    to: str(row.to_user),
    text: str(row.text),
    read: bool(row.read),
    createdAt: str(row.created_at),
  };
}
