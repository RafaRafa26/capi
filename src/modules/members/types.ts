import type { Role } from "@/modules/auth/permissions";

export type Member = {
  /** Membership id — what role changes and removals refer to. */
  id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
};

export type PendingInvitation = {
  id: string;
  email: string;
  role: Role;
  expiresAt: Date;
  expired: boolean;
  createdAt: Date;
};

/** What the invitation link shows before it's accepted. */
export type InvitationPreview = {
  organizationId: string;
  organizationName: string;
  email: string;
  role: Role;
  status: "PENDING" | "EXPIRED" | "ACCEPTED" | "REVOKED";
};
