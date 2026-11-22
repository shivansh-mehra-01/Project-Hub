import { AcademicProgramLevel } from "@/lib/api/types";

export interface CatalogCourse {
  code: string;
  displayCode: string;
  name: string;
  level: AcademicProgramLevel;
  totalSemesters: number;
  category: "engineering" | "management" | "computer" | "pharmacy" | "science" | "diploma" | "design";
  icon: "monitor" | "briefcase" | "graduation" | "flask" | "palette";
}

export interface CatalogBranch {
  code: string;
  name: string;
  defaultIntake: number;
  forCourses: string[];
}

export const COURSE_CATALOG: CatalogCourse[] = [
  { code: "BTECH", displayCode: "B.Tech", name: "Bachelor of Technology", level: "UG", totalSemesters: 8, category: "engineering", icon: "monitor" },
  { code: "MTECH", displayCode: "M.Tech", name: "Master of Technology", level: "PG", totalSemesters: 4, category: "engineering", icon: "monitor" },
  { code: "BCA", displayCode: "BCA", name: "Bachelor of Computer Applications", level: "UG", totalSemesters: 6, category: "computer", icon: "monitor" },
  { code: "MCA", displayCode: "MCA", name: "Master of Computer Applications", level: "PG", totalSemesters: 4, category: "computer", icon: "monitor" },
  { code: "BBA", displayCode: "BBA", name: "Bachelor of Business Administration", level: "UG", totalSemesters: 6, category: "management", icon: "briefcase" },
  { code: "MBA", displayCode: "MBA", name: "Master of Business Administration", level: "PG", totalSemesters: 4, category: "management", icon: "briefcase" },
  { code: "BPHARM", displayCode: "B.Pharm", name: "Bachelor of Pharmacy", level: "UG", totalSemesters: 8, category: "pharmacy", icon: "flask" },
  { code: "MPHARM", displayCode: "M.Pharm", name: "Master of Pharmacy", level: "PG", totalSemesters: 4, category: "pharmacy", icon: "flask" },
  { code: "DPHARM", displayCode: "D.Pharm", name: "Diploma in Pharmacy", level: "Diploma", totalSemesters: 4, category: "diploma", icon: "graduation" },
  { code: "POLYTECHNIC", displayCode: "Polytechnic", name: "Polytechnic Diploma", level: "Diploma", totalSemesters: 6, category: "diploma", icon: "monitor" },
  { code: "BSCIT", displayCode: "B.Sc (IT)", name: "Bachelor of Science in Information Technology", level: "UG", totalSemesters: 6, category: "science", icon: "monitor" },
  { code: "MSCCS", displayCode: "M.Sc (CS)", name: "Master of Science in Computer Science", level: "PG", totalSemesters: 4, category: "science", icon: "monitor" },
  { code: "BARCH", displayCode: "B.Arch", name: "Bachelor of Architecture", level: "UG", totalSemesters: 10, category: "design", icon: "palette" },
  { code: "BDES", displayCode: "B.Des", name: "Bachelor of Design", level: "UG", totalSemesters: 8, category: "design", icon: "palette" },
  { code: "PHD", displayCode: "Ph.D", name: "Doctor of Philosophy", level: "Research", totalSemesters: 0, category: "science", icon: "graduation" },
];

export const COURSE_CATEGORIES = [
  { key: "all", label: "All Programs" },
  { key: "engineering", label: "Engineering" },
  { key: "management", label: "Management" },
  { key: "computer", label: "Computer Apps" },
  { key: "pharmacy", label: "Pharmacy" },
  { key: "science", label: "Sciences" },
  { key: "diploma", label: "Diploma" },
  { key: "design", label: "Design" },
];

export const BRANCH_CATALOG: CatalogBranch[] = [
  // B.Tech / M.Tech Engineering branches
  { code: "CSE", name: "Computer Science & Engineering", defaultIntake: 120, forCourses: ["BTECH", "MTECH"] },
  { code: "IT", name: "Information Technology", defaultIntake: 60, forCourses: ["BTECH"] },
  { code: "AIML", name: "Artificial Intelligence & Machine Learning", defaultIntake: 60, forCourses: ["BTECH", "MTECH"] },
  { code: "DS", name: "Data Science", defaultIntake: 60, forCourses: ["BTECH"] },
  { code: "CY", name: "Cyber Security", defaultIntake: 60, forCourses: ["BTECH", "MCA"] },
  { code: "ECE", name: "Electronics & Communication Engineering", defaultIntake: 60, forCourses: ["BTECH", "MTECH"] },
  { code: "EE", name: "Electrical Engineering", defaultIntake: 60, forCourses: ["BTECH"] },
  { code: "ME", name: "Mechanical Engineering", defaultIntake: 60, forCourses: ["BTECH", "MTECH"] },
  { code: "CE", name: "Civil Engineering", defaultIntake: 60, forCourses: ["BTECH"] },
  { code: "CHE", name: "Chemical Engineering", defaultIntake: 60, forCourses: ["BTECH"] },
  { code: "AE", name: "Aerospace Engineering", defaultIntake: 60, forCourses: ["BTECH"] },
  { code: "RA", name: "Robotics & Automation", defaultIntake: 60, forCourses: ["BTECH"] },
  { code: "VLSI", name: "VLSI Design & Embedded Systems", defaultIntake: 30, forCourses: ["MTECH"] },
  { code: "PE", name: "Power Engineering", defaultIntake: 30, forCourses: ["MTECH"] },
  // MBA branches
  { code: "FIN", name: "Finance Management", defaultIntake: 60, forCourses: ["MBA"] },
  { code: "MKT", name: "Marketing Management", defaultIntake: 60, forCourses: ["MBA"] },
  { code: "HR", name: "Human Resource Management", defaultIntake: 60, forCourses: ["MBA"] },
  { code: "BA", name: "Business Analytics", defaultIntake: 60, forCourses: ["MBA"] },
  { code: "OM", name: "Operations Management", defaultIntake: 60, forCourses: ["MBA"] },
  { code: "IB", name: "International Business", defaultIntake: 60, forCourses: ["MBA"] },
  // MCA / BCA branches
  { code: "GEN", name: "Software Engineering & Cloud Computing", defaultIntake: 60, forCourses: ["MCA", "BCA"] },
  { code: "AI", name: "Artificial Intelligence & Data Science", defaultIntake: 60, forCourses: ["MCA", "BCA"] },
  { code: "FS", name: "Full-Stack Web & App Development", defaultIntake: 60, forCourses: ["MCA", "BCA"] },
  // Pharmacy branches
  { code: "PHARM", name: "Pharmaceutics", defaultIntake: 60, forCourses: ["BPHARM", "MPHARM"] },
  { code: "PCHEM", name: "Pharmaceutical Chemistry", defaultIntake: 60, forCourses: ["BPHARM", "MPHARM"] },
  { code: "PCOL", name: "Pharmacology", defaultIntake: 60, forCourses: ["BPHARM", "MPHARM"] },
  { code: "PCOG", name: "Pharmacognosy", defaultIntake: 30, forCourses: ["BPHARM"] },
];
