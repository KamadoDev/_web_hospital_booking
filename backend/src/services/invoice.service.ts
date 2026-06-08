import { Prisma } from "../../generated/prisma/client.js";
import type { InsuranceRouteType, InvoiceStatus, PaymentMethod } from "../../generated/prisma/enums.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { generateInvoiceBarcode, generateInvoiceCode } from "../utils/invoiceCode.js";

type CreateInvoiceInput = {
  bhytDiscount?: number;
  insuranceEligibleAmount?: number;
  insuranceCoverageRate?: number;
  insuranceRouteType?: InsuranceRouteType | null;
  insuranceNote?: string | null;
};

type UpdateInvoiceInput = {
  bhytDiscount?: number;
  insuranceEligibleAmount?: number;
  insuranceCoverageRate?: number;
  insuranceRouteType?: InsuranceRouteType | null;
  insuranceNote?: string | null;
};

type PayInvoiceInput = {
  paymentMethod: PaymentMethod;
};

type RefundInvoiceInput = {
  refundReason: string;
};

type InsuranceCalculationInput = {
  bhytDiscount?: number;
  insuranceEligibleAmount?: number;
  insuranceCoverageRate?: number;
  insuranceRouteType?: InsuranceRouteType | null;
  insuranceNote?: string | null;
};

type InsuranceAppointmentPolicy = {
  hasBHYT: boolean;
  package: {
    isBHYTSupport: boolean;
  } | null;
};

const normalizeOptionalString = (value?: string | null) =>
  value === undefined ? undefined : value?.trim() || null;

const calculateInsurance = (
  input: InsuranceCalculationInput,
  totalAmount: number,
  appointment: InsuranceAppointmentPolicy,
  fallbackDiscount = 0,
) => {
  const hasStructuredInsurance =
    input.insuranceEligibleAmount !== undefined ||
    input.insuranceCoverageRate !== undefined ||
    input.insuranceRouteType !== undefined ||
    input.insuranceNote !== undefined;

  const eligibleAmount = hasStructuredInsurance
    ? input.insuranceEligibleAmount ?? 0
    : input.bhytDiscount ?? fallbackDiscount;
  const coverageRate = hasStructuredInsurance
    ? input.insuranceCoverageRate ?? 0
    : eligibleAmount > 0
      ? 100
      : 0;
  const routeType = input.insuranceRouteType ?? (eligibleAmount > 0 ? "SERVICE" : null);
  const note = normalizeOptionalString(input.insuranceNote);
  const discountAmount = hasStructuredInsurance
    ? Math.floor((eligibleAmount * coverageRate) / 100)
    : input.bhytDiscount ?? fallbackDiscount;

  if (eligibleAmount > totalAmount) {
    throw new AppError("Số tiền đủ điều kiện BHYT không được lớn hơn tổng tiền", 400);
  }

  if (discountAmount > totalAmount) {
    throw new AppError("Giảm trừ BHYT không được lớn hơn tổng tiền", 400);
  }

  if (!appointment.hasBHYT && discountAmount > 0) {
    throw new AppError("Lịch hẹn không có BHYT nên không được giảm trừ BHYT", 400);
  }

  if (appointment.hasBHYT && appointment.package && !appointment.package.isBHYTSupport && discountAmount > 0) {
    throw new AppError("Gói khám này không hỗ trợ giảm trừ BHYT", 400);
  }

  return {
    insuranceEligibleAmount: eligibleAmount,
    insuranceCoverageRate: coverageRate,
    insuranceDiscountAmount: discountAmount,
    insuranceRouteType: routeType,
    insuranceNote: note,
    bhytDiscount: discountAmount,
    finalAmount: totalAmount - discountAmount,
  };
};

