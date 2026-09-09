import "server-only";

import { withOrganization, type Tx } from "@/db/client";
import { BusinessError, NotFound } from "@/shared/errors";
import { calculateAllocations } from "./domain";
import type { SaleInput } from "./schema";
import type { Sale } from "./types";

async function loadClient(tx: Tx, contactId: string) {
  const contact = await tx.contact.findUnique({ where: { id: contactId } });
  if (!contact) throw new NotFound("Cliente");
  if (contact.contactType !== "CLIENT") {
    throw new BusinessError("O contato selecionado não é do tipo Cliente.", "contactId");
  }
  return contact;
}

async function loadIncomeCategory(tx: Tx, categoryId: string) {
  const category = await tx.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new NotFound("Categoria");
  if (category.type !== "INCOME") {
    throw new BusinessError("A categoria selecionada não é de entrada.", "categoryId");
  }
  return category;
}

async function loadBankAccount(tx: Tx, bankAccountId: string) {
  const bankAccount = await tx.bankAccount.findUnique({ where: { id: bankAccountId } });
  if (!bankAccount) throw new NotFound("Conta bancária");
  return bankAccount;
}

async function loadBeneficiaries(tx: Tx, beneficiaryIds: string[]) {
  if (beneficiaryIds.length === 0) return [];
  const uniqueIds = [...new Set(beneficiaryIds)];
  const beneficiaries = await tx.contact.findMany({ where: { id: { in: uniqueIds } } });
  if (beneficiaries.length !== uniqueIds.length) {
    throw new BusinessError("Um dos favorecidos selecionados não foi encontrado.");
  }
  const notBeneficiary = beneficiaries.find((b) => b.contactType !== "BENEFICIARY");
  if (notBeneficiary) {
    throw new BusinessError(`"${notBeneficiary.name}" não é um contato do tipo Favorecido.`);
  }
  return beneficiaries;
}

export async function createSale(organizationId: string, input: SaleInput): Promise<Sale> {
  return withOrganization(organizationId, async (tx) => {
    await loadClient(tx, input.contactId);
    await loadIncomeCategory(tx, input.categoryId);
    await loadBankAccount(tx, input.bankAccountId);
    await loadBeneficiaries(
      tx,
      input.allocations.map((a) => a.beneficiaryId),
    );

    // RN-17 only applies to INSTALLMENTS, where `totalAmount` is a total to
    // divide. For RECURRING it's the amount charged every period — entries
    // don't have to sum to it, and can legitimately diverge after a manual
    // edit (e.g. one occurrence with a one-off discount).
    if (input.billingType === "INSTALLMENTS") {
      const installmentsTotal = input.installments.reduce((sum, i) => sum + i.amount, 0);
      if (installmentsTotal !== input.totalAmount) {
        throw new BusinessError(
          "A soma das parcelas deve corresponder ao valor total da venda.",
          "installments",
        );
      }
    }

    const allocations = calculateAllocations(
      input.totalAmount,
      input.allocationMode ?? "PERCENTAGE",
      input.allocations,
    );

    const sale = await tx.sale.create({
      data: {
        organizationId,
        contactId: input.contactId,
        categoryId: input.categoryId,
        bankAccountId: input.bankAccountId,
        description: input.description,
        totalAmount: input.totalAmount,
        paymentMethod: input.paymentMethod,
        billingType: input.billingType,
        installmentsCount: input.installmentsCount,
        billingFrequency: input.billingFrequency,
        firstDueDate: input.firstDueDate,
        recurrenceEndDate: input.billingType === "RECURRING" ? (input.recurrenceEndDate ?? null) : null,
        entries: {
          create: input.installments.map((installment) => ({
            organizationId,
            contactId: input.contactId,
            categoryId: input.categoryId,
            bankAccountId: input.bankAccountId,
            installmentNumber: installment.installmentNumber,
            type: "RECEIVABLE",
            description: input.description,
            dueDate: installment.dueDate,
            amount: installment.amount,
            paymentMethod: input.paymentMethod,
          })),
        },
        allocations: {
          create: allocations.map((allocation) => ({
            organizationId,
            beneficiaryId: allocation.beneficiaryId,
            mode: allocation.mode,
            percentage: allocation.percentage,
            amount: allocation.amount,
            order: allocation.order,
          })),
        },
      },
      include: { entries: { orderBy: { installmentNumber: "asc" } }, allocations: { orderBy: { order: "asc" } } },
    });

    return {
      id: sale.id,
      contactId: sale.contactId,
      categoryId: sale.categoryId,
      bankAccountId: sale.bankAccountId,
      description: sale.description,
      totalAmount: sale.totalAmount,
      paymentMethod: sale.paymentMethod,
      billingType: sale.billingType,
      installmentsCount: sale.installmentsCount,
      billingFrequency: sale.billingFrequency,
      firstDueDate: sale.firstDueDate,
      recurrenceEndDate: sale.recurrenceEndDate,
      entries: sale.entries.map((entry) => ({
        installmentNumber: entry.installmentNumber ?? 1,
        dueDate: entry.dueDate,
        amount: entry.amount,
      })),
      allocations: sale.allocations.map((allocation) => ({
        beneficiaryId: allocation.beneficiaryId,
        mode: allocation.mode,
        percentage: allocation.percentage,
        amount: allocation.amount,
        order: allocation.order,
      })),
    };
  });
}
