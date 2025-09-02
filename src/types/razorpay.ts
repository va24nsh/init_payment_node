export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: "created" | "attempted" | "paid";
  attempts: number;
  notes?: Record<string, string>;
  created_at: number;
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method: string;
  bank?: string;
  wallet?: string;
  vpa?: string;
  email: string;
  contact: string;
  notes?: Record<string, string>;
  fee: number;
  tax: number;
  error_code?: string;
  error_description?: string;
  created_at: number;
}

export interface RazorpayPaymentCapture {
  amount: number;
  currency: string;
}

export interface RazorpayRefund {
  id: string;
  amount: number;
  currency: string;
  payment_id: string;
  notes?: Record<string, string>;
  status: "processed" | "pending" | "failed";
  created_at: number;
}
