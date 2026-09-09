export type PersonType = "INDIVIDUAL" | "COMPANY"
export type ContactType = "CLIENT" | "SUPPLIER" | "BENEFICIARY" | "EMPLOYEE" | "PARTNER"

export interface BankDetails {
  pixKey: string
  bank: string
  branchNumber: string
  accountNumber: string
  accountType: string
  accountHolder: string
}

export interface Contact {
  id: string
  name: string
  legalName: string | null
  document: string | null
  personType: PersonType
  contactType: ContactType
  phone: string | null
  email: string | null
  city: string | null
  state: string | null
  bankDetails: BankDetails | null
  active: boolean
}
