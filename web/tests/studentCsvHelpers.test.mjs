import test from "node:test";
import assert from "node:assert/strict";
import {
  generateStudentCsvTemplate,
  parseStudentCsv,
  STUDENT_CSV_HEADERS,
} from "../src/features/college-admin/views/studentCsvHelpers.ts";

const departments = [
  {
    id: "dept-cse",
    collegeId: "col-1",
    code: "CSE",
    name: "Computer Science",
    intakeQuota: 120,
    studentCount: 0,
    facultyCount: 0,
    isActive: true,
  },
  {
    id: "dept-ece",
    collegeId: "col-1",
    code: "ECE",
    name: "Electronics",
    intakeQuota: 60,
    studentCount: 0,
    facultyCount: 0,
    isActive: true,
  },
];

const programs = [
  {
    id: "prog-btech",
    collegeId: "col-1",
    level: "UG",
    code: "BTECH",
    name: "B.Tech",
    totalSemesters: 8,
    isActive: true,
    departmentCount: 2,
  },
];

const canonicalHeaderLine = STUDENT_CSV_HEADERS.join(",");

function row(overrides = {}) {
  return {
    StudentName: "Aarav Sharma",
    Email: "aarav.sharma@sistec.ac.in",
    StudentNumber: "0176CS231001",
    DepartmentCode: "CSE",
    Program: "BTECH",
    AdmissionYear: "2023",
    CurrentSemester: "5",
    ...overrides,
  };
}

