"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  MapPin,
  UserCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Globe,
  Mail,
  Phone,
  Search,
  Check,
  X,
  Database,
  ShieldCheck,
  Server,
  ExternalLink,
  Info,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { usePlatformData, CollegeTenantRecord } from "../data/platformDataStore";
import { showToast } from "@/lib/toast";

// =============================================================================
// GEOGRAPHIC & AFFILIATION MASTER DATA
// =============================================================================
const COMMON_UNIVERSITIES = [
  "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
  "Barkatullah University (BU Bhopal)",
  "Devi Ahilya Vishwavidyalaya (DAVV Indore)",
  "Jiwaji University (Gwalior)",
  "Rani Durgavati Vishwavidyalaya (RDVV Jabalpur)",
  "Vikram University (Ujjain)",
  "Dr. A.P.J. Abdul Kalam Technical University (AKTU)",
  "Visvesvaraya Technological University (VTU)",
  "Jawaharlal Nehru Technological University (JNTU)",
  "Other",
];

const COLLEGE_TYPES = [
  "Engineering College",
  "University",
  "Other",
];

const COUNTRY_OPTIONS = [
  { label: "India", code: "+91", flag: "🇮🇳" },
  { label: "United States", code: "+1", flag: "🇺🇸" },
  { label: "United Kingdom", code: "+44", flag: "🇬🇧" },
  { label: "United Arab Emirates", code: "+971", flag: "🇦🇪" },
  { label: "Singapore", code: "+65", flag: "🇸🇬" },
  { label: "Canada", code: "+1", flag: "🇨🇦" },
  { label: "Australia", code: "+61", flag: "🇦🇺" },
  { label: "Germany", code: "+49", flag: "🇩🇪" },
];

const COUNTRY_CODES = [
  { code: "+91", country: "IN (India)" },
  { code: "+1", country: "US/CA" },
  { code: "+44", country: "UK" },
  { code: "+971", country: "UAE" },
  { code: "+65", country: "SG" },
  { code: "+61", country: "AU" },
  { code: "+49", country: "DE" },
];

const STATES_BY_COUNTRY: Record<string, string[]> = {
  India: [
    "Madhya Pradesh",
    "Maharashtra",
    "Gujarat",
    "Uttar Pradesh",
    "Delhi",
    "Karnataka",
    "Tamil Nadu",
    "Rajasthan",
    "Punjab",
    "Haryana",
    "Telangana",
    "West Bengal",
    "Bihar",
    "Kerala",
    "Andhra Pradesh",
    "Odisha",
    "Assam",
    "Chhattisgarh",
    "Jharkhand",
    "Uttarakhand",
    "Himachal Pradesh",
    "Goa",
    "Other State",
  ],
  "United States": ["California", "New York", "Texas", "Massachusetts", "Illinois", "Washington", "Other State"],
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
  "United Arab Emirates": ["Dubai", "Abu Dhabi", "Sharjah", "Ajman"],
  Singapore: ["Central Region", "East Region", "North Region", "West Region"],
  Canada: ["Ontario", "British Columbia", "Quebec", "Alberta"],
  Australia: ["New South Wales", "Victoria", "Queensland", "Western Australia"],
  Germany: ["Bavaria", "Berlin", "Baden-Württemberg", "North Rhine-Westphalia"],
};

