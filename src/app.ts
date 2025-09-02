import express from "express";
import { PaymentController } from "./controllers/PaymentController";
import { PaymentService } from "./services/PaymentService";
import { PaymentRepository } from "./repositories/PaymentRepository";
import { PaymentEventPublisher } from "./events/publishers/PaymentEvtPub";
import { EmailServiceClient } from "./grpc/clients/EmailServiceClient";
import { authenticateToken } from "./middlewares/auth";
import { initDatabase } from "./config/prisma";
import { connectKafka } from "./config/kafka";

const app = express();
app.use(express.json());

// Initialize dependencies
const paymentRepository = new PaymentRepository();
const paymentEventPublisher = new PaymentEventPublisher();
const emailServiceClient = new EmailServiceClient();
const paymentService = new PaymentService(
  paymentRepository,
  paymentEventPublisher,
  emailServiceClient
);
const paymentController = new PaymentController(paymentService);

// Routes
app.post("/invoices", authenticateToken, (req, res) =>
  paymentController.createInvoice(req, res)
);
app.post("/payments", authenticateToken, (req, res) =>
  paymentController.processPayment(req, res)
);
app.get("/invoices", authenticateToken, (req, res) =>
  paymentController.getUserInvoices(req, res)
);
app.get("/transactions", authenticateToken, (req, res) =>
  paymentController.getUserTransactions(req, res)
);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  await paymentRepository.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  await paymentRepository.disconnect();
  process.exit(0);
});

// Initialize and start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await initDatabase();
    await connectKafka();

    app.listen(PORT, () => {
      console.log(`Payment service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
