import { Request, Response } from "express";
import { PaymentService } from "../services/PaymentService";
import { PaymentRequest } from "../types";

export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  async createInvoice(req: Request, res: Response) {
    try {
      const { amount, description } = req.body;
      const user = req.user;
      const invoice = await this.paymentService.createInvoice(
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
        error: error instanceof Error ? error.message : "Internal Server error at payment micro-service",
      });
    }
  }

  async processPayment(req: Request, res: Response) {
    try {
      const paymentRequest: PaymentRequest = req.body;
      const user = req.user;
      const result = await this.paymentService.processPayment(
        paymentRequest,
        user
      );

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

  async getUserInvoices(req: Request, res: Response) {
    try {
      const user = req.user;
      const invoices = await this.paymentService.getUserInvoices(user.id);

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

  async getUserTransactions(req: Request, res: Response) {
    try {
      const user = req.user;
      const transactions = await this.paymentService.getUserTransactions(
        user.id
      );

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
}
