import { Invoice, Transaction, PaymentRequest, PaymentResult } from "../types";
import { PaymentEventPublisher } from "../events/publishers/PaymentEvtPub";
import { EmailServiceClient } from "../grpc/clients/EmailServiceClient";

export class PaymentService {
  constructor(
    private paymentRepository: any,
    private paymentEventPublisher: PaymentEventPublisher,
    private emailServiceClient: EmailServiceClient
  ) {}

  async createInvoice(
    userId: string,
    amount: number,
    description: string
  ): Promise<Invoice> {
    const invoice: Partial<Invoice> = {
      userId,
      amount,
      description,
      status: "pending",
    };

    const createdInvoice = await this.paymentRepository.createInvoice(invoice);

    await this.paymentEventPublisher.publishInvoiceCreated(createdInvoice);

    return createdInvoice;
  }

  async processPayment(
    paymentRequest: PaymentRequest,
    user: any
  ): Promise<PaymentResult> {
    const { invoiceId, paymentMethod, paymentDetails } = paymentRequest;

    const invoice = await this.paymentRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.userId !== user.id) {
      throw new Error("Unauthorized to pay this invoice");
    }

    if (invoice.status !== "pending") {
      throw new Error(`Invoice is already ${invoice.status}`);
    }

    try {
      const paymentResult = await this.processWithPaymentGateway(
        invoice,
        paymentMethod,
        paymentDetails
      );

      if (paymentResult.success) {
        const updatedInvoice = await this.paymentRepository.updateInvoiceStatus(
          invoiceId,
          "paid",
          new Date()
        );

        const transaction: Partial<Transaction> = {
          invoiceId,
          userId: user.id,
          amount: invoice.amount,
          paymentMethod,
          status: "completed",
          gatewayResponse: paymentResult,
        };

        const createdTransaction =
          await this.paymentRepository.createTransaction(transaction);

        await this.paymentEventPublisher.publishPaymentSuccess(
          updatedInvoice,
          createdTransaction
        );

        await this.emailServiceClient.sendPaymentConfirmation(
          user.email,
          updatedInvoice,
          createdTransaction
        );

        return {
          success: true,
          transaction: createdTransaction,
        };
      } else {
        await this.paymentRepository.updateInvoiceStatus(invoiceId, "failed");

        const transaction: Partial<Transaction> = {
          invoiceId,
          userId: user.id,
          amount: invoice.amount,
          paymentMethod,
          status: "failed",
          gatewayResponse: paymentResult,
        };

        const createdTransaction =
          await this.paymentRepository.createTransaction(transaction);

        await this.paymentEventPublisher.publishPaymentFailed(
          invoice,
          createdTransaction
        );

        return {
          success: false,
          error: paymentResult.error || "Payment failed",
        };
      }
    } catch (error) {
      await this.paymentRepository.updateInvoiceStatus(invoiceId, "failed");

      await this.paymentEventPublisher.publishPaymentFailed(invoice, {
        error: error instanceof Error ? error.message : "Unknown error in process payment",
      });

      throw error;
    }
  }

  async getUserInvoices(userId: string): Promise<Invoice[]> {
    return this.paymentRepository.getInvoicesByUserId(userId);
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return this.paymentRepository.getTransactionsByUserId(userId);
  }

  private async processWithPaymentGateway(
    invoice: Invoice,
    paymentMethod: string,
    paymentDetails: any
  ): Promise<any> {

    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() < 0.9;

        if (success) {
          resolve({
            success: true,
            processedAt: new Date().toISOString(),
          });
        } else {
          resolve({
            success: false,
            error: "Payment declined by bank",
            reason: "Insufficient funds",
          });
        }
      }, 1000);
    });
  }
}
