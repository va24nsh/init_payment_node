export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Invoice {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded";
  description: string;
  createdAt: Date;
  paidAt?: Date;
}

export interface Transaction {
  id: string;
  invoiceId: string;
  userId: string;
  amount: number;
  paymentMethod: string;
  status: "pending" | "completed" | "failed";
  gatewayResponse: any;
  createdAt: Date;
}

export interface PaymentRequest {
  invoiceId: string;
  paymentMethod: string;
  paymentDetails: any;
}

export interface PaymentResult {
  success: boolean;
  transaction?: Transaction;
  error?: string;
}
