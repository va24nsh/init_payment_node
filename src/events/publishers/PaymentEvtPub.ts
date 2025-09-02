import { Producer } from "kafkajs";
import { kafkaProducer } from "../../config/kafka";
import { Invoice, Transaction } from "../../types";

export class PaymentEventPublisher {
  private producer: Producer;

  constructor() {
    this.producer = kafkaProducer;
  }

  async publishInvoiceCreated(invoice: Invoice): Promise<void> {
    await this.producer.send({
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

  async publishPaymentSuccess(
    invoice: Invoice,
    transaction: Transaction
  ): Promise<void> {
    await this.producer.send({
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

  async publishPaymentFailed(invoice: Invoice, error: any): Promise<void> {
    await this.producer.send({
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
