import test from "node:test";
import assert from "node:assert/strict";
import {
  canFormallyCloseProject,
  canGuideReviewMilestone,
  canReopenProject,
  canStudentEditSubmission,
  canStudentSubmitMilestone,
  checkFinalVivaDeliverableGate,
  computeMemberTaskContributions,
  hasSubmissionDraftChanges,
  validateHttpUrl,
} from "../src/features/shared/projectLifecycleHelpers.ts";

test("computeMemberTaskContributions computes per-member assigned and completed counts", () => {
  const members = [
    { userId: "u1", fullName: "Asha", isTeamLead: true },
    { userId: "u2", fullName: "Rohan", isTeamLead: false },
  ];
  const tasks = [
    { assignedToUserId: "u1", status: "Done" },
    { assignedToUserId: "u1", status: "InProgress" },
    { assignedToUserId: "u2", status: "Done" },
    { assignedToUserId: undefined, status: "Todo" },
  ];

  const result = computeMemberTaskContributions(members, tasks);
  assert.deepEqual(result, [
    {
      userId: "u1",
      fullName: "Asha",
      isTeamLead: true,
      assignedCount: 2,
      completedCount: 1,
      completionPercentage: 50,
    },
    {
      userId: "u2",
      fullName: "Rohan",
      isTeamLead: false,
      assignedCount: 1,
      completedCount: 1,
      completionPercentage: 100,
    },
  ]);
});

test("validateHttpUrl accepts http/https and rejects invalid or non-http schemes", () => {
  assert.deepEqual(validateHttpUrl("https://github.com/org/repo"), { valid: true });
  assert.equal(validateHttpUrl("   ").valid, false);
  assert.equal(validateHttpUrl("ftp://example.com/file").valid, false);
  assert.equal(validateHttpUrl("not-a-url").valid, false);
});

test("milestone submission and guide review transitions respect role and status", () => {
  assert.equal(canStudentSubmitMilestone("Pending", true), true);
  assert.equal(canStudentSubmitMilestone("RevisionRequested", true), true);
  assert.equal(canStudentSubmitMilestone("SubmittedForReview", true), false);
  assert.equal(canStudentSubmitMilestone("Pending", false), false);

  assert.equal(canGuideReviewMilestone("SubmittedForReview"), true);
  assert.equal(canGuideReviewMilestone("Pending"), false);
  assert.equal(canGuideReviewMilestone("Approved"), false);
});

test("final submission edit guard and unsaved draft detection work accurately", () => {
  assert.equal(canStudentEditSubmission(undefined, true), true);
  assert.equal(canStudentEditSubmission("Draft", true), true);
  assert.equal(canStudentEditSubmission("RevisionRequested", true), true);
  assert.equal(canStudentEditSubmission("Submitted", true), false);
  assert.equal(canStudentEditSubmission("Accepted", true), false);
  assert.equal(canStudentEditSubmission("Draft", false), false);

  const saved = {
    projectTitle: "Smart Grid",
    abstract: "An intelligent microgrid controller.",
    problemStatement: "",
    methodology: "",
    implementationSummary: "",
    resultsAndConclusion: "",
    references: "",
    repositoryUrl: "",
    demoUrl: "",
  };
  assert.equal(hasSubmissionDraftChanges({ ...saved }, saved), false);
  assert.equal(
    hasSubmissionDraftChanges({ ...saved, projectTitle: "Smart Grid v2" }, saved),
    true
  );
});

test("checkFinalVivaDeliverableGate enforces verified thesis and plagiarism report for FinalViva", () => {
  const incomplete = checkFinalVivaDeliverableGate("FinalViva", [
    { slotType: "FinalThesis", status: "Verified" },
    { slotType: "PlagiarismReport", status: "Uploaded" },
  ]);
  assert.equal(incomplete.passes, false);
  assert.deepEqual(incomplete.missing, ["Plagiarism Verification Report (< 15% similarity)"]);

  const complete = checkFinalVivaDeliverableGate("FinalViva", [
    { slotType: "FinalThesis", status: "Verified" },
    { slotType: "PlagiarismReport", status: "Verified" },
  ]);
  assert.equal(complete.passes, true);
  assert.deepEqual(complete.missing, []);

  assert.equal(checkFinalVivaDeliverableGate("MidTermReview", []).passes, true);
});

test("closure and reopen transitions enforce readiness and closed state", () => {
  assert.equal(canFormallyCloseProject({ canClose: true, isClosed: false }), true);
  assert.equal(canFormallyCloseProject({ canClose: false, isClosed: false }), false);
  assert.equal(canFormallyCloseProject({ canClose: true, isClosed: true }), false);

  assert.equal(canReopenProject({ isClosed: true }), true);
  assert.equal(canReopenProject({ isClosed: false }), false);
});
