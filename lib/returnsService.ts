import { signMobileToken } from "./mobileJwt";
import type { AuthenticatedUser } from "./auth";

const RETURNS_SERVICE_URL = process.env.RETURNS_SERVICE_URL ?? "http://localhost:4001";

export type ReturnCaseStatus = "proof_pending" | "proof_complete" | "dispute_open" | "resolved";

export type ProofRecord = {
  id: number;
  returnCaseId: number;
  type: "packing" | "unboxing";
  mediaUrl: string;
  uploadedBy: string;
  uploadedAt: string;
};

export type ReturnCase = {
  id: number;
  orderId: number;
  itemId: number;
  status: ReturnCaseStatus;
  createdAt: string;
  proofRecords: ProofRecord[];
};

// happy-baby-returns-protection has no admin role of its own -- it verifies
// the same JWT this app issues and checks the email against its own
// ADMIN_EMAIL allowlist. Minting one here with the *real* admin's own
// session identity (rather than some synthetic "system" user) keeps this
// consistent with every other admin action in the app, and with how the
// mobile app itself authenticates to this service.
function mintAdminToken(admin: AuthenticatedUser): string {
  return signMobileToken(admin);
}

async function parseJson<T>(response: Response, fallback: string): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? fallback);
  }
  return data;
}

export async function fetchAllReturnCases(admin: AuthenticatedUser): Promise<ReturnCase[]> {
  const response = await fetch(`${RETURNS_SERVICE_URL}/api/return-cases`, {
    headers: { Authorization: `Bearer ${mintAdminToken(admin)}` },
    cache: "no-store",
  });
  return parseJson(response, "Could not load return cases.");
}

export async function updateReturnCaseStatus(
  admin: AuthenticatedUser,
  id: number,
  status: ReturnCaseStatus
): Promise<ReturnCase> {
  const response = await fetch(`${RETURNS_SERVICE_URL}/api/return-cases/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${mintAdminToken(admin)}` },
    body: JSON.stringify({ status }),
  });
  return parseJson(response, "Could not update this return case.");
}
