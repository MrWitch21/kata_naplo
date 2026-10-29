import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'ÉÉÉÉ-HH-NN formátum')

export const clientSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  kind: z.enum(['magan', 'ceg']),
  taxNumber: z.string().default(''),
  address: z.string().default(''),
  email: z.string().default(''),
  note: z.string().default(''),
})

export const invoiceSchema = z.object({
  id: z.string(),
  number: z.string().min(1),
  clientId: z.string(),
  description: z.string().default(''),
  amount: z.number().int().nonnegative(),
  issueDate: isoDate,
  fulfillmentDate: isoDate,
  dueDate: isoDate,
  /** A befolyás napja. A KATA ezzel számol. null = még nem fizették ki. */
  paidDate: isoDate.nullable(),
  note: z.string().default(''),
})

export const profileSchema = z.object({
  name: z.string().default(''),
  address: z.string().default(''),
  taxNumber: z.string().default(''),
  registrationNumber: z.string().default(''),
  bankAccount: z.string().default(''),
  iban: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().default(''),
  /** Kötelező / ajánlott szöveg a számlára */
  invoiceNote: z.string().default('Kisadózó'),
  vatExempt: z.boolean().default(true),
  numberPattern: z.string().default('KN-{YYYY}-{N}'),
  numberPadding: z.number().int().min(1).max(8).default(3),
  paymentTermDays: z.number().int().min(0).max(120).default(8),
})

export const yearSetupSchema = z.object({
  track: z.enum(['regi', 'fo', 'mellek']),
  fromMonth: z.number().int().min(1).max(12),
  toMonth: z.number().int().min(1).max(12),
  exemptMonths: z.array(z.number().int().min(1).max(12)).default([]),
  minWagePrevYear: z.number().int().positive().optional(),
})

export const dataSchema = z.object({
  version: z.literal(1),
  profile: profileSchema,
  clients: z.array(clientSchema),
  invoices: z.array(invoiceSchema),
  years: z.record(z.string(), yearSetupSchema),
})

export type Client = z.infer<typeof clientSchema>
export type Invoice = z.infer<typeof invoiceSchema>
export type Profile = z.infer<typeof profileSchema>
export type YearConfig = z.infer<typeof yearSetupSchema>
export type AppData = z.infer<typeof dataSchema>
