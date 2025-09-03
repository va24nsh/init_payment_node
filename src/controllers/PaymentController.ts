import { Request, Response } from "express";
import { PaymentService } from "../services/PaymentService";
import { PaymentRequest } from "../types";
import { Invoice } from "../types";

export class PaymentController {
  static async createInvoice(req: Request, res: Response) {
    try {
      const { amount, description } = req.body;
      const user = req.user;
      const invoice = await PaymentService.createInvoice(
        user.id,
        amount,
        description
      );

      res.status(201).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Internal Server error at payment micro-service",
      });
    }
  }

  static async processPayment(req: Request, res: Response) {
    try {
      const paymentRequest: PaymentRequest = req.body;
      const user = req.user;
      const result = await PaymentService.processPayment(paymentRequest, user);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.transaction,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Internal Server error at payment micro-service",
      });
    }
  }

  static async getUserInvoices(req: Request, res: Response) {
    try {
      const user = req.user;
      const invoices = await PaymentService.getUserInvoices(user.id);

      res.status(200).json({
        success: true,
        data: invoices,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Internal Server error at payment micro-service",
      });
    }
  }

  static async getUserTransactions(req: Request, res: Response) {
    try {
      const user = req.user;
      const transactions = await PaymentService.getUserTransactions(user.id);

      res.status(200).json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Internal Server error at payment micro-service",
      });
    }
  }

  static async createRazorpayOrder(req: Request, res: Response) {
    try {
      const { invoiceId } = req.body;
      const user = req.user;

      const invoice = (await PaymentService.findInvoiceById(
        invoiceId
      )) as Invoice;
      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: "Invoice not found",
        });
      }

      if (invoice.userId !== user.id) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized to access this invoice",
        });
      }

      const order = await PaymentService.createRazorpayOrder(invoice, user);

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Internal Server error at payment micro-service",
      });
    }
  }

  static async processRazorpayWebhook(req: Request, res: Response) {
    try {
      // Create the event object in the format expected by the service
      const event = {
        headers: req.headers,
        body: req.body,
      };

      // Let the service handle all webhook processing
      const result = await PaymentService.handleRazorpayWebhook(event);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(400).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Webhook processing error",
      });
    }
  }
}
