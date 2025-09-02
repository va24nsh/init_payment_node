import express from "express";
import { authenticateToken } from "./middlewares/auth";
import { PaymentController } from "./controllers/PaymentController";

export const app = express();
app.use(express.json());

app.post("/invoices", authenticateToken, PaymentController.createInvoice);
app.post("/payments", authenticateToken, PaymentController.processPayment);
app.get("/invoices", authenticateToken, PaymentController.getUserInvoices);
app.get("/transactions", authenticateToken, PaymentController.getUserTransactions);
app.post("/razorpay/order", authenticateToken, PaymentController.createRazorpayOrder);
app.post("/razorpay/webhook", PaymentController.processRazorpayWebhook);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});
