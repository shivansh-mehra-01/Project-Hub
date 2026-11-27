"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  UserCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Search,
  Check,
  Info,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { usePlatformData, CollegeTenantRecord } from "../data/platformDataStore";
import { showToast } from "@/lib/toast";

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

const COLLEGE_TYPES = ["Engineering College", "University", "Other"];

const COUNTRY_OPTIONS = [
  "India",
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Singapore",
  "Canada",
  "Australia",
  "Germany",
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
    "Katni",
    "Vidisha",
    "Other (Custom)",
  ],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Thane", "Kolhapur", "Other (Custom)"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Other (Custom)"],
  "Uttar Pradesh": ["Lucknow", "Noida", "Greater Noida", "Kanpur", "Agra", "Varanasi", "Prayagraj", "Other (Custom)"],
  Delhi: ["New Delhi", "Delhi", "Other (Custom)"],
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi-Dharwad", "Belagavi", "Other (Custom)"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Vellore", "Other (Custom)"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Other (Custom)"],
};

interface SearchableDropdownProps {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  id,
  label,
  required,
  value,
  options,
  onChange,
  placeholder = "Select an option...",
  error,
  helperText,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, search]);

  return (
    <div className="flex flex-col space-y-1.5 relative" ref={containerRef}>
      <label htmlFor={id} className="text-xs font-semibold text-slate-900 tracking-tight flex items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-rose-500 font-bold">*</span>}
      </label>

      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-xs text-left transition-colors focus:outline-none focus:ring-2 ${
          error
            ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
            : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600 hover:border-slate-400"
        }`}
      >
        <span className={value ? "text-slate-900 font-medium truncate" : "text-slate-400"}>
          {value || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden py-1 max-h-64 flex flex-col">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to filter..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

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
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                      isSelected ? "bg-emerald-50 text-emerald-900 font-semibold" : "hover:bg-slate-50 text-slate-800"
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

export const AddCollegeView: React.FC = () => {
  const { onboardCollege } = usePlatformData();

  useDashboardHeader({
    title: "Add New College",
  });

  const [formData, setFormData] = useState({
    name: "",
    collegeType: "Engineering College",
    affiliatedUniversity: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
    customUniversity: "",
    country: "India",
    state: "Madhya Pradesh",
    city: "Bhopal",
    customCity: "",
    adminName: "",
    adminEmail: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCollege, setCreatedCollege] = useState<CollegeTenantRecord | null>(null);

  const availableStates = useMemo(
    () => STATES_BY_COUNTRY[formData.country] || ["Other State"],
    [formData.country]
  );

  const availableCities = useMemo(
    () => CITIES_BY_STATE[formData.state] || ["Other (Custom)"],
    [formData.state]
  );

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

  const validateForm = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      nextErrors.name = "College Name is required.";
    } else if (formData.name.trim().length < 3) {
      nextErrors.name = "College Name must be at least 3 characters.";
    }

    if (!formData.collegeType) {
      nextErrors.collegeType = "College Type is required.";
    }

    if (!formData.affiliatedUniversity) {
      nextErrors.affiliatedUniversity = "Affiliated University is required.";
    } else if (formData.affiliatedUniversity === "Other" && !formData.customUniversity.trim()) {
      nextErrors.customUniversity = "Please specify the affiliated university.";
    }

    if (!formData.country) nextErrors.country = "Country is required.";
    if (!formData.state) nextErrors.state = "State is required.";
    if (!formData.city) {
      nextErrors.city = "City is required.";
    } else if (formData.city === "Other (Custom)" && !formData.customCity.trim()) {
      nextErrors.customCity = "Please enter the city name.";
    }

    if (!formData.adminName.trim()) {
      nextErrors.adminName = "Administrator Name is required.";
    }

    if (!formData.adminEmail.trim()) {
      nextErrors.adminEmail = "Official Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail.trim())) {
      nextErrors.adminEmail = "Enter a valid official email address.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setSubmitError(null);

    if (!validateForm()) {
      showToast("Please complete all required fields.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalUniversity =
        formData.affiliatedUniversity === "Other"
          ? formData.customUniversity.trim()
          : formData.affiliatedUniversity;
      const finalCity =
        formData.city === "Other (Custom)" ? formData.customCity.trim() : formData.city;

      const created = await onboardCollege({
        name: formData.name.trim(),
        collegeType: formData.collegeType,
        university: finalUniversity,
        country: formData.country,
        state: formData.state,
        city: finalCity,
        address: `${finalCity}, ${formData.state}, ${formData.country}`,
        principalName: formData.adminName.trim(),
        principalEmail: formData.adminEmail.trim().toLowerCase(),
      });

      setCreatedCollege(created);
      showToast(`College "${created.name}" provisioned and invitation sent.`, "success");
    } catch (err: any) {
      const msg = err?.message || "Failed to provision college tenant.";
      setSubmitError(msg);
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdCollege) {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        <div className="bg-white border border-emerald-200 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">College Provisioned Successfully</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Tenant partition created and activation invitation dispatched to the primary College Administrator.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div>
              <span className="text-[11px] text-slate-500 block">College Name</span>
              <span className="font-semibold text-slate-900">{createdCollege.name}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Tenant UUID</span>
              <span className="font-mono text-[11px] font-semibold text-slate-800">{createdCollege.id}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">College Type &amp; University</span>
              <span className="text-slate-800">
                {createdCollege.collegeType} &bull; {createdCollege.university}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Location</span>
              <span className="text-slate-800">
                {createdCollege.city}, {createdCollege.state}, {createdCollege.country}
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-[11px] text-slate-500 block">Primary Administrator Invitation</span>
              <span className="font-mono text-slate-900">{createdCollege.principalEmail}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link
              href="/platform/colleges"
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Back to Colleges
            </Link>
            <Link
              href={`/platform/colleges/${createdCollege.id}`}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
            >
              View College Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <Link
            href="/platform/colleges"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Colleges
          </Link>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Add New College</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Register an institution, provision an isolated tenant UUID, and invite its primary College Administrator.
          </p>
        </div>
      </div>

      {submitError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* SECTION 01: COLLEGE INFORMATION */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              01. College Information
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col space-y-1.5">
              <label htmlFor="college-name" className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                <span>College Name</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                id="college-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sagar Institute of Science and Technology"
                className={`flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.name
                    ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                    : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600"
                }`}
              />
              {errors.name && (
                <span className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SearchableDropdown
                id="college-type"
                label="College Type"
                required
                value={formData.collegeType}
                options={COLLEGE_TYPES}
                onChange={(val) => setFormData({ ...formData, collegeType: val })}
                error={errors.collegeType}
              />

              <SearchableDropdown
                id="affiliated-university"
                label="Affiliated University"
                required
                value={formData.affiliatedUniversity}
                options={COMMON_UNIVERSITIES}
                onChange={(val) => setFormData({ ...formData, affiliatedUniversity: val })}
                error={errors.affiliatedUniversity}
              />
            </div>

            {formData.affiliatedUniversity === "Other" && (
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="custom-university" className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                  <span>Specify Affiliated University</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  id="custom-university"
                  type="text"
                  required
                  value={formData.customUniversity}
                  onChange={(e) => setFormData({ ...formData, customUniversity: e.target.value })}
                  placeholder="Enter university name"
                  className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                {errors.customUniversity && (
                  <span className="text-[11px] font-medium text-rose-600">{errors.customUniversity}</span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* SECTION 02: LOCATION INFORMATION */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              02. Location Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SearchableDropdown
              id="country"
              label="Country"
              required
              value={formData.country}
              options={COUNTRY_OPTIONS}
              onChange={handleCountryChange}
              error={errors.country}
            />

            <SearchableDropdown
              id="state"
              label="State"
              required
              value={formData.state}
              options={availableStates}
              onChange={handleStateChange}
              error={errors.state}
            />

            <SearchableDropdown
              id="city"
              label="City"
              required
              value={formData.city}
              options={availableCities}
              onChange={(val) => setFormData({ ...formData, city: val })}
              error={errors.city}
            />
          </div>

          {formData.city === "Other (Custom)" && (
            <div className="flex flex-col space-y-1.5">
              <label htmlFor="custom-city" className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                <span>Specify City</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                id="custom-city"
                type="text"
                required
                value={formData.customCity}
                onChange={(e) => setFormData({ ...formData, customCity: e.target.value })}
                placeholder="Enter city name"
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
              {errors.customCity && (
                <span className="text-[11px] font-medium text-rose-600">{errors.customCity}</span>
              )}
            </div>
          )}
        </section>

        {/* SECTION 03: PRIMARY COLLEGE ADMINISTRATOR */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              03. Primary College Administrator
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1.5">
              <label htmlFor="admin-name" className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                <span>Administrator Name</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                id="admin-name"
                type="text"
                required
                value={formData.adminName}
                onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                placeholder="e.g. Dr. Rajesh Sharma"
                className={`flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.adminName
                    ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                    : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600"
                }`}
              />
              {errors.adminName && (
                <span className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.adminName}
                </span>
              )}
            </div>

            <div className="flex flex-col space-y-1.5">
              <label htmlFor="admin-email" className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                <span>Official Email</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                placeholder="principal@college.edu.in"
                className={`flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.adminEmail
                    ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                    : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600"
                }`}
              />
              {errors.adminEmail ? (
                <span className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.adminEmail}
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">
                  An expiring activation link will be sent to this address.
                </span>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Tenant UUID and isolation partition are generated automatically. The administrator will activate their account via email verification before signing in.
            </p>
          </div>
        </section>

        {/* FOOTER ACTIONS */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            href="/platform/colleges"
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-center"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating College...</span>
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
