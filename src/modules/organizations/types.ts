import type { Role } from "@/modules/auth/permissions";

/** An organization as seen by one of its members. */
export type UserOrganization = {
  id: string;
  name: string;
  document: string;
  role: Role;
};
