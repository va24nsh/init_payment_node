import { Invoice, Transaction, PaymentRequest } from "../types";
import { PaymentEventPublisher } from "../events/publishers/PaymentEvtPub";
import { sendPaymentConfirmation } from "../grpc/clients/EmailServiceClient";
import { PaymentRepository } from "../repositories/PaymentRepository";
import { razorpayInstance } from "../config/razorpay";
import { RazorpayPayment, RazorpayPaymentCapture } from "../types/razorpay";

export class PaymentService {
  static async findInvoiceById(id: string) {
    return PaymentRepository.findInvoiceById(id);
  }

  static async createInvoice(
    userId: string,
    amount: number,
    description: string
  ) {
    const invoice: Partial<Invoice> = {
      userId,
      amount,
      description,
      status: "pending",
    };

    const createdInvoice = (await PaymentRepository.createInvoice(
      invoice
    )) as Invoice;

    await PaymentEventPublisher.publishInvoiceCreated(createdInvoice);

    return createdInvoice;
  }

  static async processPayment(paymentRequest: PaymentRequest, user: any) {
    const { invoiceId, paymentMethod, paymentDetails } = paymentRequest;

    const invoice = (await PaymentRepository.findInvoiceById(
      invoiceId
    )) as Invoice;
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
      const paymentResult = await PaymentService.processWithPaymentGateway(
        invoice,
        paymentMethod,
        paymentDetails
      );

      if (paymentResult.success) {
        const updatedInvoice = (await PaymentRepository.updateInvoiceStatus(
          invoiceId,
          "paid",
          new Date()
        )) as Invoice;

        const transaction: Partial<Transaction> = {
          invoiceId,
          userId: user.id,
          amount: invoice.amount,
          paymentMethod,
          status: "completed",
          gatewayResponse: paymentResult,
        };

        const createdTransaction = (await PaymentRepository.createTransaction(
          transaction
        )) as Transaction;

        await PaymentEventPublisher.publishPaymentSuccess(
          updatedInvoice,
          createdTransaction
        );

        await sendPaymentConfirmation(
          user.email,
          updatedInvoice,
          createdTransaction
        );

        return {
          success: true,
          transaction: createdTransaction,
        };
      } else {
        await PaymentRepository.updateInvoiceStatus(invoiceId, "failed");

        const transaction: Partial<Transaction> = {
          invoiceId,
          userId: user.id,
          amount: invoice.amount,
          paymentMethod,
          status: "failed",
          gatewayResponse: paymentResult,
        };

        const createdTransaction = await PaymentRepository.createTransaction(
          transaction
        );

        await PaymentEventPublisher.publishPaymentFailed(
          invoice,
          createdTransaction
        );

        return {
          success: false,
          error: paymentResult.error || "Payment failed",
        };
      }
    } catch (error) {
      await PaymentRepository.updateInvoiceStatus(invoiceId, "failed");

      await PaymentEventPublisher.publishPaymentFailed(invoice, {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error in process payment",
      });

      throw error;
    }
  }

  static async getUserInvoices(userId: string) {
    return PaymentRepository.getInvoicesByUserId(userId);
  }

  static async getUserTransactions(userId: string) {
    return PaymentRepository.getTransactionsByUserId(userId);
  }

  static async createRazorpayOrder(invoice: Invoice, user: any) {
    try {
      const options = {
        amount: invoice.amount * 100,
        currency: invoice.currency || "INR",
        receipt: `receipt_${invoice.id}`,
        notes: {
          invoiceId: invoice.id,
          userId: user.id,
          description: invoice.description,
        },
        idempotency_key: `invoice_${invoice.id}_${Date.now()}`,
      };

      const order = await razorpayInstance.orders.create(options);
      return order;
    } catch (error) {
      console.error("Error creating Razorpay order:", error);
      throw new Error("Failed to create payment order");
    }
  }

  static async verifyRazorpayPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ) {
    const crypto = require("crypto");
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!);
    hmac.update(orderId + "|" + paymentId);
    const generatedSignature = hmac.digest("hex");
    return generatedSignature === signature;
  }

  private static async processWithPaymentGateway(
    invoice: Invoice,
    paymentMethod: string,
    paymentDetails: any
  ): Promise<any> {
    try {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
        paymentDetails;

      // Verify payment signature
      const isValidSignature =
        await PaymentService.verifyRazorpayPaymentSignature(
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature
        );

      if (!isValidSignature) {
        return {
          success: false,
          error: "Invalid payment signature",
          reason: "Payment verification failed",
        };
      }

      // Fetch payment details from Razorpay
      const payment = (await razorpayInstance.payments.fetch(
        razorpay_payment_id
      )) as RazorpayPayment;

      if (payment.status === "captured") {
        return {
          success: true,
          transactionId: payment.id,
          orderId: payment.order_id,
          method: payment.method,
          bank: payment.bank,
          wallet: payment.wallet,
          vpa: payment.vpa,
          processedAt: new Date(payment.created_at * 1000).toISOString(),
          razorpayResponse: payment,
        };
      } else if (payment.status === "authorized") {
        // Capture authorized payment
        const captureAmount = invoice.amount * 100; // Convert to paise
        const captureResponse = (await razorpayInstance.payments.capture(
          razorpay_payment_id,
          captureAmount,
          invoice.currency || "INR"
        )) as RazorpayPaymentCapture;

        return {
          success: true,
          transactionId: payment.id,
          orderId: payment.order_id,
          method: payment.method,
          processedAt: new Date().toISOString(),
          razorpayResponse: captureResponse,
        };
      } else {
        return {
          success: false,
          error: `Payment ${payment.status}`,
          reason: payment.error_description || "Payment not completed",
          razorpayResponse: payment,
        };
      }
    } catch (error: any) {
      console.error("Razorpay payment processing error:", error);

      if (error.error) {
        // Razorpay API error
        return {
          success: false,
          error: error.error.description || "Payment processing failed",
          reason: error.error.code || "unknown_error",
          razorpayError: error.error,
        };
      }

      return {
        success: false,
        error: error.message || "Payment processing failed",
        reason: "unknown_error",
      };
    }
  }

  static async getPaymentStatus(paymentId: string) {
    try {
      const payment = await razorpayInstance.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      console.error("Error fetching payment status:", error);
      throw new Error("Failed to fetch payment status");
    }
  }

  static verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(signature, 'hex')
      );
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  static async handleRazorpayWebhook(event: any) {
    // Verify webhook signature
    const webhookSignature = event.headers["x-razorpay-signature"];
    const isValidWebhook = PaymentService.verifyWebhookSignature(
      event.body,
      webhookSignature
    );

    if (!isValidWebhook) {
      throw new Error("Invalid webhook signature");
    }

    try {
      const eventData = typeof event.body === 'string' 
        ? JSON.parse(event.body) 
        : event.body;
      
      const eventType = eventData.event;
      
      switch (eventType) {
        case 'payment.captured':
          await PaymentService.handlePaymentCaptured(eventData.payload.payment.entity);
          break;
        
        case 'payment.failed':
          await PaymentService.handlePaymentFailed(eventData.payload.payment.entity);
          break;
        
        case 'payment.authorized':
          await PaymentService.handlePaymentAuthorized(eventData.payload.payment.entity);
          break;
        
        // case 'refund.processed':
        //   await PaymentService.handleRefundProcessed(eventData.payload.refund.entity);
        //   break;
        
        default:
          console.log(`Unhandled webhook event: ${eventType}`);
      }
      
      return {
        success: true,
        message: `Processed ${eventType} event`
      };
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw new Error(`Failed to process webhook: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  static async handlePaymentCaptured(payment: any) {
    try {
      // Extract invoice ID from payment notes or description
      const { notes } = payment;
      const invoiceId = notes?.invoiceId;
      
      if (!invoiceId) {
        console.error('Invoice ID not found in payment metadata');
        return;
      }
      
      // Get the invoice
      const invoice = await PaymentRepository.findInvoiceById(invoiceId);
      
      if (!invoice) {
        console.error(`Invoice ${invoiceId} not found for payment ${payment.id}`);
        return;
      }
      
      // If invoice isn't already marked as paid, update it
      if (invoice.status !== 'paid') {
        const updatedInvoice = await PaymentRepository.updateInvoiceStatus(
          invoiceId,
          'paid',
          new Date()
        ) as Invoice;
        
        // Create or update transaction record
        const transaction: Partial<Transaction> = {
          invoiceId,
          userId: invoice.userId,
          amount: invoice.amount,
          paymentMethod: payment.method,
          status: 'completed',
          gatewayResponse: {
            success: true,
            transactionId: payment.id,
            orderId: payment.order_id,
            method: payment.method,
            processedAt: new Date(payment.created_at * 1000).toISOString(),
            razorpayResponse: payment
          }
        };
        
        const createdTransaction = await PaymentRepository.createTransaction(transaction) as Transaction;
        
        // Publish payment success event
        await PaymentEventPublisher.publishPaymentSuccess(updatedInvoice, createdTransaction);
        
        await sendPaymentConfirmation(invoice.userId, updatedInvoice, createdTransaction);
      }
    } catch (error) {
      console.error('Error handling payment captured webhook:', error);
      throw error;
    }
  }

  static async handlePaymentFailed(payment: any) {
    try {
      const { notes } = payment;
      const invoiceId = notes?.invoiceId;
      
      if (!invoiceId) {
        console.error('Invoice ID not found in payment metadata');
        return;
      }
      
      const invoice = await PaymentRepository.findInvoiceById(invoiceId) as Invoice;
      
      if (!invoice) {
        console.error(`Invoice ${invoiceId} not found for failed payment ${payment.id}`);
        return;
      }
      
      // Update invoice status
      await PaymentRepository.updateInvoiceStatus(invoiceId, 'failed');
      
      // Record failed transaction
      const transaction: Partial<Transaction> = {
        invoiceId,
        userId: invoice.userId,
        amount: invoice.amount,
        paymentMethod: payment.method || 'unknown',
        status: 'failed',
        gatewayResponse: {
          success: false,
          error: payment.error_description || 'Payment failed',
          reason: payment.error_code || 'payment_failed',
          razorpayResponse: payment
        }
      };
      
      const createdTransaction = await PaymentRepository.createTransaction(transaction);
      
      // Publish payment failed event
      await PaymentEventPublisher.publishPaymentFailed(invoice, createdTransaction);
    } catch (error) {
      console.error('Error handling payment failed webhook:', error);
      throw error;
    }
  }

  static async handlePaymentAuthorized(payment: any) {
    try {
      const { notes } = payment;
      const invoiceId = notes?.invoiceId;
      
      if (!invoiceId) {
        console.error('Invoice ID not found in payment metadata');
        return;
      }
      
      const invoice = await PaymentRepository.findInvoiceById(invoiceId) as Invoice;
      
      if (!invoice) {
        console.error(`Invoice ${invoiceId} not found for authorized payment ${payment.id}`);
        return;
      }
      
      // Try to capture the payment
      const captureAmount = invoice.amount * 100; // Convert to paise
      try {
        const captureResponse = await razorpayInstance.payments.capture(
          payment.id,
          captureAmount,
          invoice.currency || 'INR'
        );
        
        // Payment captured successfully - the captured webhook will handle the rest
        console.log(`Captured payment ${payment.id} from authorization webhook`);
      } catch (captureError) {
        console.error(`Failed to capture authorized payment ${payment.id}:`, captureError);
        // Mark as failed if capture fails
        await PaymentRepository.updateInvoiceStatus(invoiceId, 'failed');
        
        await PaymentEventPublisher.publishPaymentFailed(invoice, {
          error:
            captureError instanceof Error
              ? captureError.message
              : "Failed to capture payment",
        });
      }
    } catch (error) {
      console.error('Error handling payment authorized webhook:', error);
      throw error;
    }
  }
}