const CITIES_BY_STATE: Record<string, string[]> = {
  "Madhya Pradesh": [
    "Bhopal",
    "Indore",
    "Gwalior",
    "Jabalpur",
    "Ujjain",
    "Sagar",
    "Dewas",
    "Satna",
    "Ratlam",
    "Rewa",
    "Vidisha",
    "Burhanpur",
    "Khandwa",
    "Sehore",
    "Chhindwara",
    "Other (Custom)",
  ],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur", "Amravati", "Thane", "Other (Custom)"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Bhavnagar", "Jamnagar", "Other (Custom)"],
  "Uttar Pradesh": ["Lucknow", "Noida", "Kanpur", "Varanasi", "Agra", "Ghaziabad", "Meerut", "Prayagraj", "Other (Custom)"],
  Delhi: ["New Delhi", "North Delhi", "South Delhi", "West Delhi", "East Delhi", "Other (Custom)"],
  Karnataka: ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi", "Other (Custom)"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Other (Custom)"],
  Rajasthan: ["Jaipur", "Jodhpur", "Kota", "Udaipur", "Bikaner", "Ajmer", "Other (Custom)"],
  Punjab: ["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Other (Custom)"],
  Haryana: ["Gurugram", "Faridabad", "Panipat", "Ambala", "Hisar", "Other (Custom)"],
  Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Other (Custom)"],
};