export const invoiceSelect = {
  id: true,
  invoiceCode: true,
  barcode: true,
  totalAmount: true,
  bhytDiscount: true,
  finalAmount: true,
  insuranceEligibleAmount: true,
  insuranceCoverageRate: true,
  insuranceDiscountAmount: true,
  insuranceRouteType: true,
  insuranceNote: true,
  status: true,
  paymentMethod: true,
  paidAt: true,
  refundReason: true,
  refundedAt: true,
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
          isBHYTSupport: true,
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
      throw new AppError("Không tìm thấy hóa đơn", 404);
    }

    return invoice;
  }

  async createForAppointment(appointmentIdOrCode: string, input: CreateInvoiceInput) {
    const normalizedAppointmentKey = appointmentIdOrCode.trim();
    const appointment = await prisma.appointment.findFirst({
      where: {
        OR: [
          { id: normalizedAppointmentKey },
          { bookingCode: normalizedAppointmentKey.toUpperCase() },
        ],
      },
      select: {
        id: true,
        status: true,
        patientId: true,
        hasBHYT: true,
        estimatedPrice: true,
        serviceFee: true,
        bhytDiscount: true,
        package: {
          select: {
            isBHYTSupport: true,
          },
        },
        invoice: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new AppError("Không tìm thấy lịch hẹn", 404);
    }

    if (appointment.status !== "COMPLETED") {
      throw new AppError("Chỉ có thể tạo hóa đơn cho lịch đã hoàn thành khám", 400);
    }

    if (appointment.invoice) {
      throw new AppError("Lịch hẹn này đã có hóa đơn", 409);
    }

    const totalAmount = appointment.estimatedPrice + appointment.serviceFee;
    const insurance = calculateInsurance(input, totalAmount, appointment, appointment.bhytDiscount);

    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceCode: await this.generateUniqueInvoiceCode(tx),
          barcode: await this.generateUniqueBarcode(tx),
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          totalAmount,
          bhytDiscount: insurance.bhytDiscount,
          finalAmount: insurance.finalAmount,
          insuranceEligibleAmount: insurance.insuranceEligibleAmount,
          insuranceCoverageRate: insurance.insuranceCoverageRate,
          insuranceDiscountAmount: insurance.insuranceDiscountAmount,
          insuranceRouteType: insurance.insuranceRouteType,
          insuranceNote: insurance.insuranceNote,
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
          bhytDiscount: insurance.bhytDiscount,
          finalAmount: insurance.finalAmount,
          logs: {
            create: {
              action: "INVOICE_CREATED",
              note: "Hóa đơn đã được tạo",
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

  async updateFinancials(id: string, input: UpdateInvoiceInput) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        bhytDiscount: true,
        appointment: {
          select: {
            id: true,
            hasBHYT: true,
            package: {
              select: {
                isBHYTSupport: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new AppError("Không tìm thấy hóa đơn", 404);
    }

    if (!["UNPAID", "CANCELLED"].includes(invoice.status)) {
      throw new AppError("Chỉ có thể chỉnh sửa hóa đơn chưa thanh toán hoặc đã hủy", 400);
    }

    const insurance = calculateInsurance(input, invoice.totalAmount, invoice.appointment, invoice.bhytDiscount);

    return prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: {
          id: invoice.appointment.id,
        },
        data: {
          bhytDiscount: insurance.bhytDiscount,
          finalAmount: insurance.finalAmount,
          logs: {
            create: {
              action: "INVOICE_CREATED",
              note: invoice.status === "CANCELLED"
                ? "Hóa đơn đã được điều chỉnh và mở lại"
                : "Hóa đơn đã được điều chỉnh",
            },
          },
        },
      });

      return tx.invoice.update({
        where: { id },
        data: {
          status: "UNPAID",
          bhytDiscount: insurance.bhytDiscount,
          finalAmount: insurance.finalAmount,
          insuranceEligibleAmount: insurance.insuranceEligibleAmount,
          insuranceCoverageRate: insurance.insuranceCoverageRate,
          insuranceDiscountAmount: insurance.insuranceDiscountAmount,
          insuranceRouteType: insurance.insuranceRouteType,
          insuranceNote: insurance.insuranceNote,
        },
        select: invoiceSelect,
      });
    });
  }

  async pay(id: string, input: PayInvoiceInput) {
    const invoice = await this.getById(id);

    if (invoice.status !== "UNPAID") {
      throw new AppError("Chỉ có thể thanh toán hóa đơn chưa thanh toán", 400);
    }

    if (["MOMO", "VNPAY"].includes(input.paymentMethod)) {
      throw new AppError("MOMO/VNPAY phải thanh toán qua API online payment", 400);
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
      throw new AppError("Chỉ có thể hủy hóa đơn chưa thanh toán", 400);
    }

    return prisma.invoice.update({
      where: { id },
      data: {
        status: "CANCELLED",
      },
      select: invoiceSelect,
    });
  }

  async refund(id: string, input: RefundInvoiceInput) {
    const invoice = await this.getById(id);

    if (invoice.status !== "PAID") {
      throw new AppError("Chỉ có thể hoàn tiền hóa đơn đã thanh toán", 400);
    }

    if (invoice.finalAmount <= 0) {
      throw new AppError("Hóa đơn không có số tiền để hoàn", 400);
    }

    return prisma.invoice.update({
      where: { id },
      data: {
        status: "REFUNDED",
        refundReason: input.refundReason.trim(),
        refundedAt: new Date(),
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

    throw new AppError("Không thể tạo mã hóa đơn", 500);
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

    throw new AppError("Không thể tạo mã vạch hóa đơn", 500);
  }
}

export default new InvoiceService();
