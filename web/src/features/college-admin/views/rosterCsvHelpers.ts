import type {
  CollegeStaffDto,
  DepartmentDto,
  FacultyDesignation,
} from "../../../lib/api/types";

export const ROSTER_CSV_HEADERS = [
  "FullName",
  "Email",
  "DepartmentCode",
  "Designation",
] as const;

export const SUPPORTED_DESIGNATIONS: readonly FacultyDesignation[] = [
  "Professor",
  "AssociateProfessor",
  "AssistantProfessor",
  "AdjunctFaculty",
  "Lecturer",
] as const;

export const DISALLOWED_SECURITY_CSV_HEADERS = new Set([
  "role",
  "ishod",
  "iscollegeadmin",
  "password",
  "passwordhash",
  "userid",
  "tenantid",
  "collegeid",
  "isactivated",
  "isemailverified",
  "isactive",
  "createdat",
  "createdatutc",
]);

export const MAX_ROSTER_FILE_BYTES = 1024 * 1024; // 1 MB
export const MAX_ROSTER_ROWS = 500;
const MAX_FULL_NAME_LENGTH = 150;
const MAX_EMAIL_LENGTH = 254;

export type RosterRowStatus = "new" | "update" | "invalid";

export interface ParsedRosterRow {
  rowNumber: number;
  fullName: string;
  email: string;
  departmentCode: string;
  designation: FacultyDesignation | "";
  rawDesignation: string;
  status: RosterRowStatus;
  isValid: boolean;
  validationError?: string;
}

export interface ParsedRosterCsvResult {
  headers: string[];
  headerError: string | null;
  rows: ParsedRosterRow[];
}

export function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export interface InstitutionalEmailPolicy {
  ssoDomain?: string | null;
  enforceStrictSso?: boolean;
}

const PLACEHOLDER_EXACT_DOMAINS = new Set([
  "localhost",
  "example.com",
  "example.org",
  "example.net",
  "example.edu",
]);

const PLACEHOLDER_DOMAIN_SUFFIXES = [
  ".example",
  ".example.com",
  ".example.org",
  ".example.net",
  ".example.edu",
  ".test",
  ".invalid",
  ".localhost",
  ".local",
];

export function generateRosterCsvTemplate(
  departments: DepartmentDto[] = [],
  ssoDomain?: string | null
): string {
  const firstDept = departments[0]?.code || "CSE";
  const secondDept = departments[1]?.code || firstDept;
  const cleanedDomain = ssoDomain?.trim().replace(/^@+/, "").toLowerCase();
  const templateDomain =
    cleanedDomain &&
    !PLACEHOLDER_EXACT_DOMAINS.has(cleanedDomain) &&
    !PLACEHOLDER_DOMAIN_SUFFIXES.some((suffix) => cleanedDomain.endsWith(suffix))
      ? cleanedDomain
      : "institution.edu.in";

  const rows: string[][] = [
    [...ROSTER_CSV_HEADERS],
    ["Dr. Asha Verma", `asha.verma@${templateDomain}`, firstDept, "Professor"],
    ["Sharma, Dr. Priya", `priya.sharma@${templateDomain}`, secondDept, "AssociateProfessor"],
    ["Prof. Arjun Mehta", `arjun.mehta@${templateDomain}`, firstDept, "AssistantProfessor"],
  ];
  return "\uFEFF" + rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n") + "\r\n";
}

interface RawCsvParseResult {
  records: string[][];
  error: string | null;
}

export function parseRfc4180Csv(rawText: string): RawCsvParseResult {
  if (typeof rawText !== "string") {
    return { records: [], error: "Unable to read CSV content." };
  }

  if (rawText.includes("\0") || rawText.includes("\uFFFD")) {
    return {
      records: [],
      error: "Invalid file encoding detected. Please upload a valid UTF-8 encoded CSV file.",
    };
  }

  const text = rawText.replace(/^\uFEFF/, "");
  if (!text.trim()) {
    return { records: [], error: "CSV file is empty." };
  }

  const records: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let fieldStartedWithQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
      continue;
    }

    if (ch === '"') {
      if (currentField.length > 0 && !fieldStartedWithQuote) {
        return {
          records: [],
          error: "Malformed CSV: unexpected quote inside unquoted field.",
        };
      }
      inQuotes = true;
      fieldStartedWithQuote = true;
      continue;
    }

    if (ch === ",") {
      currentRow.push(currentField);
      currentField = "";
      fieldStartedWithQuote = false;
      continue;
    }

    if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && text[i + 1] === "\n") {
        i++;
      }
      currentRow.push(currentField);
      if (currentRow.some((cell) => cell.trim() !== "")) {
        records.push(currentRow);
      }
      currentRow = [];
      currentField = "";
      fieldStartedWithQuote = false;
      continue;
    }

    currentField += ch;
  }

  if (inQuotes) {
    return {
      records: [],
      error: "Malformed CSV: unclosed quoted field detected.",
    };
  }

  currentRow.push(currentField);
  if (currentRow.some((cell) => cell.trim() !== "")) {
    records.push(currentRow);
  }

  return { records, error: null };
}

