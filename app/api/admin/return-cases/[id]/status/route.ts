import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../../../lib/apiAuth";
import { updateReturnCaseStatus, type ReturnCaseStatus } from "../../../../../../lib/returnsService";

const VALID_STATUSES: ReturnCaseStatus[] = ["proof_pending", "proof_complete", "dispute_open", "resolved"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;
  const caseId = Number(id);
  if (!Number.isInteger(caseId)) {
    return NextResponse.json({ error: "id must be an integer." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const status = body?.status;
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}.` },
      { status: 400 }
    );
  }

  try {
    const updated = await updateReturnCaseStatus(
      { id: session.user.id, name: session.user.name ?? "Admin", email: session.user.email },
      caseId,
      status
    );
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not update this return case." },
      { status: 502 }
    );
  }
}
