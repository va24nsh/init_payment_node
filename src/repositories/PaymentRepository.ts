import { Invoice, Transaction } from "../types";
import { prisma } from "../config/prisma";

export class PaymentRepository {
  private prisma = prisma;

  static async createInvoice(invoice: Partial<Invoice>) {
    return await prisma.invoice.create({
      data: {
        userId: invoice.userId!,
        amount: invoice.amount!,
        currency: invoice.currency || "USD",
        status: invoice.status || "pending",
        description: invoice.description,
      },
    });
  }

  static async findInvoiceById(id: string) {
    return await prisma.invoice.findUnique({
      where: { id },
    });
  }

  static async updateInvoiceStatus(
    id: string,
    status: Invoice["status"],
    paidAt?: Date
  ) {
    return await prisma.invoice.update({
      where: { id },
      data: {
        status,
        paidAt: paidAt || undefined,
      },
    });
  }

  static async createTransaction(
    transaction: Partial<Transaction>
  ) {
    return await prisma.transaction.create({
      data: {
        invoiceId: transaction.invoiceId!,
        userId: transaction.userId!,
        amount: transaction.amount!,
        paymentMethod: transaction.paymentMethod!,
        status: transaction.status || "pending",
        gatewayResponse: transaction.gatewayResponse,
      },
    });
  }

  static async getTransactionsByUserId(userId: string) {
    return await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getInvoicesByUserId(userId: string) {
    return await prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        transactions: true,
      },
    });
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
