import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prismaAdmin } from "@/db/client";
import { createTestOrganization, removeTestOrganizations, type TestOrg } from "@/db/__tests__/environment";
import { BusinessError, NotFound } from "@/shared/errors";
import { generateInstallments, generateRecurringInstallments, RECURRING_ROLLING_WINDOW } from "./domain";
import { createSale } from "./service";

let org: TestOrg;
let beneficiaryId: string;
let otherBeneficiaryId: string;

beforeAll(async () => {
  org = await createTestOrganization("Sales");
  const suffix = Date.now();
  const [beneficiary, otherBeneficiary] = await Promise.all([
    prismaAdmin.contact.create({
      data: {
        organizationId: org.id,
        name: "Test Beneficiary",
        document: `beneficiary-${suffix}`,
        personType: "INDIVIDUAL",
        contactType: "BENEFICIARY",
      },
    }),
    prismaAdmin.contact.create({
      data: {
        organizationId: org.id,
        name: "Other Beneficiary",
        document: `beneficiary-${suffix}-2`,
        personType: "INDIVIDUAL",
        contactType: "BENEFICIARY",
      },
    }),
  ]);
  beneficiaryId = beneficiary.id;
  otherBeneficiaryId = otherBeneficiary.id;
});

afterAll(async () => {
  await removeTestOrganizations([org.id]);
});

function baseInput() {
  const totalAmount = 6_000_000;
  const installmentsCount = 12;
  const billingFrequency = "MONTHLY" as const;
  const firstDueDate = new Date(2026, 7, 10);

  return {
    contactId: org.contactId,
    categoryId: org.categoryId,
    bankAccountId: org.bankAccountId,
    description: "Venda de teste",
    totalAmount,
    paymentMethod: "BOLETO" as const,
    billingType: "INSTALLMENTS" as const,
    installmentsCount,
    billingFrequency,
    firstDueDate,
    installments: generateInstallments({
      totalAmount,
      count: installmentsCount,
      firstDueDate,
      frequency: billingFrequency,
    }),
    allocations: [] as { beneficiaryId: string; value: number }[],
  };
}

describe("createSale", () => {
  it("creates a sale in 12x that sums exactly to the total, with no allocations", async () => {
    const sale = await createSale(org.id, baseInput());

    expect(sale.entries).toHaveLength(12);
    expect(sale.entries.reduce((sum, e) => sum + e.amount, 0)).toBe(6_000_000);
    expect(sale.allocations).toHaveLength(0);
  });

  it("creates a 60/40 repasse that closes on the total", async () => {
    const sale = await createSale(org.id, {
      ...baseInput(),
      allocationMode: "PERCENTAGE",
      allocations: [
        { beneficiaryId, value: 60 },
        { beneficiaryId: otherBeneficiaryId, value: 40 },
      ],
    });

    expect(sale.allocations).toHaveLength(2);
    expect(sale.allocations.reduce((sum, a) => sum + a.amount, 0)).toBe(6_000_000);
  });

  it("rejects a client that isn't a CLIENT contact", async () => {
    await expect(
      createSale(org.id, { ...baseInput(), contactId: beneficiaryId }),
    ).rejects.toThrow(BusinessError);
  });

  it("rejects a category that isn't INCOME", async () => {
    const expenseCategory = await prismaAdmin.category.create({
      data: { organizationId: org.id, name: "Despesa de teste", type: "EXPENSE" },
    });

    await expect(
      createSale(org.id, { ...baseInput(), categoryId: expenseCategory.id }),
    ).rejects.toThrow(BusinessError);
  });

  it("rejects a beneficiary that isn't a BENEFICIARY contact", async () => {
    await expect(
      createSale(org.id, {
        ...baseInput(),
        allocationMode: "PERCENTAGE",
        allocations: [{ beneficiaryId: org.contactId, value: 100 }],
      }),
    ).rejects.toThrow(BusinessError);
  });

  it("persists manually edited installments as-is", async () => {
    const input = baseInput();
    const editedDueDate = new Date(2026, 11, 25);
    input.installments[0] = { ...input.installments[0], dueDate: editedDueDate, amount: 400_000 };
    input.installments[11] = { ...input.installments[11], amount: input.installments[11].amount + 100_000 };

    const sale = await createSale(org.id, input);

    expect(sale.entries[0].dueDate.toISOString().slice(0, 10)).toBe("2026-12-25");
    expect(sale.entries[0].amount).toBe(400_000);
    expect(sale.entries.reduce((sum, e) => sum + e.amount, 0)).toBe(6_000_000);
  });

  it("rejects installments that don't sum to the sale's total", async () => {
    const input = baseInput();
    input.installments[0] = { ...input.installments[0], amount: input.installments[0].amount + 1 };

    await expect(createSale(org.id, input)).rejects.toThrow(BusinessError);
  });

  it("rejects a nonexistent bank account", async () => {
    await expect(
      createSale(org.id, {
        ...baseInput(),
        bankAccountId: "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toThrow(NotFound);
  });

  it("creates an indeterminate recurring sale with the rolling window of entries", async () => {
    const amountPerOccurrence = 50_000;
    const firstDueDate = new Date(2026, 7, 5);
    const frequency = "MONTHLY" as const;

    const sale = await createSale(org.id, {
      ...baseInput(),
      totalAmount: amountPerOccurrence,
      billingType: "RECURRING",
      billingFrequency: frequency,
      firstDueDate,
      recurrenceEndDate: null,
      installmentsCount: RECURRING_ROLLING_WINDOW,
      installments: generateRecurringInstallments({
        amountPerOccurrence,
        firstDueDate,
        frequency,
        endDate: null,
      }),
    });

    expect(sale.recurrenceEndDate).toBeNull();
    expect(sale.entries).toHaveLength(RECURRING_ROLLING_WINDOW);
    expect(sale.entries.every((e) => e.amount === amountPerOccurrence)).toBe(true);
  });

  it("creates a recurring sale bounded by an end date, one entry per period", async () => {
    const amountPerOccurrence = 20_000;
    const firstDueDate = new Date(2026, 0, 1);
    const endDate = new Date(2026, 3, 1);
    const frequency = "MONTHLY" as const;
    const installments = generateRecurringInstallments({
      amountPerOccurrence,
      firstDueDate,
      frequency,
      endDate,
    });

    const sale = await createSale(org.id, {
      ...baseInput(),
      totalAmount: amountPerOccurrence,
      billingType: "RECURRING",
      billingFrequency: frequency,
      firstDueDate,
      recurrenceEndDate: endDate,
      installmentsCount: installments.length,
      installments,
    });

    expect(sale.recurrenceEndDate?.toISOString().slice(0, 10)).toBe("2026-04-01");
    expect(sale.entries).toHaveLength(4);
    expect(sale.entries.every((e) => e.amount === amountPerOccurrence)).toBe(true);
  });

  it("does not require recurring entries to sum to the per-occurrence amount", async () => {
    const amountPerOccurrence = 50_000;
    const firstDueDate = new Date(2026, 7, 5);
    const installments = generateRecurringInstallments({
      amountPerOccurrence,
      firstDueDate,
      frequency: "MONTHLY",
      endDate: null,
    });
    installments[0] = { ...installments[0], amount: 40_000 };

    const sale = await createSale(org.id, {
      ...baseInput(),
      totalAmount: amountPerOccurrence,
      billingType: "RECURRING",
      firstDueDate,
      recurrenceEndDate: null,
      installmentsCount: installments.length,
      installments,
    });

    expect(sale.entries[0].amount).toBe(40_000);
  });
});