// =============================================================================
// SEARCHABLE DROPDOWN COMPONENT
// =============================================================================
interface SearchableDropdownProps {
  id: string;
  label: string;
  required?: boolean;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  helperText?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  id,
  label,
  required,
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  error,
  disabled = false,
  helperText,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    return options.filter((opt) => opt.toLowerCase().includes(search.toLowerCase().trim()));
  }, [options, search]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className="flex flex-col space-y-1.5 w-full relative" ref={dropdownRef}>
      <label htmlFor={id} className="text-xs font-semibold text-slate-900 tracking-tight flex items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-rose-500 font-bold">*</span>}
      </label>

      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-xs text-left transition-colors focus:outline-none focus:ring-2 ${
          disabled
            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
            : error
            ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500 text-slate-900"
            : isOpen
            ? "border-emerald-600 ring-2 ring-emerald-500/20 text-slate-900"
            : "border-slate-300 hover:border-slate-400 text-slate-900"
        }`}
      >
        <span className={value ? "text-slate-900 font-medium truncate" : "text-slate-400 truncate"}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-emerald-600" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden py-1 max-h-64 flex flex-col animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Search box inside dropdown */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to filter..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="overflow-y-auto max-h-48 py-1 divide-y divide-slate-50">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500 text-center italic">No matching options</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt === value;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-emerald-50 text-emerald-900 font-semibold"
                        : "hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <span className="truncate pr-2">{opt}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error ? (
        <span className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </span>
      ) : helperText ? (
        <span className="text-[11px] text-slate-500">{helperText}</span>
      ) : null}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT: ADD COLLEGE VIEW (DEDICATED FULL-PAGE FORM)
// =============================================================================
export const AddCollegeView: React.FC = () => {
  const router = useRouter();
  const { colleges, onboardCollege } = usePlatformData();

  useDashboardHeader({
    title: "Add New College",
    breadcrumb: "Super Admin / Colleges / Add College",
  });

  // ---------------------------------------------------------------------------
  // FORM STATE
  // ---------------------------------------------------------------------------
  const [formData, setFormData] = useState({
    // Section 1: College Information
    name: "",
    code: "",
    collegeType: "Engineering College",
    affiliatedUniversity: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
    customUniversity: "",
    website: "",
    domain: "",

    // Section 2: Location Information
    country: "India",
    state: "Madhya Pradesh",
    city: "Bhopal",
    customCity: "",
    pinCode: "",
    address: "",

    // Section 3: Primary Administrator
    adminName: "",
    adminEmail: "",
    adminDesignation: "Principal / Institutional Head",
    countryCode: "+91",
    adminPhone: "",
  });

  // Validation errors & touched states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCollege, setCreatedCollege] = useState<CollegeTenantRecord | null>(null);

  // ---------------------------------------------------------------------------
  // DYNAMIC LOCATION HELPERS
  // ---------------------------------------------------------------------------
  const availableStates = useMemo(() => {
    return STATES_BY_COUNTRY[formData.country] || ["Other State"];
  }, [formData.country]);

  const availableCities = useMemo(() => {
    return CITIES_BY_STATE[formData.state] || ["Other (Custom)"];
  }, [formData.state]);

  // Handle Country change -> reset state & city
  const handleCountryChange = (country: string) => {
    const newStates = STATES_BY_COUNTRY[country] || ["Other State"];
    const firstState = newStates[0] || "Other State";
    const newCities = CITIES_BY_STATE[firstState] || ["Other (Custom)"];
    const firstCity = newCities[0] || "Other (Custom)";

    setFormData((prev) => ({
      ...prev,
      country,
      state: firstState,
      city: firstCity,
      customCity: "",
    }));
  };

  // Handle State change -> reset city
  const handleStateChange = (state: string) => {
    const newCities = CITIES_BY_STATE[state] || ["Other (Custom)"];
    const firstCity = newCities[0] || "Other (Custom)";

    setFormData((prev) => ({
      ...prev,
      state,
      city: firstCity,
      customCity: "",
    }));
  };

  // ---------------------------------------------------------------------------
  // UNIQUE COLLEGE CODE CHECK
  // ---------------------------------------------------------------------------
  const codeValidation = useMemo(() => {
    const trimmed = formData.code.trim().toUpperCase();
    if (!trimmed) {
      return { status: "empty", message: "" };
    }
    if (trimmed.length < 2) {
      return { status: "invalid", message: "Code must be at least 2 characters." };
    }
    const exists = colleges.some(
      (c) => c.code.toUpperCase() === trimmed || c.shortName.toUpperCase() === trimmed
    );
    if (exists) {
      return { status: "duplicate", message: "This college code is already registered." };
    }
    return { status: "unique", message: "Unique college code available." };
  }, [formData.code, colleges]);

  // ---------------------------------------------------------------------------
  // FIELD VALIDATION
  // ---------------------------------------------------------------------------
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Section 1
    if (!formData.name.trim()) {
      newErrors.name = "College Name is required.";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "College Name must be at least 3 characters.";
    }

    if (!formData.code.trim()) {
      newErrors.code = "College Code is required.";
    } else if (codeValidation.status === "duplicate") {
      newErrors.code = "This college code is already registered.";
    } else if (formData.code.trim().length < 2) {
      newErrors.code = "Code must be at least 2 characters.";
    }

    if (!formData.collegeType) {
      newErrors.collegeType = "College Type is required.";
    }

    if (!formData.affiliatedUniversity) {
      newErrors.affiliatedUniversity = "Affiliated University is required.";
    } else if (formData.affiliatedUniversity === "Other" && !formData.customUniversity.trim()) {
      newErrors.customUniversity = "Please specify the university name.";
    }

    if (!formData.domain.trim()) {
      newErrors.domain = "Official Email Domain is required.";
    } else {
      const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-_.]*\.[a-zA-Z]{2,}$/;
      const cleanedDomain = formData.domain.trim().toLowerCase().replace(/^@/, "");
      if (!domainPattern.test(cleanedDomain)) {
        newErrors.domain = "Enter a valid domain name (e.g. sistec.ac.in).";
      }
    }

    if (formData.website.trim()) {
      const urlPattern = /^https?:\/\/.+\..+/;
      if (!urlPattern.test(formData.website.trim())) {
        newErrors.website = "Enter a valid website URL starting with http:// or https://";
      }
    }

    // Section 2
    if (!formData.country) {
      newErrors.country = "Country is required.";
    }

    if (!formData.state) {
      newErrors.state = "State is required.";
    }

    if (!formData.city) {
      newErrors.city = "City is required.";
    } else if (formData.city === "Other (Custom)" && !formData.customCity.trim()) {
      newErrors.customCity = "Please enter the custom city name.";
    }

    if (formData.pinCode.trim()) {
      if (formData.country === "India") {
        const pinPattern = /^[1-9][0-9]{5}$/;
        if (!pinPattern.test(formData.pinCode.trim())) {
          newErrors.pinCode = "Enter a valid 6-digit PIN Code.";
        }
      }
    }

    // Section 3
    if (!formData.adminName.trim()) {
      newErrors.adminName = "Administrator Name is required.";
    }

    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = "Official Administrator Email is required.";
    } else {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(formData.adminEmail.trim())) {
        newErrors.adminEmail = "Enter a valid email address.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    // Quick inline validation
    validateForm();
  };

  // ---------------------------------------------------------------------------
  // SUBMIT HANDLER
  // ---------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all as touched
    const allTouched: Record<string, boolean> = {
      name: true,
      code: true,
      collegeType: true,
      affiliatedUniversity: true,
      customUniversity: true,
      domain: true,
      website: true,
      country: true,
      state: true,
      city: true,
      customCity: true,
      pinCode: true,
      address: true,
      adminName: true,
      adminEmail: true,
      adminPhone: true,
    };
    setTouched(allTouched);

    if (!validateForm()) {
      showToast("Please correct the highlighted form errors before proceeding.", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      // Clean domain
      const cleanedDomain = formData.domain.trim().toLowerCase().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/^@/, "").split("/")[0];
      const finalUniversity =
        formData.affiliatedUniversity === "Other"
          ? formData.customUniversity.trim() || "Independent / Other"
          : formData.affiliatedUniversity;

      const finalCity =
        formData.city === "Other (Custom)" ? formData.customCity.trim() || "Other" : formData.city;

      const fullPhoneNumber = formData.adminPhone.trim()
        ? `${formData.countryCode} ${formData.adminPhone.trim()}`
        : "";

      // Call store
      const result = await onboardCollege({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        shortName: formData.code.trim().toUpperCase(),
        university: finalUniversity,
        domain: cleanedDomain,
        website: formData.website.trim() || `https://${cleanedDomain}`,
        city: finalCity,
        state: formData.state,
        pinCode: formData.pinCode.trim() || "462001",
        address: formData.address.trim() || `${finalCity}, ${formData.state}`,
        principalName: formData.adminName.trim(),
        principalEmail: formData.adminEmail.trim(),
        principalDesignation: formData.adminDesignation.trim() || "Principal / Institutional Head",
        contactPhone: fullPhoneNumber || "+91 755 000 0000",
        subscriptionPlan: "Standard",
        storageQuotaGb: 50,
        strictSsoEnforced: true,
      });

      setCreatedCollege(result);
      showToast(`College ${formData.name.trim()} successfully registered!`, "success");
    } catch {
      showToast("An error occurred while provisioning the college. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // SUCCESS SCREEN RENDER
  // ---------------------------------------------------------------------------
  if (createdCollege) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6 pb-20">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/platform/colleges" className="hover:text-emerald-700 transition-colors">
            Colleges
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold">Onboarding Confirmation</span>
        </div>

        {/* Success Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>

          <div className="space-y-1.5 max-w-lg mx-auto">
            <span className="px-2.5 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-full font-mono uppercase tracking-wider">
              Tenant Schema Provisioned
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              College Successfully Registered
            </h1>
            <p className="text-xs text-slate-500">
              <strong>{createdCollege.name}</strong> has been allocated a dedicated multi-tenant partition on Colabex.
            </p>
          </div>

          {/* Provisioned Architecture Telemetry */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left text-xs space-y-3 max-w-xl mx-auto">
            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Server className="w-4 h-4 text-emerald-600" />
              Multi-Tenant Architecture Specification
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 pt-1">
              <div>
                <span className="text-slate-500 block text-[11px]">Tenant Schema:</span>
                <span className="font-mono font-bold text-slate-900">{createdCollege.tenantId}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Database Isolation:</span>
                <span className="font-medium text-emerald-700">Dedicated Schema (RLS Enforced)</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Affiliated University:</span>
                <span className="font-semibold text-slate-800">{createdCollege.university}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Institutional Domain:</span>
                <span className="font-mono text-slate-800">{createdCollege.domain}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Primary Administrator:</span>
                <span className="font-semibold text-slate-900">{createdCollege.principalName}</span>
                <span className="text-[11px] font-mono text-slate-500 block">{createdCollege.principalEmail}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Location:</span>
                <span className="text-slate-800">{createdCollege.city}, {createdCollege.state}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg text-emerald-900 text-[11px] flex items-start gap-2 mt-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                An onboarding invitation email containing login credentials, one-time activation token, and institutional administrator guidelines has been automatically dispatched to <strong>{createdCollege.principalEmail}</strong>.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setCreatedCollege(null);
                setFormData({
                  name: "",
                  code: "",
                  collegeType: "Engineering College",
                  affiliatedUniversity: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
                  customUniversity: "",
                  website: "",
                  domain: "",
                  country: "India",
                  state: "Madhya Pradesh",
                  city: "Bhopal",
                  customCity: "",
                  pinCode: "",
                  address: "",
                  adminName: "",
                  adminEmail: "",
                  adminDesignation: "Principal / Institutional Head",
                  countryCode: "+91",
                  adminPhone: "",
                });
                setTouched({});
                setErrors({});
              }}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
            >
              Register Another College
            </button>

            <Link
              href="/platform/colleges"
              className="w-full sm:w-auto px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors text-center"
            >
              Go to Colleges Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // DEFAULT VIEW: DEDICATED FULL-PAGE FORM
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* ======================================================================= */}
      {/* PAGE HEADER                                                             */}
      {/* ======================================================================= */}
      <div className="border-b border-slate-200 pb-5">
        {/* Back Link & Breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-2">
          <Link
            href="/platform/colleges"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Colleges
          </Link>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            <span>Super Admin</span>
            <span>/</span>
            <Link href="/platform/colleges" className="hover:text-slate-800">
              Colleges
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold">Add College</span>
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Add New College</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Register a new institution on Project Hub and provision its dedicated multi-tenant schema.
            </p>
          </div>

          <span className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 text-slate-700 rounded-lg border border-slate-200 self-start sm:self-auto font-mono">
            Tenant Provisioning Engine
          </span>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* MAIN FORM CONTAINER                                                     */}
      {/* ======================================================================= */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* --------------------------------------------------------------------- */}
        {/* SECTION 01 – COLLEGE INFORMATION                                      */}
        {/* --------------------------------------------------------------------- */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
          {/* Section Header */}
          <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                SECTION 01 — College Information
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter the core institutional identity, academic classification, and official domains.
              </p>
            </div>
          </div>

          {/* Fields Grid */}
          <div className="space-y-4">
            {/* College Name* (Full Width) */}
            <div className="flex flex-col space-y-1.5">
              <label htmlFor="college-name" className="text-xs font-semibold text-slate-900 tracking-tight flex items-center gap-1">
                <span>College Name</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                id="college-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onBlur={() => handleBlur("name")}
                placeholder="Enter official college name (e.g. Sagar Institute of Science and Technology)"
                className={`flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                  touched.name && errors.name
                    ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                    : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600 hover:border-slate-400"
                }`}
              />
              {touched.name && errors.name ? (
                <span className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.name}
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">Official legal name of the degree-granting institution.</span>
              )}
            </div>

            {/* College Code* and College Type* (2 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* College Code* */}
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="college-code" className="text-xs font-semibold text-slate-900 tracking-tight flex items-center gap-1">
                  <span>College Code</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <input
                    id="college-code"
                    type="text"
                    required
                    maxLength={15}
                    value={formData.code}
                    onChange={(e) => {
                      const uppercaseVal = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
                      setFormData({ ...formData, code: uppercaseVal });
                    }}
                    onBlur={() => handleBlur("code")}
                    placeholder="e.g. SISTEC-RAT"
                    className={`flex h-10 w-full rounded-lg border bg-white px-3 py-2 font-mono text-xs uppercase tracking-wide text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                      touched.code && errors.code
                        ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                        : codeValidation.status === "unique"
                        ? "border-emerald-400 focus:ring-emerald-500/20 focus:border-emerald-600"
                        : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600 hover:border-slate-400"
                    }`}
                  />
                  {codeValidation.status === "unique" && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      <Check className="w-3 h-3 text-emerald-600" /> Unique
                    </div>
                  )}
                  {codeValidation.status === "duplicate" && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      <X className="w-3 h-3 text-rose-600" /> Taken
                    </div>
                  )}
                </div>

                {touched.code && errors.code ? (
                  <span className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {errors.code}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    Must be unique. Used for tenant database schema partitioning (e.g.{" "}
                    <code className="text-slate-700 font-mono">
                      tenant_{formData.code ? formData.code.toLowerCase().replace(/[^a-z0-9]/g, "") : "code"}_prod
                    </code>
                    ).
                  </span>
                )}
              </div>

              {/* College Type* */}
              <SearchableDropdown
                id="college-type"
                label="College Type"
                required
                options={COLLEGE_TYPES}
                value={formData.collegeType}
                onChange={(val) => setFormData({ ...formData, collegeType: val })}
                error={touched.collegeType ? errors.collegeType : undefined}
                helperText="Primary institutional classification."
              />
            </div>

            {/* Affiliated University* (Full Width) */}
            <div className="space-y-3">
              <SearchableDropdown
                id="affiliated-university"
                label="Affiliated University"
                required
                options={COMMON_UNIVERSITIES}
                value={formData.affiliatedUniversity}
                onChange={(val) => setFormData({ ...formData, affiliatedUniversity: val })}
                error={touched.affiliatedUniversity ? errors.affiliatedUniversity : undefined}
                helperText="Select the primary governing state or technical university."
              />

              {/* Conditional Input if Other is selected */}
              {formData.affiliatedUniversity === "Other" && (
                <div className="pl-3 border-l-2 border-emerald-500 space-y-1.5 animate-in fade-in-50 duration-150">
                  <label htmlFor="custom-university" className="text-xs font-semibold text-slate-800 tracking-tight flex items-center gap-1">
                    <span>Specify University Name</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    id="custom-university"
                    type="text"
                    required
                    value={formData.customUniversity}
                    onChange={(e) => setFormData({ ...formData, customUniversity: e.target.value })}
                    onBlur={() => handleBlur("customUniversity")}
                    placeholder="Enter complete university name"
                    className={`flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                      touched.customUniversity && errors.customUniversity
                        ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                        : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600 hover:border-slate-400"
                    }`}
                  />
                  {touched.customUniversity && errors.customUniversity && (
                    <span className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.customUniversity}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Official Website & Official Email Domain* (2 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Official Website */}
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="official-website" className="text-xs font-semibold text-slate-900 tracking-tight flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>Official Website</span>
                </label>
                <input
                  id="official-website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  onBlur={() => handleBlur("website")}
                  placeholder="https://www.example.edu.in"
                  className={`flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-900 font-mono transition-colors focus:outline-none focus:ring-2 ${
                    touched.website && errors.website
                      ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                      : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600 hover:border-slate-400"
                  }`}
                />
                {touched.website && errors.website ? (
                  <span className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {errors.website}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">Public web portal of the institution.</span>
                )}
              </div>

              {/* Official Email Domain* */}
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="email-domain" className="text-xs font-semibold text-slate-900 tracking-tight flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Official Email Domain</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  id="email-domain"
                  type="text"
                  required
                  value={formData.domain}
                  onChange={(e) => {
                    const cleaned = e.target.value.toLowerCase().replace(/^(https?:\/\/|www\.|\@)/, "");
                    setFormData({ ...formData, domain: cleaned });
                  }}
                  onBlur={() => handleBlur("domain")}
                  placeholder="example.edu.in"
                  className={`flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-900 font-mono transition-colors focus:outline-none focus:ring-2 ${
                    touched.domain && errors.domain
                      ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                      : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600 hover:border-slate-400"
                  }`}
                />
                {touched.domain && errors.domain ? (
                  <span className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {errors.domain}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">Used for institutional email verification.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* SECTION 02 – LOCATION INFORMATION                                     */}
        {/* --------------------------------------------------------------------- */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
          {/* Section Header */}
          <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                SECTION 02 — Location Information
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Specify the geographic location and campus postal address.
              </p>
            </div>
          </div>

          {/* Fields Grid */}
          <div className="space-y-4">
            {/* Country* and State* (2 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Country* */}
              <SearchableDropdown
                id="country"
                label="Country"
                required
                options={COUNTRY_OPTIONS.map((c) => c.label)}
                value={formData.country}
                onChange={handleCountryChange}
                error={touched.country ? errors.country : undefined}
              />

              {/* State* (Dependent on Country) */}
              <SearchableDropdown
                id="state"
                label="State"
                required
                options={availableStates}
                value={formData.state}
                onChange={handleStateChange}
                error={touched.state ? errors.state : undefined}
                helperText={formData.country === "India" ? "Governing state jurisdiction." : undefined}
              />
            </div>

            {/* City* and PIN Code (2 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* City* (Dependent on State) */}
              <div className="space-y-2">
                <SearchableDropdown
                  id="city"
                  label="City"
                  required
                  options={availableCities}
                  value={formData.city}
                  onChange={(val) => setFormData({ ...formData, city: val })}
                  error={touched.city ? errors.city : undefined}
                  helperText="Primary campus municipality."
                />

                {/* Conditional Custom City Input */}
                {formData.city === "Other (Custom)" && (
                  <div className="pl-3 border-l-2 border-emerald-500 space-y-1.5 animate-in fade-in-50 duration-150">
                    <label htmlFor="custom-city" className="text-xs font-semibold text-slate-800 tracking-tight flex items-center gap-1">
                      <span>Specify City Name</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      id="custom-city"
                      type="text"
                      required
                      value={formData.customCity}
                      onChange={(e) => setFormData({ ...formData, customCity: e.target.value })}
                      onBlur={() => handleBlur("customCity")}
                      placeholder="Enter city name"
                      className={`flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                        touched.customCity && errors.customCity
                          ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                          : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600 hover:border-slate-400"
                      }`}
                    />
                    {touched.customCity && errors.customCity && (
                      <span className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {errors.customCity}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* PIN Code */}
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="pin-code" className="text-xs font-semibold text-slate-900 tracking-tight">
                  <span>PIN Code / Postal Code</span>
                </label>
                <input
                  id="pin-code"
                  type="text"
                  maxLength={10}
                  value={formData.pinCode}
                  onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                  onBlur={() => handleBlur("pinCode")}
                  placeholder={formData.country === "India" ? "e.g. 462036" : "Postal code"}
                  className={`flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-900 font-mono transition-colors focus:outline-none focus:ring-2 ${
                    touched.pinCode && errors.pinCode
                      ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                      : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600 hover:border-slate-400"
                  }`}
                />
                {touched.pinCode && errors.pinCode ? (
                  <span className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {errors.pinCode}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">Postal index code for official courier dispatches.</span>
                )}
              </div>
            </div>

            {/* Full Address (Full Width Multiline Textarea) */}
            <div className="flex flex-col space-y-1.5">
              <label htmlFor="full-address" className="text-xs font-semibold text-slate-900 tracking-tight">
                <span>Full Institutional Address</span>
              </label>
              <textarea
                id="full-address"
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                onBlur={() => handleBlur("address")}
                placeholder="Enter complete institutional address (Street, Landmark, Campus Location)"
                className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 hover:border-slate-400 resize-y"
              />
              <span className="text-[11px] text-slate-500">Physical campus location for accreditation compliance records.</span>
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* SECTION 03 – PRIMARY ADMINISTRATOR                                    */}
        {/* --------------------------------------------------------------------- */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
          {/* Section Header */}
          <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                SECTION 03 — Primary Administrator
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Appoint the initial institutional head (Principal / Dean) with administrator access.
              </p>
            </div>
          </div>

          {/* Fields Grid */}
          <div className="space-y-4">
            {/* Administrator Name*, Position, and Official Email* */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Administrator Name* */}
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="admin-name" className="text-xs font-semibold text-slate-900 tracking-tight flex items-center gap-1">
                  <span>Administrator Name</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  id="admin-name"
                  type="text"
                  required
                  value={formData.adminName}
                  onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  onBlur={() => handleBlur("adminName")}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className={`flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                    touched.adminName && errors.adminName
                      ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                      : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600 hover:border-slate-400"
                  }`}
                />
                {touched.adminName && errors.adminName ? (
                  <span className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {errors.adminName}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">Designated institutional administrator.</span>
                )}
              </div>

              {/* Designated Position / Role */}
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="admin-designation" className="text-xs font-semibold text-slate-900 tracking-tight">
                  <span>Designated Position</span>
                </label>
                <input
                  id="admin-designation"
                  type="text"
                  value={formData.adminDesignation}
                  onChange={(e) => setFormData({ ...formData, adminDesignation: e.target.value })}
                  placeholder="e.g. Principal / Institutional Head"
                  className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 hover:border-slate-400"
                />
                <span className="text-[11px] text-slate-500">Official post (Principal, Dean, Director).</span>
              </div>

              {/* Official Email* */}
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="admin-email" className="text-xs font-semibold text-slate-900 tracking-tight flex items-center gap-1">
                  <span>Official Email</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  onBlur={() => handleBlur("adminEmail")}
                  placeholder="admin@example.edu.in"
                  className={`flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-900 font-mono transition-colors focus:outline-none focus:ring-2 ${
                    touched.adminEmail && errors.adminEmail
                      ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                      : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600 hover:border-slate-400"
                  }`}
                />
                {touched.adminEmail && errors.adminEmail ? (
                  <span className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {errors.adminEmail}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">Official email for credential dispatch.</span>
                )}
              </div>
            </div>

            {/* Contact Number (Phone Input with Country Code Selector) */}
            <div className="flex flex-col space-y-1.5">
              <label htmlFor="admin-phone" className="text-xs font-semibold text-slate-900 tracking-tight">
                <span>Contact Number</span>
              </label>
              <div className="flex gap-2">
                {/* Country Code Selector */}
                <div className="relative w-36 shrink-0">
                  <select
                    value={formData.countryCode}
                    onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                    className="flex h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-8 py-2 text-xs font-mono text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 hover:border-slate-400"
                  >
                    {COUNTRY_CODES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.code} ({item.country})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-slate-400" />
                </div>

                {/* Phone Number Input */}
                <input
                  id="admin-phone"
                  type="tel"
                  maxLength={15}
                  value={formData.adminPhone}
                  onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value.replace(/[^0-9]/g, "") })}
                  placeholder="e.g. 755 252 9000"
                  className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 hover:border-slate-400"
                />
              </div>
              <span className="text-[11px] text-slate-500">Direct telephone number for administrative emergency escalations.</span>
            </div>

            {/* Subtle Helper Text Box */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-600 leading-relaxed">
                An invitation will be sent to the administrator after successful college creation. The administrator will be granted the <strong>College Administrator</strong> role with authority over their college&apos;s isolated tenant partition.
              </p>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* FOOTER ACTIONS                                                          */}
        {/* ======================================================================= */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Cancel / Back */}
          <Link
            href="/platform/colleges"
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 rounded-lg shadow-2xs transition-colors text-center"
          >
            Cancel
          </Link>

          {/* Right: Create College Primary Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white rounded-lg shadow-xs transition-colors ${
              isSubmitting
                ? "bg-emerald-700 cursor-not-allowed opacity-80"
                : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Provisioning College Tenant...</span>
              </>
            ) : (
              <>
                <Building2 className="w-4 h-4" />
                <span>Create College</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
