import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import { Invoice, Transaction } from "../../types";

const PROTO_PATH = path.join(__dirname, "../proto/email_service.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const emailProto = grpc.loadPackageDefinition(packageDefinition).email;

export class EmailServiceClient {
  private client: any;

  constructor() {
    this.client = new (emailProto as any).EmailService(
      "email-service:50051",
      grpc.credentials.createInsecure()
    );
  }

  sendPaymentConfirmation(
    email: string,
    invoice: Invoice,
    transaction: Transaction
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.sendPaymentConfirmation(
        {
          recipient: email,
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
            resolve();
          }
        }
      );
    });
  }
}
