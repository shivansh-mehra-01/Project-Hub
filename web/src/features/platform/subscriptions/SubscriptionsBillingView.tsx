"use client";

import React, { useState, useMemo } from "react";
import {
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Check,
  FileSpreadsheet,
  FileText,
  X,
  Ban,
  RefreshCw,
  ShieldCheck,
  Layers,
  Lock,
  KeyRound,
  Printer,
  Receipt,
  AlertCircle,
  Filter,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import {
  usePlatformData,
  CollegeSubscriptionRecord,
  SubscriptionPlanRecord,
  InvoiceRecord,
} from "../data/platformDataStore";
import { showToast } from "@/lib/toast";

export const SubscriptionsBillingView: React.FC = () => {
  const {
    colleges,
    plans,
    collegeSubscriptions,
    invoices,
    createSubscriptionPlan,
    updateSubscriptionPlan,
    deleteSubscriptionPlan,
    togglePlanStatus,
    updateCollegeSubscription,
    changeSubscriptionPlan,
    extendSubscriptionValidity,
    renewSubscription,
    convertTrialToPaid,
    toggleSubscriptionStatus,
    cancelSubscription,
    createInvoice,
    recordInvoicePayment,
  } = usePlatformData();

  useDashboardHeader({
    title: "Subscriptions & Billing",
    breadcrumb: "Management / Plans, Subscriptions & Invoices",
  });

  // Top-Level Navigation
  const [activeTab, setActiveTab] = useState<"subscriptions" | "plans" | "invoices">("subscriptions");

  // ===========================================================================
  // 1. DASHBOARD OVERVIEW METRICS (Calculated strictly from actual records)
  // ===========================================================================
  const nowTimestamp = new Date().getTime();

  // Active Subscriptions (paid only: status Active, amountINR > 0, non-pilot)
  const activePaidSubs = useMemo(() => {
    return collegeSubscriptions.filter(
      (s) =>
        s.status === "Active" &&
        s.amountINR > 0 &&
        !s.planName.toLowerCase().includes("pilot")
    );
  }, [collegeSubscriptions]);

  const activePaidCount = activePaidSubs.length;

  // Expiring Soon (within 90 days from today, not expired or cancelled)
  const expiringSoonCount = useMemo(() => {
    return collegeSubscriptions.filter((s) => {
      if (s.status === "Cancelled" || s.status === "Suspended" || s.status === "Expired") return false;
      const renewalTime = new Date(s.renewalDate).getTime();
      const diffDays = (renewalTime - nowTimestamp) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 90;
    }).length;
  }, [collegeSubscriptions, nowTimestamp]);

  // Annual Recurring Revenue (ARR) (Calculated strictly from active paid subs, excluding trials)
  const totalARR = useMemo(() => {
    return activePaidSubs.reduce((sum, s) => {
      if (s.billingCycle === "Semester") return sum + s.amountINR * 2;
      return sum + s.amountINR;
    }, 0);
  }, [activePaidSubs]);

  // Pending Invoices (Calculated from actual invoice records: Pending or Overdue)
  const pendingInvoices = useMemo(() => {
    return invoices.filter((i) => i.paymentStatus === "Pending" || i.paymentStatus === "Overdue");
  }, [invoices]);

  const pendingInvoicesCount = pendingInvoices.length;
  const pendingInvoicesTotal = pendingInvoices.reduce((sum, i) => sum + i.totalAmountINR, 0);

  // ===========================================================================
  // 2. COLLEGE SUBSCRIPTIONS TAB STATE
  // ===========================================================================
  const [subSearchQuery, setSubSearchQuery] = useState("");
  const [subStatusFilter, setSubStatusFilter] = useState<
    "All" | "Active" | "Trial" | "Expiring Soon" | "Expired" | "Suspended" | "Cancelled"
  >("All");

  // Selected subscription for Manage drawer
  const [selectedSub, setSelectedSub] = useState<CollegeSubscriptionRecord | null>(null);

  // Subscription Action Modals
  const [subModalAction, setSubModalAction] = useState<
    null | "changePlan" | "extend" | "renew" | "convertTrial" | "suspend" | "cancel"
  >(null);
  const [selectedPlanForChange, setSelectedPlanForChange] = useState("");
  const [selectedBillingCycle, setSelectedBillingCycle] = useState("Annual");
  const [extendDaysOption, setExtendDaysOption] = useState<number>(365);
  const [cancelReasonText, setCancelReasonText] = useState("");

  // Filtered Subscriptions
  const filteredSubscriptions = useMemo(() => {
    return collegeSubscriptions.filter((sub) => {
      // Search match
      const q = subSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        sub.institutionName.toLowerCase().includes(q) ||
        sub.collegeCode.toLowerCase().includes(q) ||
        sub.planName.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Status Filter
      if (subStatusFilter === "All") return true;
      if (subStatusFilter === "Active") return sub.status === "Active" && sub.amountINR > 0;
      if (subStatusFilter === "Trial")
        return sub.status === "Trial" || sub.amountINR === 0 || sub.planName.toLowerCase().includes("pilot");
      if (subStatusFilter === "Expiring Soon") {
        if (sub.status === "Cancelled" || sub.status === "Suspended" || sub.status === "Expired") return false;
        const diffDays = (new Date(sub.renewalDate).getTime() - nowTimestamp) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 90;
      }
      if (subStatusFilter === "Expired") {
        const diffDays = (new Date(sub.renewalDate).getTime() - nowTimestamp) / (1000 * 3600 * 24);
        return sub.status === "Expired" || diffDays < 0;
      }
      if (subStatusFilter === "Suspended") return sub.status === "Suspended";
      if (subStatusFilter === "Cancelled") return sub.status === "Cancelled";
      return true;
    });
  }, [collegeSubscriptions, subSearchQuery, subStatusFilter, nowTimestamp]);

  // Associated College Record for selected subscription
  const selectedSubCollege = useMemo(() => {
    if (!selectedSub) return null;
    return colleges.find(
      (c) => c.id === selectedSub.institutionId || c.code.toUpperCase() === selectedSub.collegeCode.toUpperCase()
    );
  }, [colleges, selectedSub]);

  // Invoices for selected subscription's college
  const selectedSubInvoices = useMemo(() => {
    if (!selectedSub) return [];
    return invoices.filter(
      (inv) =>
        inv.institutionId === selectedSub.institutionId ||
        inv.collegeCode?.toUpperCase() === selectedSub.collegeCode.toUpperCase() ||
        inv.institutionName.toLowerCase() === selectedSub.institutionName.toLowerCase()
    );
  }, [invoices, selectedSub]);

  // ===========================================================================
  // 3. SUBSCRIPTION PLANS TAB STATE
  // ===========================================================================
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanRecord | null>(null);

  const [planForm, setPlanForm] = useState({
    name: "",
    code: "",
    description: "",
    billingCycle: "Annual",
    priceINR: 240000,
    userLimit: 2500,
    facultyLimit: 150,
    storageLimitGb: 100,
    trialDurationDays: 0,
    supportLevel: "Standard 8x5",
    modulesAvailable: [
      "Project Tracks",
      "Rubric Scoring",
      "Continuous Logbook",
      "SAR Exporter",
      "VCS Git Sync",
    ],
  });

  const availableModuleOptions = [
    "Project Tracks",
    "Rubric Scoring",
    "Continuous Logbook",
    "SAR Exporter",
    "VCS Git Sync",
    "Automated SCIM Directory",
    "Dedicated Schema",
    "Cryptographic Signatures",
    "Custom SLA Support",
  ];

  const handleOpenCreatePlan = () => {
    setPlanForm({
      name: "",
      code: "",
      description: "",
      billingCycle: "Annual",
      priceINR: 240000,
      userLimit: 2500,
      facultyLimit: 150,
      storageLimitGb: 100,
      trialDurationDays: 0,
      supportLevel: "Standard 8x5",
      modulesAvailable: ["Project Tracks", "Rubric Scoring", "Continuous Logbook"],
    });
    setShowCreatePlanModal(true);
  };

  const handleOpenEditPlan = (p: SubscriptionPlanRecord) => {
    setEditingPlan(p);
    setPlanForm({
      name: p.name,
      code: p.code,
      description: p.description,
      billingCycle: p.billingCycle,
      priceINR: p.priceINR,
      userLimit: p.userLimit,
      facultyLimit: p.facultyLimit || 150,
      storageLimitGb: p.storageLimitGb,
      trialDurationDays: p.trialDurationDays,
      supportLevel: p.supportLevel,
      modulesAvailable: p.modulesAvailable,
    });
  };

  const handleSavePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name.trim()) return;

    if (editingPlan) {
      updateSubscriptionPlan(editingPlan.id, {
        name: planForm.name.trim(),
        code: planForm.code.trim().toUpperCase() || editingPlan.code,
        description: planForm.description.trim(),
        billingCycle: planForm.billingCycle,
        priceINR: Number(planForm.priceINR),
        userLimit: Number(planForm.userLimit),
        facultyLimit: Number(planForm.facultyLimit),
        storageLimitGb: Number(planForm.storageLimitGb),
        trialDurationDays: Number(planForm.trialDurationDays),
        supportLevel: planForm.supportLevel,
        modulesAvailable: planForm.modulesAvailable,
      });
      setEditingPlan(null);
    } else {
      createSubscriptionPlan({
        name: planForm.name.trim(),
        code: planForm.code.trim().toUpperCase() || `PLAN_${Date.now().toString().slice(-4)}`,
        description: planForm.description.trim(),
        billingCycle: planForm.billingCycle,
        priceINR: Number(planForm.priceINR),
        userLimit: Number(planForm.userLimit),
        facultyLimit: Number(planForm.facultyLimit),
        storageLimitGb: Number(planForm.storageLimitGb),
        trialDurationDays: Number(planForm.trialDurationDays),
        supportLevel: planForm.supportLevel,
        modulesAvailable: planForm.modulesAvailable,
        status: "Active",
      });
      setShowCreatePlanModal(false);
    }
  };

  // ===========================================================================
  // 4. INVOICES & PAYMENTS TAB STATE
  // ===========================================================================
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<"All" | "Paid" | "Pending" | "Overdue">("All");

  // Selected invoice for View Details drawer
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);

  // Modal: Generate New Invoice
  const [showGenerateInvoiceModal, setShowGenerateInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    collegeId: "",
    taxableAmountINR: 240000,
    taxType: "CGST_SGST" as "CGST_SGST" | "IGST" | "EXEMPT",
    taxRate: 18,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    periodStart: new Date().toISOString().split("T")[0],
    periodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "Annual academic license fee.",
  });

  // Modal: Record Offline Payment
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceRecord | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentRef: "",
    paymentMethod: "Bank Transfer (NEFT/RTGS)",
    paymentDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = invoiceSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.id.toLowerCase().includes(q) ||
        inv.institutionName.toLowerCase().includes(q) ||
        inv.gstin.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (invoiceStatusFilter === "All") return true;
      return inv.paymentStatus === invoiceStatusFilter;
    });
  }, [invoices, invoiceSearchQuery, invoiceStatusFilter]);

  // Dynamic GST calculation for Generate Invoice
  const invoiceTaxCalculation = useMemo(() => {
    const base = Number(invoiceForm.taxableAmountINR) || 0;
    if (invoiceForm.taxType === "EXEMPT") {
      return { cgst: 0, sgst: 0, igst: 0, totalGst: 0, totalAmount: base };
    }
    if (invoiceForm.taxType === "IGST") {
      const igst = Math.round(base * 0.18);
      return { cgst: 0, sgst: 0, igst, totalGst: igst, totalAmount: base + igst };
    }
    // CGST + SGST (9% + 9%)
    const cgst = Math.round(base * 0.09);
    const sgst = Math.round(base * 0.09);
    return { cgst, sgst, igst: 0, totalGst: cgst + sgst, totalAmount: base + cgst + sgst };
  }, [invoiceForm.taxableAmountINR, invoiceForm.taxType]);

  const handleGenerateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const college = colleges.find((c) => c.id === invoiceForm.collegeId) || colleges[0];
    if (!college) return;

    createInvoice({
      institutionId: college.id,
      institutionName: college.name,
      collegeCode: college.code,
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDate: invoiceForm.dueDate,
      taxableAmountINR: Number(invoiceForm.taxableAmountINR),
      taxRate: invoiceForm.taxType === "EXEMPT" ? 0 : 18,
      taxType: invoiceForm.taxType,
      cgstAmountINR: invoiceTaxCalculation.cgst,
      sgstAmountINR: invoiceTaxCalculation.sgst,
      igstAmountINR: invoiceTaxCalculation.igst,
      gstAmountINR: invoiceTaxCalculation.totalGst,
      totalAmountINR: invoiceTaxCalculation.totalAmount,
      paymentStatus: "Pending",
      gstin: `23AABC${college.code.slice(0, 4)}1ZQ`,
      billingPeriodStart: invoiceForm.periodStart,
      billingPeriodEnd: invoiceForm.periodEnd,
      notes: invoiceForm.notes,
    });

    setShowGenerateInvoiceModal(false);
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice || !paymentForm.paymentRef.trim()) {
      showToast("Transaction/UTR reference is required.", "warning");
      return;
    }

    recordInvoicePayment(paymentInvoice.id, {
      amount: Number(paymentForm.amount),
      paymentRef: paymentForm.paymentRef.trim(),
      paymentMethod: paymentForm.paymentMethod,
      paymentDate: paymentForm.paymentDate,
      notes: paymentForm.notes.trim(),
    });

    setPaymentInvoice(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ======================================================================= */}
      {/* HEADER & QUICK ACTION                                                   */}
      {/* ======================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Subscriptions &amp; Billing</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage institutional subscription tiers, college license contracts, renewal cycles, and GST-compliant invoices.
          </p>
        </div>

        {activeTab === "plans" && (
          <button
            onClick={handleOpenCreatePlan}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Plan
          </button>
        )}

        {activeTab === "invoices" && (
          <button
            onClick={() => {
              if (colleges.length > 0) {
                setInvoiceForm((prev) => ({ ...prev, collegeId: colleges[0].id }));
              }
              setShowGenerateInvoiceModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors self-start sm:self-auto"
          >
            <Receipt className="w-3.5 h-3.5" />
            Generate Invoice
          </button>
        )}
      </div>

      {/* ======================================================================= */}
      {/* 4 SUMMARY METRIC CARDS (Strictly calculated from actual records)        */}
      {/* ======================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Active Subscriptions (paid only) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Active Subscriptions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-slate-900 font-mono">{activePaidCount}</span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              Paid Only
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block">Excludes free trials</span>
        </div>

        {/* Metric 2: Expiring Soon (<90 Days) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Expiring Soon</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-amber-600 font-mono">{expiringSoonCount}</span>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              &lt; 90 Days
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block">Renewal intervention needed</span>
        </div>

        {/* Metric 3: Annual Recurring Revenue (ARR) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Annual Recurring Revenue</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              ₹{(totalARR / 100000).toFixed(1)}L
            </span>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
              ARR
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block">From active paid contracts</span>
        </div>

        {/* Metric 4: Pending Invoices */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Pending Invoices</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-slate-900 font-mono">{pendingInvoicesCount}</span>
            <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
              ₹{(pendingInvoicesTotal / 1000).toFixed(0)}k Due
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block">Awaiting payment settlement</span>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 3 CORE TABS NAVIGATION                                                  */}
      {/* ======================================================================= */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          {[
            { id: "subscriptions", label: "College Subscriptions", count: collegeSubscriptions.length },
            { id: "plans", label: "Subscription Plans", count: plans.length },
            { id: "invoices", label: "Invoices & Payments", count: invoices.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? "border-emerald-600 text-emerald-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.2 text-[10px] font-mono bg-slate-100 text-slate-600 rounded">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* ======================================================================= */}
      {/* TAB 1: COLLEGE SUBSCRIPTIONS                                            */}
      {/* ======================================================================= */}
      {activeTab === "subscriptions" && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={subSearchQuery}
                onChange={(e) => setSubSearchQuery(e.target.value)}
                placeholder="Search by college name, code, or plan..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* 7 Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {(
                [
                  "All",
                  "Active",
                  "Trial",
                  "Expiring Soon",
                  "Expired",
                  "Suspended",
                  "Cancelled",
                ] as const
              ).map((f) => (
                <button
                  key={f}
                  onClick={() => setSubStatusFilter(f)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    subStatusFilter === f
                      ? "bg-emerald-600 text-white font-semibold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-3 px-4">College Name &amp; Code</th>
                    <th className="py-3 px-4">Subscription Plan</th>
                    <th className="py-3 px-4">Billing Cycle</th>
                    <th className="py-3 px-4">Start Date</th>
                    <th className="py-3 px-4">Renewal Date</th>
                    <th className="py-3 px-4">Student Seats</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                        No college subscriptions match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSubscriptions.map((sub) => {
                      const isExpiringSoon =
                        sub.status !== "Cancelled" &&
                        sub.status !== "Suspended" &&
                        (new Date(sub.renewalDate).getTime() - nowTimestamp) / (1000 * 3600 * 24) >= 0 &&
                        (new Date(sub.renewalDate).getTime() - nowTimestamp) / (1000 * 3600 * 24) <= 90;

                      const isExpired =
                        sub.status === "Expired" ||
                        (new Date(sub.renewalDate).getTime() - nowTimestamp < 0 && sub.status !== "Cancelled");

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                          {/* College Name & Code */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{sub.institutionName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{sub.collegeCode}</div>
                          </td>

                          {/* Subscription Plan */}
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800">{sub.planName}</span>
                            <span className="text-[11px] text-slate-500 block font-mono">
                              {sub.amountINR === 0 ? "Free Trial" : `₹${sub.amountINR.toLocaleString("en-IN")}`}
                            </span>
                          </td>

                          {/* Billing Cycle */}
                          <td className="py-3 px-4 text-slate-700">{sub.billingCycle}</td>

                          {/* Start Date */}
                          <td className="py-3 px-4 font-mono text-slate-600">{sub.startDate}</td>

                          {/* Renewal Date */}
                          <td className="py-3 px-4">
                            <span
                              className={`font-mono text-xs font-semibold ${
                                isExpiringSoon
                                  ? "text-amber-600"
                                  : isExpired
                                  ? "text-rose-600"
                                  : "text-slate-800"
                              }`}
                            >
                              {sub.renewalDate}
                            </span>
                          </td>

                          {/* Student Seats Used / Allowed */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] text-slate-700 font-mono">
                                <span>{sub.seatUtilization.used.toLocaleString("en-IN")}</span>
                                <span className="text-slate-400">/ {sub.seatUtilization.allocated.toLocaleString("en-IN")}</span>
                              </div>
                              <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.round((sub.seatUtilization.used / sub.seatUtilization.allocated) * 100)
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded ${
                                sub.status === "Active"
                                  ? isExpiringSoon
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-emerald-100 text-emerald-800"
                                  : sub.status === "Trial"
                                  ? "bg-blue-100 text-blue-800"
                                  : sub.status === "Suspended"
                                  ? "bg-rose-100 text-rose-800"
                                  : sub.status === "Cancelled"
                                  ? "bg-slate-200 text-slate-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {sub.status === "Active" && isExpiringSoon ? "Expiring Soon" : sub.status}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedSub(sub)}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 2: SUBSCRIPTION PLANS                                               */}
      {/* ======================================================================= */}
      {activeTab === "plans" && (
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-slate-700">
                <strong>Controlled Product Catalog:</strong> Modifying a plan template updates parameters for future subscriptions only. Existing active college contracts remain untouched.
              </span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-700 rounded font-mono shrink-0">
              Immutable Active Contracts
            </span>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((p) => {
              // Active subscribers count using this plan
              const activeCount = collegeSubscriptions.filter(
                (s) => s.planName.toLowerCase() === p.name.toLowerCase() && s.status !== "Cancelled"
              ).length;

              return (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          p.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-slate-900 font-mono">
                        {p.priceINR === 0 ? "₹0 (Free Trial)" : `₹${p.priceINR.toLocaleString("en-IN")}`}
                      </span>
                      <span className="text-xs text-slate-500">/{p.billingCycle}</span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{p.description}</p>

                    {/* Limits */}
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span>Student Seats Limit:</span>
                        <span className="font-semibold text-slate-900 font-mono">{p.userLimit.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Faculty Limit:</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          {p.facultyLimit ? `${p.facultyLimit} guides` : "Standard quota"}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Storage Allocation:</span>
                        <span className="font-semibold text-slate-900 font-mono">{p.storageLimitGb} GB Cloud Vault</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Trial Duration:</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          {p.trialDurationDays > 0 ? `${p.trialDurationDays} Days` : "No trial"}
                        </span>
                      </div>
                    </div>

                    {/* Feature Entitlements */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-slate-700 block">Feature Entitlements:</span>
                      {p.modulesAvailable.map((f: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Subscribed Colleges:</span>
                      <span className="font-bold text-slate-800">{activeCount} institution(s)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPlan(p)}
                        className="py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        Edit Plan
                      </button>

                      <button
                        type="button"
                        onClick={() => togglePlanStatus(p.id)}
                        className="py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        {p.status === "Active" ? "Deactivate" : "Activate"}
                      </button>
                    </div>

                    {/* Delete Plan Button (Disabled if active subscriptions exist) */}
                    <button
                      type="button"
                      disabled={activeCount > 0}
                      onClick={() => deleteSubscriptionPlan(p.id)}
                      title={
                        activeCount > 0
                          ? "Cannot delete plan with active college subscriptions attached."
                          : "Delete plan from catalog"
                      }
                      className={`w-full py-1 text-[11px] font-medium rounded transition-colors flex items-center justify-center gap-1 ${
                        activeCount > 0
                          ? "text-slate-400 cursor-not-allowed opacity-50"
                          : "text-rose-600 hover:bg-rose-50"
                      }`}
                    >
                      <Trash2 className="w-3 h-3" />
                      {activeCount > 0 ? "Deletion Protected (Active Contracts)" : "Delete Plan"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 3: INVOICES & PAYMENTS                                              */}
      {/* ======================================================================= */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          {/* Search & Status Filter */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={invoiceSearchQuery}
                onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                placeholder="Search invoice number, college, or GSTIN..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {(["All", "Paid", "Pending", "Overdue"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setInvoiceStatusFilter(f)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    invoiceStatusFilter === f
                      ? "bg-emerald-600 text-white font-semibold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Invoice ID</th>
                    <th className="py-3 px-4">College Name</th>
                    <th className="py-3 px-4">Invoice Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Total Amount (INR)</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                        No invoices match your search query.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        {/* Invoice ID */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber || inv.id}</td>

                        {/* College Name */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{inv.institutionName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">GSTIN: {inv.gstin}</div>
                        </td>

                        {/* Invoice Date */}
                        <td className="py-3 px-4 font-mono text-slate-600">{inv.invoiceDate}</td>

                        {/* Due Date */}
                        <td className="py-3 px-4 font-mono font-medium text-slate-800">{inv.dueDate}</td>

                        {/* Total Amount */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          ₹{inv.totalAmountINR.toLocaleString("en-IN")}
                        </td>

                        {/* Payment Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                              inv.paymentStatus === "Paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : inv.paymentStatus === "Pending"
                                ? "bg-amber-100 text-amber-800"
                                : inv.paymentStatus === "Overdue"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {inv.paymentStatus}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {inv.paymentStatus !== "Paid" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentInvoice(inv);
                                  setPaymentForm({
                                    amount: inv.totalAmountINR - (inv.paidAmountINR || 0),
                                    paymentRef: "",
                                    paymentMethod: "Bank Transfer (NEFT/RTGS)",
                                    paymentDate: new Date().toISOString().split("T")[0],
                                    notes: "",
                                  });
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded border border-emerald-200 transition-colors"
                              >
                                Record Payment
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedInvoice(inv)}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                            >
                              View Invoice
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* DRAWER: MANAGE SUBSCRIPTION DETAILS & CONTRACT ACTIONS                  */}
      {/* ======================================================================= */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in-50 duration-150">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-5 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-600">{selectedSub.collegeCode}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        selectedSub.status === "Active"
                          ? "bg-emerald-100 text-emerald-800"
                          : selectedSub.status === "Trial"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {selectedSub.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{selectedSub.institutionName}</h3>
                  <p className="text-xs text-slate-500 font-mono">Contract ID: {selectedSub.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  Close
                </button>
              </div>

              {/* 1. Subscription Information */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                <span className="font-bold text-slate-900 block text-xs border-b border-slate-200 pb-1.5">
                  Subscription Information
                </span>
                <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Assigned Plan</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">{selectedSub.planName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Billing Cycle</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">{selectedSub.billingCycle}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Agreement Start Date</span>
                    <span className="font-mono text-slate-800 mt-0.5 block">{selectedSub.startDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Next Renewal Date</span>
                    <span className="font-mono font-bold text-slate-900 mt-0.5 block">{selectedSub.renewalDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Tenant Schema</span>
                    <span className="font-mono text-slate-800 mt-0.5 block">
                      {selectedSubCollege?.tenantId || `tenant_${selectedSub.collegeCode.toLowerCase()}_prod`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Auto-Renew</span>
                    <span className="font-semibold text-emerald-700 mt-0.5 block">
                      {selectedSub.autoRenew ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. License & Usage */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
                <span className="font-bold text-slate-900 block text-xs border-b border-slate-200 pb-1.5">
                  License &amp; Usage Quotas
                </span>

                {/* Student Seats Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-700">
                    <span>Student Seats Utilization:</span>
                    <span className="font-mono font-bold">
                      {selectedSub.seatUtilization.used.toLocaleString("en-IN")} /{" "}
                      {selectedSub.seatUtilization.allocated.toLocaleString("en-IN")} (
                      {Math.round((selectedSub.seatUtilization.used / selectedSub.seatUtilization.allocated) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((selectedSub.seatUtilization.used / selectedSub.seatUtilization.allocated) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Storage & Faculty */}
                <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Faculty Guides Allocation</span>
                    <span className="font-mono text-slate-900 font-semibold mt-0.5 block">
                      {selectedSub.seatUtilization.facultyUsed || 86} / {selectedSub.seatUtilization.facultyAllocated || 150} guides
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Cloud Storage Vault</span>
                    <span className="font-mono text-slate-900 font-semibold mt-0.5 block">
                      {selectedSub.storageUsedGb || 28.4} GB / {selectedSub.storageQuotaGb || 100} GB
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Billing & Tax */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                <span className="font-bold text-slate-900 block text-xs border-b border-slate-200 pb-1.5">
                  Billing &amp; Commercial Terms
                </span>
                <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Contract Price (Annual)</span>
                    <span className="font-mono text-slate-900 font-bold mt-0.5 block">
                      {selectedSub.amountINR === 0 ? "₹0 (Trial)" : `₹${selectedSub.amountINR.toLocaleString("en-IN")}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">GST Compliance</span>
                    <span className="font-mono text-slate-800 mt-0.5 block">
                      {selectedSub.taxType || "Intra-State (CGST 9% + SGST 9%)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">College GSTIN</span>
                    <span className="font-mono text-slate-900 mt-0.5 block">{selectedSub.gstin || "23AAGCS2341P1ZB"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Next Billing Cycle</span>
                    <span className="font-mono text-slate-800 mt-0.5 block">{selectedSub.renewalDate}</span>
                  </div>
                </div>
              </div>

              {/* 4. Action Buttons Grid */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-900 block text-xs">Contract Management Actions</span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlanForChange(selectedSub.planName);
                      setSelectedBillingCycle(selectedSub.billingCycle);
                      setSubModalAction("changePlan");
                    }}
                    className="p-2.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    Change / Upgrade Plan
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExtendDaysOption(365);
                      setSubModalAction("extend");
                    }}
                    className="p-2.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    Extend Validity
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubModalAction("renew")}
                    className="p-2.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
                    Renew Contract (+1 Yr)
                  </button>

                  {/* Convert Trial to Paid (if trial/pilot) */}
                  {selectedSub.amountINR === 0 || selectedSub.status === "Trial" ? (
                    <button
                      type="button"
                      onClick={() => {
                        const standardPlan = plans.find((p) => p.code === "STANDARD") || plans[0];
                        setSelectedPlanForChange(standardPlan.id);
                        setSubModalAction("convertTrial");
                      }}
                      className="p-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Convert to Paid Plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSubModalAction("suspend")}
                      className={`p-2.5 text-xs font-semibold rounded-lg transition-colors border flex items-center justify-center gap-1.5 ${
                        selectedSub.status === "Active"
                          ? "border-rose-200 text-rose-700 hover:bg-rose-50"
                          : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      {selectedSub.status === "Active" ? "Suspend Subscription" : "Reactivate Subscription"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setCancelReasonText("");
                      setSubModalAction("cancel");
                    }}
                    className="col-span-2 p-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    Cancel Subscription Contract
                  </button>
                </div>
              </div>

              {/* 5. Invoices History for this College */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-900 block text-xs">Recent Invoices ({selectedSubInvoices.length})</span>
                {selectedSubInvoices.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No past invoices found for this college.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedSubInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-slate-800">{inv.invoiceNumber || inv.id}</span>
                          <span className="text-[11px] text-slate-500 block font-mono">{inv.invoiceDate}</span>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <span className="font-mono font-bold text-slate-900 block">
                              ₹{inv.totalAmountINR.toLocaleString("en-IN")}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded inline-block ${
                                inv.paymentStatus === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {inv.paymentStatus}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1 text-slate-500 hover:text-slate-800"
                            title="View invoice"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSub(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL: CHANGE / UPGRADE PLAN ACTION                                     */}
      {/* ======================================================================= */}
      {subModalAction === "changePlan" && selectedSub && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Change Subscription Plan
            </h3>
            <p className="text-xs text-slate-500">
              Select a target subscription plan for <strong>{selectedSub.institutionName}</strong>. This will adjust student seat capacity, storage quotas, and pricing.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Target Plan</label>
                <select
                  value={selectedPlanForChange}
                  onChange={(e) => setSelectedPlanForChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-xs font-semibold"
                >
                  {plans
                    .filter((p) => p.status === "Active")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.priceINR === 0 ? "Free Trial" : `₹${p.priceINR.toLocaleString("en-IN")}`} ({p.userLimit.toLocaleString("en-IN")} seats)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Billing Cycle</label>
                <select
                  value={selectedBillingCycle}
                  onChange={(e) => setSelectedBillingCycle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-xs"
                >
                  <option value="Annual">Annual (1 Year)</option>
                  <option value="Semester">Semester (6 Months)</option>
                  <option value="Multi-Year">Multi-Year (3 Years)</option>
                </select>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] leading-relaxed">
                <strong>Contract Integrity:</strong> Updating the plan immediately syncs student seat limits and S3 storage limits with the college tenant without disrupting continuous project logbooks.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSubModalAction(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetPlan = plans.find((p) => p.id === selectedPlanForChange) || plans[0];
                  changeSubscriptionPlan(selectedSub.id, targetPlan.id, selectedBillingCycle);
                  setSubModalAction(null);
                  setSelectedSub(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
              >
                Confirm Plan Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL: EXTEND SUBSCRIPTION ACTION                                       */}
      {/* ======================================================================= */}
      {subModalAction === "extend" && selectedSub && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Extend Validity Period
            </h3>
            <p className="text-xs text-slate-500">
              Extend the agreement expiration date for <strong>{selectedSub.institutionName}</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Extension Duration</label>
                <select
                  value={extendDaysOption}
                  onChange={(e) => setExtendDaysOption(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-xs"
                >
                  <option value={30}>+ 30 Days (1 Month Grace)</option>
                  <option value={90}>+ 90 Days (Quarter)</option>
                  <option value={180}>+ 180 Days (Semester)</option>
                  <option value={365}>+ 365 Days (1 Full Year)</option>
                </select>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Current Expiry:</span>
                  <span className="font-mono text-slate-800">{selectedSub.renewalDate}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-semibold">
                  <span>New Expiry Date:</span>
                  <span className="font-mono text-emerald-700">
                    {new Date(
                      (new Date(selectedSub.renewalDate).getTime() > Date.now()
                        ? new Date(selectedSub.renewalDate)
                        : new Date()
                      ).getTime() +
                        extendDaysOption * 24 * 60 * 60 * 1000
                    )
                      .toISOString()
                      .split("T")[0]}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSubModalAction(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  extendSubscriptionValidity(selectedSub.id, extendDaysOption);
                  setSubModalAction(null);
                  setSelectedSub(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
              >
                Apply Extension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL: RENEW CONTRACT ACTION                                            */}
      {/* ======================================================================= */}
      {subModalAction === "renew" && selectedSub && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-purple-600" />
              Renew Subscription Contract
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Renewing contract for <strong>{selectedSub.institutionName}</strong> will extend validity by 12 months under the current <strong>{selectedSub.planName}</strong> plan.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Contract Fee:</span>
                <span className="font-mono font-bold text-slate-900">₹{selectedSub.amountINR.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Validity Extension:</span>
                <span className="font-semibold text-emerald-700">+ 1 Year</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSubModalAction(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  renewSubscription(selectedSub.id, 12);
                  setSubModalAction(null);
                  setSelectedSub(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
              >
                Confirm Renewal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL: CONVERT TRIAL TO PAID                                            */}
      {/* ======================================================================= */}
      {subModalAction === "convertTrial" && selectedSub && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              Convert Institutional Trial to Paid Contract
            </h3>
            <p className="text-xs text-slate-500">
              Upgrade <strong>{selectedSub.institutionName}</strong> from free trial to a full commercial license. An initial tax invoice will be generated.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Target Commercial Plan</label>
                <select
                  value={selectedPlanForChange}
                  onChange={(e) => setSelectedPlanForChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-xs font-semibold"
                >
                  {plans
                    .filter((p) => p.priceINR > 0 && p.status === "Active")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₹{p.priceINR.toLocaleString("en-IN")}/yr ({p.userLimit.toLocaleString("en-IN")} seats)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Billing Cycle</label>
                <select
                  value={selectedBillingCycle}
                  onChange={(e) => setSelectedBillingCycle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-xs"
                >
                  <option value="Annual">Annual (1 Year)</option>
                  <option value="Semester">Semester (6 Months)</option>
                </select>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-[11px] leading-relaxed">
                <strong>Automated Provisioning:</strong> Converting to a paid contract sets the subscription to Active, extends the expiration date by 365 days, and automatically queues Tax Invoice <strong>COLAB-2026-XXX</strong> with standard 18% GST.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSubModalAction(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetPlan =
                    plans.find((p) => p.id === selectedPlanForChange) ||
                    plans.find((p) => p.code === "STANDARD") ||
                    plans[0];
                  convertTrialToPaid(selectedSub.id, targetPlan.id, selectedBillingCycle);
                  setSubModalAction(null);
                  setSelectedSub(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
              >
                Convert &amp; Issue Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL: SUSPEND / REACTIVATE SUBSCRIPTION                                */}
      {/* ======================================================================= */}
      {subModalAction === "suspend" && selectedSub && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              {selectedSub.status === "Active" ? "Suspend Institutional Subscription?" : "Reactivate Subscription?"}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {selectedSub.status === "Active"
                ? `Suspending ${selectedSub.institutionName} will pause college administrator evaluated marks and evaluations. All historical capstone project logbooks remain securely stored.`
                : `Reactivating ${selectedSub.institutionName} will immediately restore full platform evaluation privileges.`}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSubModalAction(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextStatus = selectedSub.status === "Active" ? "Suspended" : "Active";
                  toggleSubscriptionStatus(selectedSub.id, nextStatus);
                  setSubModalAction(null);
                  setSelectedSub(null);
                }}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg text-white ${
                  selectedSub.status === "Active"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                Confirm {selectedSub.status === "Active" ? "Suspension" : "Reactivation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL: CANCEL SUBSCRIPTION                                              */}
      {/* ======================================================================= */}
      {subModalAction === "cancel" && selectedSub && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Cancel Subscription Contract
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel the subscription contract for <strong>{selectedSub.institutionName}</strong>? Auto-renewal will be disabled and the subscription marked as Cancelled.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Cancellation Reason / Remarks</label>
              <textarea
                rows={2}
                value={cancelReasonText}
                onChange={(e) => setCancelReasonText(e.target.value)}
                placeholder="e.g. Non-renewal notice received from College Principal."
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSubModalAction(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={() => {
                  cancelSubscription(selectedSub.id, cancelReasonText);
                  setSubModalAction(null);
                  setSelectedSub(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition-colors"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL: CREATE / EDIT SUBSCRIPTION PLAN                                  */}
      {/* ======================================================================= */}
      {(showCreatePlanModal || editingPlan) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                {editingPlan ? `Edit Plan: ${editingPlan.name}` : "Create New Subscription Plan"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreatePlanModal(false);
                  setEditingPlan(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSavePlanSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Plan Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    placeholder="e.g. Campus Elite Tier"
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Plan Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={planForm.code}
                    onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. CAMPUS_ELITE"
                    className="w-full font-mono border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  placeholder="Describe the plan target audience and value proposition..."
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Price (INR)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={planForm.priceINR}
                    onChange={(e) => setPlanForm({ ...planForm, priceINR: Number(e.target.value) })}
                    className="w-full font-mono border border-slate-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Billing Cycle</label>
                  <select
                    value={planForm.billingCycle}
                    onChange={(e) => setPlanForm({ ...planForm, billingCycle: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="Annual">Annual</option>
                    <option value="Semester">Semester</option>
                    <option value="Trial (90 Days)">Trial (90 Days)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Trial Days</label>
                  <input
                    type="number"
                    min={0}
                    value={planForm.trialDurationDays}
                    onChange={(e) => setPlanForm({ ...planForm, trialDurationDays: Number(e.target.value) })}
                    className="w-full font-mono border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Student Seats</label>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={planForm.userLimit}
                    onChange={(e) => setPlanForm({ ...planForm, userLimit: Number(e.target.value) })}
                    className="w-full font-mono border border-slate-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Faculty Limit</label>
                  <input
                    type="number"
                    min={10}
                    value={planForm.facultyLimit}
                    onChange={(e) => setPlanForm({ ...planForm, facultyLimit: Number(e.target.value) })}
                    className="w-full font-mono border border-slate-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Storage (GB)</label>
                  <input
                    type="number"
                    min={10}
                    value={planForm.storageLimitGb}
                    onChange={(e) => setPlanForm({ ...planForm, storageLimitGb: Number(e.target.value) })}
                    className="w-full font-mono border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              {/* Module Entitlements Checkboxes */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">Feature Entitlements</label>
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg max-h-36 overflow-y-auto">
                  {availableModuleOptions.map((mod) => {
                    const isChecked = planForm.modulesAvailable.includes(mod);
                    return (
                      <label key={mod} className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPlanForm({
                                ...planForm,
                                modulesAvailable: [...planForm.modulesAvailable, mod],
                              });
                            } else {
                              setPlanForm({
                                ...planForm,
                                modulesAvailable: planForm.modulesAvailable.filter((m) => m !== mod),
                              });
                            }
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-[11px]">{mod}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {editingPlan && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-[11px]">
                  <strong>Non-Breaking Rule:</strong> Updates to this plan template will not alter active college subscriptions. Existing institutions remain bound by their initial signed agreement terms.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreatePlanModal(false);
                    setEditingPlan(null);
                  }}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
                >
                  {editingPlan ? "Save Plan Changes" : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL: GENERATE NEW TAX INVOICE                                         */}
      {/* ======================================================================= */}
      {showGenerateInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Generate GST-Compliant Tax Invoice
              </h3>
              <button
                type="button"
                onClick={() => setShowGenerateInvoiceModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleGenerateInvoiceSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Recipient College / Institution <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={invoiceForm.collegeId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, collegeId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-xs font-semibold"
                >
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code}) — {c.city}, {c.state}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Taxable Base Amount (INR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={1000}
                    value={invoiceForm.taxableAmountINR}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, taxableAmountINR: Number(e.target.value) })}
                    className="w-full font-mono border border-slate-300 rounded-lg p-2.5"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payment Due Date</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    className="w-full font-mono border border-slate-300 rounded-lg p-2.5"
                  />
                </div>
              </div>

              {/* GST Treatment Configuration */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Indian GST Tax Treatment <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: "CGST_SGST", label: "Intra-State (CGST 9% + SGST 9%)" },
                    { type: "IGST", label: "Inter-State (IGST 18%)" },
                    { type: "EXEMPT", label: "Exempt / Zero-Rated" },
                  ].map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setInvoiceForm({ ...invoiceForm, taxType: opt.type as any })}
                      className={`p-2 rounded-lg border text-[11px] text-center font-medium transition-colors ${
                        invoiceForm.taxType === opt.type
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-bold"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Tax Calculation Preview */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs">
                <span className="font-semibold text-slate-800 block border-b border-slate-200 pb-1">
                  Tax Calculation Breakdown (SAC: 998431)
                </span>
                <div className="flex justify-between text-slate-600">
                  <span>Base Taxable Amount:</span>
                  <span className="font-mono">₹{Number(invoiceForm.taxableAmountINR).toLocaleString("en-IN")}</span>
                </div>
                {invoiceForm.taxType === "CGST_SGST" && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Central GST (CGST @ 9%):</span>
                      <span className="font-mono">₹{invoiceTaxCalculation.cgst.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>State GST (SGST @ 9%):</span>
                      <span className="font-mono">₹{invoiceTaxCalculation.sgst.toLocaleString("en-IN")}</span>
                    </div>
                  </>
                )}
                {invoiceForm.taxType === "IGST" && (
                  <div className="flex justify-between text-slate-600">
                    <span>Integrated GST (IGST @ 18%):</span>
                    <span className="font-mono">₹{invoiceTaxCalculation.igst.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-200 text-sm">
                  <span>Gross Total Invoice:</span>
                  <span className="font-mono text-emerald-700">
                    ₹{invoiceTaxCalculation.totalAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Billing Period Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Billing Period Start</label>
                  <input
                    type="date"
                    value={invoiceForm.periodStart}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, periodStart: e.target.value })}
                    className="w-full font-mono border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Billing Period End</label>
                  <input
                    type="date"
                    value={invoiceForm.periodEnd}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, periodEnd: e.target.value })}
                    className="w-full font-mono border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Invoice Notes / Memo</label>
                <input
                  type="text"
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  placeholder="e.g. Annual academic SaaS license for 2026-27."
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGenerateInvoiceModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
                >
                  Generate Tax Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL: RECORD OFFLINE PAYMENT                                           */}
      {/* ======================================================================= */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Record Offline Payment
              </h3>
              <button
                type="button"
                onClick={() => setPaymentInvoice(null)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Invoice ID:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {paymentInvoice.invoiceNumber || paymentInvoice.id}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Institution:</span>
                  <span className="font-semibold text-slate-900">{paymentInvoice.institutionName}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Invoiced:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{paymentInvoice.totalAmountINR.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Settlement Amount (INR) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={paymentInvoice.totalAmountINR}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  className="w-full font-mono font-bold border border-slate-300 rounded-lg p-2.5 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Bank Reference / UTR Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR_HDFC20261122001 or CHQ-991823"
                  value={paymentForm.paymentRef}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentRef: e.target.value.toUpperCase() })}
                  className="w-full font-mono border border-slate-300 rounded-lg p-2.5 text-slate-900 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
                    <option value="Cheque Deposit">Cheque Deposit</option>
                    <option value="Demand Draft (DD)">Demand Draft (DD)</option>
                    <option value="UPI / IMPS Corporate">UPI / IMPS Corporate</option>
                    <option value="Direct Treasury Transfer">Direct Treasury Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Settlement Date</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full font-mono border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Bank Reconciliation Remarks</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="e.g. Verified against SBI current account credit statement."
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentInvoice(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
                >
                  Record &amp; Close Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* DRAWER: VIEW INVOICE DETAILS & PRINTABLE GST FORMAT                     */}
      {/* ======================================================================= */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in-50 duration-150">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl p-6 sm:p-8 overflow-y-auto space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Actions at top of drawer */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {selectedInvoice.invoiceNumber || selectedInvoice.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      selectedInvoice.paymentStatus === "Paid"
                        ? "bg-emerald-100 text-emerald-800"
                        : selectedInvoice.paymentStatus === "Pending"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {selectedInvoice.paymentStatus}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    Print / Download PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(null)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-semibold p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Printable Invoice Header */}
              <div className="border border-slate-200 rounded-xl p-5 space-y-5 bg-white shadow-xs">
                {/* Brand & Document Title */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">COLABEX</h2>
                    <p className="text-[11px] text-slate-500 font-mono">Academic Project Management SaaS Platform</p>
                    <div className="text-[11px] text-slate-600 mt-2 space-y-0.5">
                      <p className="font-semibold text-slate-800">Colabex EdTech Solutions Private Limited</p>
                      <p>Plot 14, Commercial Complex, MP Nagar Zone-II</p>
                      <p>Bhopal, Madhya Pradesh — 462011, India</p>
                      <p className="font-mono">
                        GSTIN: <strong>23AABCC9812K1ZY</strong> | State: Madhya Pradesh (23)
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs uppercase tracking-widest font-bold text-slate-400 block">TAX INVOICE</span>
                    <span className="text-base font-bold font-mono text-slate-900 block mt-0.5">
                      {selectedInvoice.invoiceNumber || selectedInvoice.id}
                    </span>
                    <div className="text-[11px] text-slate-600 mt-2 space-y-0.5 font-mono">
                      <p>
                        Invoice Date: <strong>{selectedInvoice.invoiceDate}</strong>
                      </p>
                      <p>
                        Due Date: <strong>{selectedInvoice.dueDate}</strong>
                      </p>
                      {selectedInvoice.billingPeriodStart && (
                        <p className="text-[10px] text-slate-500">
                          Period: {selectedInvoice.billingPeriodStart} to {selectedInvoice.billingPeriodEnd}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Billed To */}
                <div className="border-b border-slate-200 pb-4">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    BILLED TO (CUSTOMER):
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">{selectedInvoice.institutionName}</h4>
                  <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                    <p>Affiliated to Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)</p>
                    <p className="font-mono">
                      Client GSTIN: <strong>{selectedInvoice.gstin || "23AAGCS2341P1ZB"}</strong>
                    </p>
                    <p className="font-mono">Place of Supply: Madhya Pradesh (State Code: 23)</p>
                  </div>
                </div>

                {/* Line Item Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] uppercase bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 font-mono">SAC</th>
                        <th className="py-2.5 px-3 text-right font-mono">Taxable Fee</th>
                        <th className="py-2.5 px-3 text-right font-mono">GST Rate</th>
                        <th className="py-2.5 px-3 text-right font-mono">Total (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-900">
                            Colabex Multi-Tenant Project Management SaaS License
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Annual academic license covering student logbooks, guide rubrics, and NBA SAR analytics.
                          </p>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">998431</td>
                        <td className="py-3 px-3 font-mono text-right text-slate-800">
                          ₹{selectedInvoice.taxableAmountINR.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-3 font-mono text-right text-slate-800">
                          {selectedInvoice.taxType === "EXEMPT" ? "0%" : "18%"}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-right text-slate-900">
                          ₹{selectedInvoice.totalAmountINR.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Tax Breakdown & Total Summary */}
                <div className="flex justify-end pt-2">
                  <div className="w-full sm:w-72 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal (Taxable):</span>
                      <span className="font-mono">₹{selectedInvoice.taxableAmountINR.toLocaleString("en-IN")}</span>
                    </div>

                    {selectedInvoice.taxType !== "IGST" && selectedInvoice.taxType !== "EXEMPT" ? (
                      <>
                        <div className="flex justify-between text-slate-600">
                          <span>Central GST (CGST 9%):</span>
                          <span className="font-mono">
                            ₹{(selectedInvoice.cgstAmountINR || selectedInvoice.gstAmountINR / 2).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>State GST (SGST 9%):</span>
                          <span className="font-mono">
                            ₹{(selectedInvoice.sgstAmountINR || selectedInvoice.gstAmountINR / 2).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </>
                    ) : selectedInvoice.taxType === "IGST" ? (
                      <div className="flex justify-between text-slate-600">
                        <span>Integrated GST (IGST 18%):</span>
                        <span className="font-mono">
                          ₹{(selectedInvoice.igstAmountINR || selectedInvoice.gstAmountINR).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-slate-600">
                        <span>GST Status:</span>
                        <span className="font-mono text-emerald-700">Exempt (0%)</span>
                      </div>
                    )}

                    <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 text-sm">
                      <span>Total Amount Invoiced:</span>
                      <span className="font-mono text-emerald-800">
                        ₹{selectedInvoice.totalAmountINR.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Settlement Information */}
                <div className="pt-3 border-t border-slate-200 text-xs">
                  {selectedInvoice.paymentStatus === "Paid" ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 space-y-1">
                      <span className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Settlement Verified
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-800 font-mono mt-1">
                        <div>Transaction Ref: {selectedInvoice.paymentRef || "TXN_SETTLED_001"}</div>
                        <div>Payment Method: {selectedInvoice.paymentMethod || "Bank Transfer"}</div>
                        <div>Settlement Date: {selectedInvoice.paymentDate || selectedInvoice.invoiceDate}</div>
                        <div>Amount Settled: ₹{selectedInvoice.totalAmountINR.toLocaleString("en-IN")}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 space-y-1">
                      <span className="font-bold block text-slate-900">Wire Settlement Instructions:</span>
                      <p className="text-[11px] text-slate-600">
                        Please deposit subscription dues into Colabex corporate operating account:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mt-1 text-slate-800">
                        <div>Account Name: Colabex EdTech Solutions Pvt. Ltd.</div>
                        <div>Bank: HDFC Bank Ltd, Arera Hills, Bhopal</div>
                        <div>A/C Number: 50200088912344 (Current)</div>
                        <div>IFSC Code: HDFC0000281</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              {selectedInvoice.paymentStatus !== "Paid" ? (
                <button
                  type="button"
                  onClick={() => {
                    const inv = selectedInvoice;
                    setSelectedInvoice(null);
                    setPaymentInvoice(inv);
                    setPaymentForm({
                      amount: inv.totalAmountINR - (inv.paidAmountINR || 0),
                      paymentRef: "",
                      paymentMethod: "Bank Transfer (NEFT/RTGS)",
                      paymentDate: new Date().toISOString().split("T")[0],
                      notes: "",
                    });
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                >
                  Record Offline Payment
                </button>
              ) : (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Paid in Full
                </span>
              )}

              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