function isValidEmail(email: string): boolean {
  if (!email || email.length > MAX_EMAIL_LENGTH || /\s/.test(email)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateInstitutionalEmail(
  rawEmail: string,
  policy?: InstitutionalEmailPolicy
): { valid: boolean; error?: string } {
  const trimmed = rawEmail.trim();
  if (!isValidEmail(trimmed)) {
    return { valid: false, error: "Valid institutional email is required." };
  }

  const atIndex = trimmed.lastIndexOf("@");
  const host = trimmed.slice(atIndex + 1).trim().toLowerCase();
  if (!host.includes(".") || host.startsWith(".") || host.endsWith(".") || host.includes("..")) {
    return { valid: false, error: "Valid institutional email is required." };
  }

  if (
    PLACEHOLDER_EXACT_DOMAINS.has(host) ||
    PLACEHOLDER_DOMAIN_SUFFIXES.some((suffix) => host.endsWith(suffix))
  ) {
    return {
      valid: false,
      error: `Valid email is required. Placeholder domain '${host}' is not allowed.`,
    };
  }

  return { valid: true };
}

export function validateRosterHeaders(rawHeaders: string[]): string | null {
  const trimmed = rawHeaders.map((h) => h.trim());
  const forbidden = trimmed.filter((h) => DISALLOWED_SECURITY_CSV_HEADERS.has(h.toLowerCase()));
  if (forbidden.length > 0) {
    if (forbidden.some((h) => h.toLowerCase() === "role")) {
      return "Legacy column 'Role' is not supported in the 4-column roster contract (FullName,Email,DepartmentCode,Designation). HOD appointments must be done via Department Leadership.";
    }
    return `Security-sensitive column(s) (${forbidden.join(", ")}) are not permitted in Faculty.csv.`;
  }

  const seen = new Set<string>();
  for (const h of trimmed) {
    const lower = h.toLowerCase();
    if (seen.has(lower)) {
      return `Duplicate CSV header '${h}' detected. Expected exact columns: FullName, Email, DepartmentCode, Designation.`;
    }
    seen.add(lower);
  }

  const expectedLower = ROSTER_CSV_HEADERS.map((h) => h.toLowerCase());
  const missing = ROSTER_CSV_HEADERS.filter((h) => !seen.has(h.toLowerCase()));
  const unexpected = trimmed.filter((h) => !expectedLower.includes(h.toLowerCase()));

  if (missing.length > 0 || unexpected.length > 0 || trimmed.length !== ROSTER_CSV_HEADERS.length) {
    const parts: string[] = [];
    if (missing.length > 0) parts.push(`missing: ${missing.join(", ")}`);
    if (unexpected.length > 0) parts.push(`unexpected: ${unexpected.join(", ")}`);
    return `Invalid CSV headers (${parts.join("; ")}). Expected exact columns: FullName, Email, DepartmentCode, Designation.`;
  }

  return null;
}

export function parseRosterCsv(
  rawText: string,
  departments: DepartmentDto[],
  existingUsers: CollegeStaffDto[] = [],
  emailPolicy?: InstitutionalEmailPolicy
): ParsedRosterCsvResult {
  const { records, error } = parseRfc4180Csv(rawText);
  if (error) {
    return { headers: [], headerError: error, rows: [] };
  }

  if (records.length === 0) {
    return { headers: [], headerError: "CSV header row is required.", rows: [] };
  }

  const headers = records[0].map((h) => h.trim());
  const headerError = validateRosterHeaders(headers);
  if (headerError) {
    return { headers, headerError, rows: [] };
  }

  if (records.length < 2) {
    return { headers, headerError: "CSV must contain at least one faculty data row.", rows: [] };
  }

  if (records.length - 1 > MAX_ROSTER_ROWS) {
    return {
      headers,
      headerError: `Roster import is limited to ${MAX_ROSTER_ROWS} rows per upload (found ${records.length - 1}).`,
      rows: [],
    };
  }

  const indexByHeader = new Map<string, number>();
  headers.forEach((h, idx) => indexByHeader.set(h.toLowerCase(), idx));

  const nameIdx = indexByHeader.get("fullname")!;
  const emailIdx = indexByHeader.get("email")!;
  const deptIdx = indexByHeader.get("departmentcode")!;
  const desigIdx = indexByHeader.get("designation")!;

  const validDeptCodes = new Set(departments.map((d) => d.code.trim().toUpperCase()));
  const existingByEmail = new Map<string, CollegeStaffDto>();
  existingUsers.forEach((u) => {
    existingByEmail.set(u.email.trim().toLowerCase(), u);
  });

  const seenEmails = new Set<string>();
  const rows: ParsedRosterRow[] = [];

  for (let r = 1; r < records.length; r++) {
    const cols = records[r];
    const rowNumber = r;

    if (cols.length !== headers.length) {
      rows.push({
        rowNumber,
        fullName: cols[nameIdx]?.trim() || "",
        email: cols[emailIdx]?.trim() || "",
        departmentCode: cols[deptIdx]?.trim().toUpperCase() || "",
        designation: "",
        rawDesignation: cols[desigIdx]?.trim() || "",
        status: "invalid",
        isValid: false,
        validationError: `Expected ${headers.length} columns, found ${cols.length}.`,
      });
      continue;
    }

    const fullName = cols[nameIdx].trim();
    const rawEmail = cols[emailIdx].trim();
    const normalizedEmail = rawEmail.toLowerCase();
    const departmentCode = cols[deptIdx].trim().toUpperCase();
    const rawDesignation = cols[desigIdx].trim();
    const normalizedDesignation = rawDesignation.replace(/\s+/g, "").toLowerCase();

    const matchedDesignation = SUPPORTED_DESIGNATIONS.find(
      (d) => d.toLowerCase() === normalizedDesignation
    );

    let validationError: string | undefined;
    let status: RosterRowStatus = "new";
    const emailValidation = validateInstitutionalEmail(rawEmail, emailPolicy);

    if (!fullName) {
      validationError = "FullName is required.";
    } else if (fullName.length > MAX_FULL_NAME_LENGTH) {
      validationError = `FullName exceeds ${MAX_FULL_NAME_LENGTH} characters.`;
    } else if (!emailValidation.valid) {
      validationError = emailValidation.error || "Valid email is required.";
    } else if (seenEmails.has(normalizedEmail)) {
      validationError = `Duplicate Email '${normalizedEmail}' in file.`;
    } else if (!departmentCode) {
      validationError = "DepartmentCode is required.";
    } else if (!validDeptCodes.has(departmentCode)) {
      validationError = `Unknown DepartmentCode '${departmentCode}'.`;
    } else if (!matchedDesignation) {
      validationError = `Unsupported Designation '${rawDesignation || "(empty)"}'.`;
    } else {
      const existing = existingByEmail.get(normalizedEmail);
      if (existing) {
        if (existing.role !== "Faculty") {
          validationError = `Conflicts with existing ${existing.role} account (protected role cannot be modified).`;
        } else {
          status = "update";
        }
      }
    }

    if (isValidEmail(rawEmail)) {
      seenEmails.add(normalizedEmail);
    }

    if (validationError) {
      status = "invalid";
    }

    rows.push({
      rowNumber,
      fullName,
      email: normalizedEmail || rawEmail,
      departmentCode,
      designation: matchedDesignation ?? "",
      rawDesignation,
      status,
      isValid: !validationError,
      validationError,
    });
  }

  return { headers, headerError: null, rows };
}

export function applyBackendRowErrors(
  rows: ParsedRosterRow[],
  backendErrors: string[]
): ParsedRosterRow[] {
  if (!backendErrors || backendErrors.length === 0) return rows;

  const rowErrorMap = new Map<number, string>();
  for (const err of backendErrors) {
    const match = /^Row\s+(\d+)\s*:\s*(.+)$/i.exec(err.trim());
    if (match) {
      const rowNum = Number.parseInt(match[1], 10);
      if (!Number.isNaN(rowNum) && !rowErrorMap.has(rowNum)) {
        rowErrorMap.set(rowNum, match[2].trim());
      }
    }
  }

  if (rowErrorMap.size === 0) return rows;

  return rows.map((row) => {
    const backendError = rowErrorMap.get(row.rowNumber);
    if (!backendError) return row;
    return {
      ...row,
      status: "invalid",
      isValid: false,
      validationError: row.validationError || backendError,
    };
  });
}