function csvFromRows(rows, headers = STUDENT_CSV_HEADERS) {
  const escape = (value) => {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\r\n");
}

test("canonical student CSV schema is exactly the seven supported columns", () => {
  assert.deepEqual([...STUDENT_CSV_HEADERS], [
    "StudentName",
    "Email",
    "StudentNumber",
    "DepartmentCode",
    "Program",
    "AdmissionYear",
    "CurrentSemester",
  ]);

  const csv = generateStudentCsvTemplate(departments);
  const parsed = parseStudentCsv(csv, departments, programs);
  assert.equal(parsed.headerError, null);
  assert.deepEqual(parsed.headers, [...STUDENT_CSV_HEADERS]);
  assert.equal(parsed.rows.length, 2);
  assert.ok(parsed.rows.every((r) => r.isValid && r.status === "new"));
  assert.equal(csv.split("\r\n")[0], `\uFEFF${canonicalHeaderLine}`);
});

test("parseStudentCsv handles RFC 4180 quoting, escaped quotes, CRLF/LF, and BOM", () => {
  const csv =
    `\uFEFF${canonicalHeaderLine}\r\n` +
    '"Sharma, Aarav ""A.""",AARAV.SHARMA@SISTEC.AC.IN,0176CS231001,cse,BTECH,2023,5\n' +
    "Diya Verma,diya.verma@sistec.ac.in,0176EC231002,ECE,B.Tech,2023,5\r\n";

  const parsed = parseStudentCsv(csv, departments, programs);
  assert.equal(parsed.headerError, null);
  assert.equal(parsed.rows.length, 2);

  assert.equal(parsed.rows[0].studentName, 'Sharma, Aarav "A."');
  assert.equal(parsed.rows[0].email, "aarav.sharma@sistec.ac.in");
  assert.equal(parsed.rows[0].studentNumber, "0176CS231001");
  assert.equal(parsed.rows[0].departmentCode, "CSE");
  assert.equal(parsed.rows[0].currentSemester, 5);
  assert.equal(parsed.rows[0].isValid, true);

  assert.equal(parsed.rows[1].program, "B.Tech");
  assert.equal(parsed.rows[1].isValid, true);
});

test("parseStudentCsv rejects malformed RFC 4180 input", () => {
  const unclosed = parseStudentCsv(`${canonicalHeaderLine}\r\n"Broken,Student,s123,CSE,BTECH,2023,5`, departments, programs);
  assert.match(unclosed.headerError, /unclosed quoted field/i);
  assert.deepEqual(unclosed.rows, []);

  const badQuote = parseStudentCsv(`${canonicalHeaderLine}\r\nAarav" Sharma,a@sistec.ac.in,s123,CSE,BTECH,2023,5`, departments, programs);
  assert.match(badQuote.headerError, /unexpected quote/i);
  assert.deepEqual(badQuote.rows, []);
});

test("parseStudentCsv validates AdmissionYear range", () => {
  const parsed = parseStudentCsv(
    csvFromRows([
      row({ Email: "year1@sistec.ac.in", StudentNumber: "S001", AdmissionYear: "20AB" }),
      row({ Email: "year2@sistec.ac.in", StudentNumber: "S002", AdmissionYear: "1980" }),
      row({ Email: "year3@sistec.ac.in", StudentNumber: "S003", AdmissionYear: "2101" }),
      row({ Email: "year4@sistec.ac.in", StudentNumber: "S004", AdmissionYear: "2023" }),
    ]),
    departments,
    programs
  );

  assert.equal(parsed.headerError, null);
  assert.equal(parsed.rows.length, 4);
  assert.match(parsed.rows[0].validationError, /AdmissionYear/);
  assert.match(parsed.rows[1].validationError, /AdmissionYear/);
  assert.match(parsed.rows[2].validationError, /AdmissionYear/);
  assert.equal(parsed.rows[3].isValid, true);
  assert.equal(parsed.rows[3].admissionYear, "2023");
});

test("parseStudentCsv validates CurrentSemester between 1 and 12", () => {
  const parsed = parseStudentCsv(
    csvFromRows([
      row({ Email: "sem1@sistec.ac.in", StudentNumber: "S101", CurrentSemester: "0" }),
      row({ Email: "sem2@sistec.ac.in", StudentNumber: "S102", CurrentSemester: "13" }),
      row({ Email: "sem3@sistec.ac.in", StudentNumber: "S103", CurrentSemester: "six" }),
      row({ Email: "sem4@sistec.ac.in", StudentNumber: "S104", CurrentSemester: "12" }),
    ]),
    departments,
    programs
  );

  assert.equal(parsed.rows.length, 4);
  assert.match(parsed.rows[0].validationError, /CurrentSemester/);
  assert.match(parsed.rows[1].validationError, /CurrentSemester/);
  assert.match(parsed.rows[2].validationError, /CurrentSemester/);
  assert.equal(parsed.rows[3].isValid, true);
  assert.equal(parsed.rows[3].currentSemester, 12);
});

test("parseStudentCsv validates Program against the loaded programs collection", () => {
  const csv = csvFromRows([
    row({ Email: "p1@sistec.ac.in", StudentNumber: "S201", Program: "BTECH" }),
    row({ Email: "p2@sistec.ac.in", StudentNumber: "S202", Program: "B.Tech" }),
    row({ Email: "p3@sistec.ac.in", StudentNumber: "S203", Program: "UNKNOWN" }),
  ]);

  const withPrograms = parseStudentCsv(csv, departments, programs);
  assert.equal(withPrograms.rows[0].isValid, true);
  assert.equal(withPrograms.rows[1].isValid, true);
  assert.match(withPrograms.rows[2].validationError, /Unknown Program/);

  // Without loaded programs, client validation is intentionally permissive; the server still validates.
  const withoutPrograms = parseStudentCsv(csv, departments, []);
  assert.ok(withoutPrograms.rows.every((r) => r.isValid));
});

test("parseStudentCsv rejects security-sensitive headers", () => {
  for (const header of ["Role", "IsHOD", "Password", "PasswordHash", "UserId", "CollegeId", "IsActive"]) {
    const headers = [...STUDENT_CSV_HEADERS, header];
    const parsed = parseStudentCsv(csvFromRows([row()], headers), departments, programs);
    assert.ok(parsed.headerError, `Expected ${header} to be rejected`);
    assert.match(parsed.headerError, /Security-sensitive column/);
    assert.deepEqual(parsed.rows, []);
  }
});

test("parseStudentCsv normalizes emails and rejects invalid/placeholder/domainless addresses", () => {
  const parsed = parseStudentCsv(
    csvFromRows([
      row({ Email: "  AARAV.SHARMA@SISTEC.AC.IN  ", StudentNumber: "S301" }),
      row({ Email: "not-an-email", StudentNumber: "S302" }),
      row({ Email: "someone@example.com", StudentNumber: "S303" }),
      row({ Email: "someone@nodot", StudentNumber: "S304" }),
    ]),
    departments,
    programs
  );

  assert.equal(parsed.rows[0].email, "aarav.sharma@sistec.ac.in");
  assert.equal(parsed.rows[0].isValid, true);
  assert.match(parsed.rows[1].validationError, /email/i);
  assert.match(parsed.rows[2].validationError, /Placeholder domain/);
  assert.match(parsed.rows[3].validationError, /email/i);
});

test("parseStudentCsv detects duplicate emails and StudentNumbers case-insensitively", () => {
  const parsed = parseStudentCsv(
    csvFromRows([
      row({ Email: "first@sistec.ac.in", StudentNumber: "0176cs231001" }),
      row({ Email: "FIRST@SISTEC.AC.IN", StudentNumber: "0176CS231002" }),
      row({ Email: "second@sistec.ac.in", StudentNumber: "0176CS231001" }),
    ]),
    departments,
    programs
  );

  assert.equal(parsed.rows.length, 3);
  assert.equal(parsed.rows[0].isValid, true);
  assert.match(parsed.rows[1].validationError, /Duplicate Email/);
  assert.match(parsed.rows[2].validationError, /Duplicate StudentNumber/);
});
