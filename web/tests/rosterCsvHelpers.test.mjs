import test from "node:test";
import assert from "node:assert/strict";
import {
  applyBackendRowErrors,
  generateRosterCsvTemplate,
  MAX_ROSTER_ROWS,
  parseRosterCsv,
  ROSTER_CSV_HEADERS,
} from "../src/features/college-admin/views/rosterCsvHelpers.ts";

const departments = [
  {
    id: "dept-cse",
    collegeId: "col-1",
    code: "CSE",
    name: "Computer Science",
    intakeQuota: 120,
    studentCount: 0,
    facultyCount: 0,
    isSarAttested: false,
  },
  {
    id: "dept-ece",
    collegeId: "col-1",
    code: "ECE",
    name: "Electronics",
    intakeQuota: 60,
    studentCount: 0,
    facultyCount: 0,
    isSarAttested: false,
  },
];

const existingUsers = [
  {
    id: "fac-1",
    fullName: "Dr. Existing Faculty",
    email: "existing.fac@sistec.ac.in",
    role: "Faculty",
    designation: "AssistantProfessor",
    departmentId: "dept-cse",
    isActive: true,
    isActivated: true,
    createdAtUtc: "2026-01-01T00:00:00Z",
  },
  {
    id: "hod-1",
    fullName: "Dr. Current HOD",
    email: "hod@sistec.ac.in",
    role: "HOD",
    designation: "Professor",
    departmentId: "dept-cse",
    isActive: true,
    isActivated: true,
    createdAtUtc: "2026-01-01T00:00:00Z",
  },
];

test("generateRosterCsvTemplate emits exact 4-column header and valid UTF-8 RFC 4180 CSV", () => {
  const csv = generateRosterCsvTemplate(departments, "sistec.ac.in");
  const parsed = parseRosterCsv(csv, departments, [], {
    ssoDomain: "sistec.ac.in",
    enforceStrictSso: true,
  });
  assert.equal(parsed.headerError, null);
  assert.deepEqual(parsed.headers, [...ROSTER_CSV_HEADERS]);
  assert.equal(parsed.rows.length, 3);
  assert.ok(parsed.rows.every((r) => r.isValid && r.status === "new"));
  assert.ok(parsed.rows.every((r) => r.email.endsWith("@sistec.ac.in")));
});

test("parseRosterCsv handles quoted commas, escaped quotes, CRLF/LF, and BOM", () => {
  const csv =
    '\uFEFFFullName,Email,DepartmentCode,Designation\r\n' +
    '"Sharma, Dr. ""R. K.""",rk.sharma@sistec.ac.in,cse,Professor\n' +
    'Dr. Existing Faculty,  EXISTING.FAC@sistec.ac.in ,ECE,Associate Professor\r\n';

  const result = parseRosterCsv(csv, departments, existingUsers);
  assert.equal(result.headerError, null);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].fullName, 'Sharma, Dr. "R. K."');
  assert.equal(result.rows[0].departmentCode, "CSE");
  assert.equal(result.rows[0].status, "new");
  assert.equal(result.rows[1].email, "existing.fac@sistec.ac.in");
  assert.equal(result.rows[1].designation, "AssociateProfessor");
  assert.equal(result.rows[1].status, "update");
});

test("parseRosterCsv rejects missing, duplicate, security-sensitive, and legacy Role headers", () => {
  const legacy = parseRosterCsv(
    "FullName,Email,Role,DepartmentCode,Designation\nA,a@b.edu,HOD,CSE,Professor\n",
    departments
  );
  assert.match(legacy.headerError ?? "", /Legacy column 'Role'/i);

  const sec = parseRosterCsv(
    "FullName,Email,CollegeId,DepartmentCode,Designation\nA,a@b.edu,123,CSE,Professor\n",
    departments
  );
  assert.match(sec.headerError ?? "", /Security-sensitive column/i);

  const dup = parseRosterCsv(
    "FullName,Email,Email,Designation\nA,a@b.edu,a@b.edu,Professor\n",
    departments
  );
  assert.match(dup.headerError ?? "", /Duplicate CSV header/i);

  const missing = parseRosterCsv(
    "FullName,Email,DepartmentCode\nA,a@b.edu,CSE\n",
    departments
  );
  assert.match(missing.headerError ?? "", /missing: Designation/i);

  const legacyOfficial = parseRosterCsv(
    "FullName,OfficialEmail,DepartmentCode,Designation\nA,a@b.edu,CSE,Professor\n",
    departments
  );
  assert.match(legacyOfficial.headerError ?? "", /Invalid CSV headers/i);

  const legacyRegistered = parseRosterCsv(
    "FullName,RegisteredEmail,DepartmentCode,Designation\nA,a@b.edu,CSE,Professor\n",
    departments
  );
  assert.match(legacyRegistered.headerError ?? "", /Invalid CSV headers/i);
});

