import { kafkaProducer } from "../../config/kafka";
import { Invoice, Transaction } from "../../types";

export class PaymentEventPublisher {
  static async publishInvoiceCreated(invoice: Invoice) {
    await kafkaProducer.send({
      topic: "payment-events",
      messages: [
        {
          key: "invoice-created",
          value: JSON.stringify({
            eventType: "INVOICE_CREATED",
            data: invoice,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });
  }

  static async publishPaymentSuccess(
    invoice: Invoice,
    transaction: Transaction
  ) {
    await kafkaProducer.send({
      topic: "payment-events",
      messages: [
        {
          key: "payment-success",
          value: JSON.stringify({
            eventType: "PAYMENT_SUCCESS",
            data: { invoice, transaction },
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });
  }

  static async publishPaymentFailed(invoice: Invoice, error: any) {
    await kafkaProducer.send({
      topic: "payment-events",
      messages: [
        {
          key: "payment-failed",
          value: JSON.stringify({
            eventType: "PAYMENT_FAILED",
            data: { invoice, error },
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });
  }
}
