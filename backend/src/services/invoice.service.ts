import { Prisma } from "../../generated/prisma/client.js";
import type { InvoiceStatus, PaymentMethod } from "../../generated/prisma/enums.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { generateInvoiceBarcode, generateInvoiceCode } from "../utils/invoiceCode.js";

type CreateInvoiceInput = {
  bhytDiscount?: number;
};

type PayInvoiceInput = {
  paymentMethod: PaymentMethod;
};

export const invoiceSelect = {
  id: true,
  invoiceCode: true,
  barcode: true,
  totalAmount: true,
  bhytDiscount: true,
  finalAmount: true,
  status: true,
  paymentMethod: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
  patient: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
    },
  },
  appointment: {
    select: {
      id: true,
      bookingCode: true,
      appointmentDate: true,
      startTime: true,
      endTime: true,
      status: true,
      patientName: true,
      patientPhone: true,
      patientEmail: true,
      estimatedPrice: true,
      serviceFee: true,
      bhytDiscount: true,
      finalAmount: true,
      package: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      doctor: {
        select: {
          id: true,
          title: true,
          specialization: true,
          user: {
            select: {
              fullName: true,
              avatar: true,
            },
          },
        },
      },
      department: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
} satisfies Prisma.InvoiceSelect;

class InvoiceService {
  async list(query: {
    status?: InvoiceStatus;
    paymentMethod?: PaymentMethod;
    patientId?: string;
    appointmentId?: string;
    invoiceCode?: string;
    barcode?: string;
    phone?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(Math.max(query.limit || 20, 1), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      status: query.status,
      paymentMethod: query.paymentMethod,
      patientId: query.patientId,
      appointmentId: query.appointmentId,
      invoiceCode: query.invoiceCode,
      barcode: query.barcode,
      appointment: query.phone
        ? {
            patientPhone: {
              contains: query.phone,
            },
          }
        : undefined,
    };

    const [items, total] = await prisma.$transaction([
      prisma.invoice.findMany({
        where,
        select: invoiceSelect,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: invoiceSelect,
    });

    if (!invoice) {
      throw new AppError("Khong tim thay hoa don", 404);
    }

    return invoice;
  }

  async createForAppointment(appointmentId: string, input: CreateInvoiceInput) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        status: true,
        patientId: true,
        estimatedPrice: true,
        serviceFee: true,
        bhytDiscount: true,
        invoice: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new AppError("Khong tim thay lich hen", 404);
    }

    if (appointment.status !== "COMPLETED") {
      throw new AppError("Chi co the tao hoa don cho lich da hoan thanh kham", 400);
    }

    if (appointment.invoice) {
      throw new AppError("Lich hen nay da co hoa don", 409);
    }

    const totalAmount = appointment.estimatedPrice + appointment.serviceFee;
    const bhytDiscount = input.bhytDiscount ?? appointment.bhytDiscount;

    if (bhytDiscount > totalAmount) {
      throw new AppError("Giam tru BHYT khong duoc lon hon tong tien", 400);
    }

    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceCode: await this.generateUniqueInvoiceCode(tx),
          barcode: await this.generateUniqueBarcode(tx),
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          totalAmount,
          bhytDiscount,
          finalAmount: totalAmount - bhytDiscount,
          status: "UNPAID",
        },
        select: {
          id: true,
        },
      });

      await tx.appointment.update({
        where: {
          id: appointment.id,
        },
        data: {
          bhytDiscount,
          finalAmount: totalAmount - bhytDiscount,
          logs: {
            create: {
              action: "INVOICE_CREATED",
              note: "Hoa don da duoc tao",
            },
          },
        },
      });

      return tx.invoice.findUniqueOrThrow({
        where: {
          id: invoice.id,
        },
        select: invoiceSelect,
      });
    });
  }

  async pay(id: string, input: PayInvoiceInput) {
    const invoice = await this.getById(id);

    if (invoice.status !== "UNPAID") {
      throw new AppError("Chi co the thanh toan hoa don chua thanh toan", 400);
    }

    if (["MOMO", "VNPAY"].includes(input.paymentMethod)) {
      throw new AppError("MOMO/VNPAY phai thanh toan qua API online payment", 400);
    }

    return prisma.invoice.update({
      where: { id },
      data: {
        status: "PAID",
        paymentMethod: input.paymentMethod,
        paidAt: new Date(),
      },
      select: invoiceSelect,
    });
  }

  async cancel(id: string) {
    const invoice = await this.getById(id);

    if (invoice.status !== "UNPAID") {
      throw new AppError("Chi co the huy hoa don chua thanh toan", 400);
    }

    return prisma.invoice.update({
      where: { id },
      data: {
        status: "CANCELLED",
      },
      select: invoiceSelect,
    });
  }

  async refund(id: string) {
    const invoice = await this.getById(id);

    if (invoice.status !== "PAID") {
      throw new AppError("Chi co the hoan tien hoa don da thanh toan", 400);
    }

    return prisma.invoice.update({
      where: { id },
      data: {
        status: "REFUNDED",
      },
      select: invoiceSelect,
    });
  }

  private async generateUniqueInvoiceCode(tx: Prisma.TransactionClient) {
    for (let index = 0; index < 10; index += 1) {
      const invoiceCode = generateInvoiceCode();
      const existing = await tx.invoice.findUnique({
        where: { invoiceCode },
        select: { id: true },
      });

      if (!existing) {
        return invoiceCode;
      }
    }

    throw new AppError("Khong the tao ma hoa don", 500);
  }

  private async generateUniqueBarcode(tx: Prisma.TransactionClient) {
    for (let index = 0; index < 10; index += 1) {
      const barcode = generateInvoiceBarcode();
      const existing = await tx.invoice.findUnique({
        where: { barcode },
        select: { id: true },
      });

      if (!existing) {
        return barcode;
      }
    }

    throw new AppError("Khong the tao ma vach hoa don", 500);
  }
}

export default new InvoiceService();