test("parseRosterCsv rejects malformed CSV, invalid encoding, and row-count overflow", () => {
  const unclosed = parseRosterCsv(
    'FullName,Email,DepartmentCode,Designation\n"Unclosed,a@b.edu,CSE,Professor\n',
    departments
  );
  assert.match(unclosed.headerError ?? "", /unclosed quoted field/i);

  const badEncoding = parseRosterCsv(
    "FullName,Email,DepartmentCode,Designation\nA\uFFFD,a@b.edu,CSE,Professor\n",
    departments
  );
  assert.match(badEncoding.headerError ?? "", /Invalid file encoding/i);

  const manyRows = ["FullName,Email,DepartmentCode,Designation"];
  for (let i = 0; i <= MAX_ROSTER_ROWS; i++) {
    manyRows.push(`Fac ${i},fac${i}@sistec.ac.in,CSE,Professor`);
  }
  const tooMany = parseRosterCsv(manyRows.join("\n"), departments);
  assert.match(tooMany.headerError ?? "", /limited to 500 rows/i);
});

test("parseRosterCsv flags invalid fields, duplicates, and protected role conflicts", () => {
  const csv = [
    "FullName,Email,DepartmentCode,Designation",
    ",empty@sistec.ac.in,CSE,Professor",
    "Bad Email,not-an-email,CSE,Professor",
    "Unknown Dept,u1@sistec.ac.in,MECH,Professor",
    "Bad Desig,u2@sistec.ac.in,CSE,Dean",
    "Dup 1,dup@sistec.ac.in,CSE,Professor",
    "Dup 2,DUP@sistec.ac.in,CSE,Professor",
    "Protected HOD,hod@sistec.ac.in,CSE,Professor",
  ].join("\n");

  const result = parseRosterCsv(csv, departments, existingUsers);
  assert.equal(result.headerError, null);
  assert.equal(result.rows.length, 7);
  assert.equal(result.rows[0].isValid, false);
  assert.equal(result.rows[1].isValid, false);
  assert.equal(result.rows[2].isValid, false);
  assert.equal(result.rows[3].isValid, false);
  assert.equal(result.rows[4].isValid, true);
  assert.equal(result.rows[5].isValid, false);
  assert.match(result.rows[5].validationError ?? "", /Duplicate Email/i);
  assert.equal(result.rows[6].isValid, false);
  assert.match(result.rows[6].validationError ?? "", /protected role/i);
});

test("parseRosterCsv allows personal emails in approved roster while rejecting placeholder domains", () => {
  const csv = [
    "FullName,Email,DepartmentCode,Designation",
    "Dr. Asha Verma,asha.verma@college.example.edu,CSE,Professor",
    "Dr. Priya Sharma,priya.sharma@example.com,ECE,AssociateProfessor",
    "Prof. Arjun Mehta,arjun.mehta@gmail.com,CSE,Lecturer",
    "Dr. Valid Faculty,valid.faculty@sistec.ac.in,CSE,Professor",
  ].join("\n");

  const result = parseRosterCsv(csv, departments, [], {
    ssoDomain: "sistec.ac.in",
    enforceStrictSso: true,
  });

  assert.equal(result.headerError, null);
  assert.equal(result.rows.length, 4);
  assert.equal(result.rows[0].status, "invalid");
  assert.equal(result.rows[0].isValid, false);
  assert.match(result.rows[0].validationError ?? "", /Placeholder domain/i);
  assert.equal(result.rows[1].status, "invalid");
  assert.equal(result.rows[1].isValid, false);
  assert.equal(result.rows[2].status, "new");
  assert.equal(result.rows[2].isValid, true);
  assert.equal(result.rows[2].designation, "Lecturer");
  assert.equal(result.rows[3].status, "new");
  assert.equal(result.rows[3].isValid, true);

  const invalidCount = result.rows.filter((r) => r.status === "invalid").length;
  const newCount = result.rows.filter((r) => r.status === "new").length;
  assert.equal(invalidCount, 2);
  assert.equal(newCount, 2);
});

test("applyBackendRowErrors syncs backend Row N errors into preview rows", () => {
  const csv = [
    "FullName,Email,DepartmentCode,Designation",
    "Dr. Asha Verma,asha.verma@sistec.ac.in,CSE,Professor",
    "Dr. Priya Sharma,priya.sharma@sistec.ac.in,ECE,AssociateProfessor",
  ].join("\n");

  const parsed = parseRosterCsv(csv, departments, []);
  assert.equal(parsed.rows.filter((r) => r.isValid).length, 2);

  const synced = applyBackendRowErrors(parsed.rows, [
    "Row 2: Valid institutional email is required.",
  ]);
  assert.equal(synced[0].status, "new");
  assert.equal(synced[0].isValid, true);
  assert.equal(synced[1].status, "invalid");
  assert.equal(synced[1].isValid, false);
  assert.equal(synced[1].validationError, "Valid institutional email is required.");
});
