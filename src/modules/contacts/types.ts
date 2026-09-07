export type PersonType = "INDIVIDUAL" | "COMPANY"

export interface Contact {
  id: string
  name: string
  document: string
  personType: PersonType
  phone: string | null
  email: string | null
  city: string | null
  state: string | null
  active: boolean
}
