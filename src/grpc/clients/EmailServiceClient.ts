import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import { Invoice, Transaction } from "../../types";

const grpcHost = process.env.GRPC_HOST || "localhost";
const grpcPort = process.env.GRPC_PORT || 50051;
const address = `${grpcHost}:${grpcPort}`;

const PROTO_PATH = path.join(__dirname, "../proto/email_service.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const emailProto = grpc.loadPackageDefinition(packageDefinition).email as any;

const emailClient = new emailProto.EmailService(
  address,
  grpc.credentials.createInsecure()
);

export const sendPaymentConfirmation = async (userId: string, invoice: Invoice, transaction: Transaction) => {
  return new Promise((resolve, reject) => {
    emailClient.sendPaymentConfirmation(
      {
        recipient: userId,
        subject: "Payment Confirmation",
        template: "payment-confirmation",
        data: {
          invoiceId: invoice.id,
          amount: invoice.amount,
          transactionId: transaction.id,
          date: new Date().toLocaleDateString(),
        },
      },
      (error: any, response: any) => {
        if (error) {
          console.error("Failed to send email:", error);
          reject(error);
        } else {
          console.log("Email sent successfully:", response);
          resolve(response);
        }
      }
    );
  });
};

