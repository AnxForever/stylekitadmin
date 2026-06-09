import { NextResponse } from "next/server";
import { z } from "zod";
import {
  approveSubmission,
  rejectSubmission,
  isValidSubmissionId,
  type SubmissionRecord,
} from "@/lib/submit/reviewer";
import {
  isSupabaseConfigured,
  approveSubmissionSupabase,
  rejectSubmissionSupabase,
} from "@/lib/submit/reviewer-supabase";
import { autoRegisterStyle, type AutoRegisterResult } from "@/lib/submit/auto-register";
import { checkAdminApiAccess } from "@/lib/auth/admin-api";
import { recordAdminAuditEvent } from "@/lib/admin/audit-log";
import { verifyTrustedOrigin } from "@/lib/security/request-origin";
import { parseJsonBodyWithLimit } from "@/lib/security/json-body";
import { getStyleBySlug } from "@/lib/styles";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(),
});
const MAX_BODY_BYTES = 16 * 1024;
const REGISTER_RETRY_HINT =
  "Submission approved, but auto-registration failed. Use /api/submit/[id]/register to retry.";

function buildEmptyRegisterResult(): AutoRegisterResult {
  return {
    success: true,
    filesWritten: [],
    registriesPatched: [],
    errors: [],
  };
}

async function tryAutoRegister(
  submission: SubmissionRecord
): Promise<{ registration: AutoRegisterResult; skipped: boolean }> {
  if (getStyleBySlug(submission.slug)) {
    return {
      registration: buildEmptyRegisterResult(),
      skipped: true,
    };
  }

  try {
    return {
      registration: await autoRegisterStyle(submission),
      skipped: false,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown registration error";
    return {
      registration: {
        success: false,
        filesWritten: [],
        registriesPatched: [],
        errors: [message],
      },
      skipped: false,
    };
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const originCheck = verifyTrustedOrigin(request);
    if (!originCheck.ok) {
      return NextResponse.json(
        { success: false, error: originCheck.error },
        { status: originCheck.status ?? 403 }
      );
    }

    const access = await checkAdminApiAccess(request);
    if (!access.allowed) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status ?? 403 }
      );
    }

    const { id } = await params;

    if (!isValidSubmissionId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid submission ID" },
        { status: 400 }
      );
    }

    const bodyResult = await parseJsonBodyWithLimit(request, {
      maxBytes: MAX_BODY_BYTES,
      tooLargeMessage: "Review payload is too large.",
      invalidJsonMessage: "Invalid request body",
    });
    if (!bodyResult.ok) {
      return NextResponse.json(
        { success: false, error: bodyResult.error },
        { status: bodyResult.status }
      );
    }

    const parsed = reviewSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { action, note } = parsed.data;

    const useSupabase = isSupabaseConfigured();

    if (action === "approve") {
      const result = useSupabase
        ? await approveSubmissionSupabase(id, note)
        : await approveSubmission(id, note);

      if (!result) {
        return NextResponse.json(
          { success: false, error: "Submission not found" },
          { status: 404 }
        );
      }

      const { registration, skipped } = await tryAutoRegister(result);

      await recordAdminAuditEvent(request, {
        action: "submission.approve",
        targetType: "submission",
        targetId: id,
        actor: access.actor,
        metadata: {
          slug: result.slug,
          noteProvided: typeof note === "string" && note.length > 0,
          registrationSuccess: registration.success,
          registrationSkipped: skipped,
          registrationErrors: registration.errors.length,
        },
      });

      await recordAdminAuditEvent(request, {
        action: "submission.register",
        targetType: "submission",
        targetId: id,
        actor: access.actor,
        metadata: {
          slug: result.slug,
          filesWritten: registration.filesWritten.length,
          registriesPatched: registration.registriesPatched.length,
          errors: registration.errors,
          success: registration.success,
          skipped,
        },
      });

      return NextResponse.json({
        success: true,
        submission: result,
        registration,
        registrationSkipped: skipped,
        warning: registration.success ? null : REGISTER_RETRY_HINT,
      });
    }

    if (action === "reject") {
      const result = useSupabase
        ? await rejectSubmissionSupabase(id, note)
        : await rejectSubmission(id, note);

      if (!result) {
        return NextResponse.json(
          { success: false, error: "Submission not found" },
          { status: 404 }
        );
      }

      await recordAdminAuditEvent(request, {
        action: "submission.reject",
        targetType: "submission",
        targetId: id,
        actor: access.actor,
        metadata: {
          slug: result.slug,
          noteProvided: typeof note === "string" && note.length > 0,
        },
      });

      return NextResponse.json({ success: true, submission: result });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use 'approve' or 'reject'" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
