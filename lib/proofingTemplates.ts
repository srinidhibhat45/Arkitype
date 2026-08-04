/**
 * Proofing templates — the content side of the Live Proofing Dashboard.
 *
 * Two independent axes, deliberately kept orthogonal:
 *
 *   form factor  →  SaaS console · Mobile app · Marketing site   (LAYOUT)
 *   industry     →  Fintech · Healthcare · E-commerce            (CONTENT)
 *
 * The form factor decides what shape the product is; the industry decides only
 * what words and numbers fill it. Every combination renders from the same
 * tokens and the same component factory, so this is a proofing surface, not a
 * template gallery — nothing here can style itself.
 *
 * Pure data on purpose: no React, no token reads. Icons are named keys the
 * renderer maps to components (`components/factory/ProofingSurfaces.tsx`), and
 * `ProofingRow` is structurally identical to `Txn` in TableSkeletons so a pack
 * can feed `<TableSkeleton rows={…}>` without lib/ importing from components/.
 */

export type FormFactor = "saas" | "mobile" | "marketing";
export type Industry = "fintech" | "healthcare" | "ecommerce";

export const FORM_FACTORS: Array<{ label: string; value: FormFactor; hint: string }> = [
  { label: "SaaS", value: "saas", hint: "dense desktop console — sidebar, stat deck, data table" },
  { label: "Mobile", value: "mobile", hint: "narrow viewport — touch targets, tab bar, stacked list" },
  { label: "Marketing", value: "marketing", hint: "wide hero, feature grid, editorial type" },
];

export const INDUSTRIES: Array<{ label: string; value: Industry }> = [
  { label: "Fintech", value: "fintech" },
  { label: "Healthcare", value: "healthcare" },
  { label: "E-commerce", value: "ecommerce" },
];

/** Icon keys — resolved to lucide components by the renderer. */
export type ProofingIcon =
  | "wallet"
  | "receipt"
  | "pie"
  | "grid"
  | "heart"
  | "activity"
  | "users"
  | "calendar"
  | "cart"
  | "package"
  | "truck"
  | "star"
  | "shield"
  | "zap";

/** Same shape as `Txn` in TableSkeletons — matched structurally, not imported. */
export interface ProofingRow {
  id: string;
  date: string;
  payee: string;
  category: string;
  status: "Cleared" | "Pending" | "Flagged";
  amount: number;
}

export interface ProofingStat {
  label: string;
  value: string;
  delta: string;
  up: boolean;
  icon: ProofingIcon;
}

export interface MobileListItem {
  title: string;
  meta: string;
  trailing: string;
  up: boolean;
}

export interface MarketingFeature {
  title: string;
  body: string;
  icon: ProofingIcon;
}

export interface IndustryPack {
  id: Industry;
  label: string;
  /** Product identity — the brand mark is a letter so no asset is needed. */
  brandInitial: string;
  productName: string;
  nav: string[];
  pageTitle: string;
  pageMeta: string;
  primaryCta: string;
  stats: ProofingStat[];
  table: {
    columns: [string, string, string, string, string];
    /** Relabels the three semantic status tones without changing them. */
    statusLabels: Record<ProofingRow["status"], string>;
    rows: ProofingRow[];
  };
  mobile: {
    screenTitle: string;
    balanceLabel: string;
    balanceValue: string;
    listTitle: string;
    items: MobileListItem[];
    tabs: Array<{ label: string; icon: ProofingIcon }>;
  };
  marketing: {
    eyebrow: string;
    headline: string;
    sub: string;
    primaryCta: string;
    secondaryCta: string;
    features: MarketingFeature[];
    proofPoints: Array<{ value: string; label: string }>;
  };
}

const FINTECH: IndustryPack = {
  id: "fintech",
  label: "Fintech",
  brandInitial: "B",
  productName: "BudgetOps",
  nav: ["Overview", "Ledger", "Budgets", "Forecast", "Approvals", "Reports"],
  pageTitle: "Operating Ledger",
  pageMeta: "FY26 · consolidated across 4 cost centers",
  primaryCta: "New transaction",
  stats: [
    { label: "Total balance", value: "$128,404.22", delta: "+4.1%", up: true, icon: "wallet" },
    { label: "Monthly burn", value: "$33,866.25", delta: "−2.8%", up: false, icon: "receipt" },
    { label: "Runway", value: "14.2 months", delta: "+0.6", up: true, icon: "pie" },
    { label: "Pending", value: "2", delta: "2 urgent", up: false, icon: "grid" },
  ],
  table: {
    columns: ["ID", "Payee", "Category", "Status", "Amount"],
    statusLabels: { Cleared: "Cleared", Pending: "Pending", Flagged: "Flagged" },
    rows: [
      { id: "TXN-0451", date: "2026-07-01", payee: "Linear Systems GmbH", category: "Software", status: "Cleared", amount: -1240.0 },
      { id: "TXN-0452", date: "2026-07-01", payee: "Northwind Payroll", category: "Salaries", status: "Cleared", amount: -18450.0 },
      { id: "TXN-0453", date: "2026-07-02", payee: "Acme Cloud Invoice", category: "Infrastructure", status: "Pending", amount: -3320.75 },
      { id: "TXN-0454", date: "2026-07-02", payee: "Meridian Client Retainer", category: "Revenue", status: "Cleared", amount: 24000.0 },
      { id: "TXN-0455", date: "2026-07-03", payee: "Halcyon Office REIT", category: "Facilities", status: "Cleared", amount: -5600.0 },
      { id: "TXN-0456", date: "2026-07-03", payee: "Vertex Data Brokerage", category: "Research", status: "Flagged", amount: -980.5 },
      { id: "TXN-0457", date: "2026-07-04", payee: "Aster Design Co-op", category: "Contractors", status: "Pending", amount: -4275.0 },
      { id: "TXN-0458", date: "2026-07-04", payee: "Quill Subscription Refund", category: "Software", status: "Cleared", amount: 129.99 },
    ],
  },
  mobile: {
    screenTitle: "Accounts",
    balanceLabel: "Available balance",
    balanceValue: "$128,404.22",
    listTitle: "Recent activity",
    items: [
      { title: "Northwind Payroll", meta: "Salaries · Today", trailing: "−$18,450.00", up: false },
      { title: "Meridian Retainer", meta: "Revenue · Today", trailing: "+$24,000.00", up: true },
      { title: "Acme Cloud", meta: "Infrastructure · Yesterday", trailing: "−$3,320.75", up: false },
      { title: "Quill Refund", meta: "Software · Yesterday", trailing: "+$129.99", up: true },
    ],
    tabs: [
      { label: "Home", icon: "wallet" },
      { label: "Activity", icon: "receipt" },
      { label: "Insights", icon: "pie" },
      { label: "Profile", icon: "users" },
    ],
  },
  marketing: {
    eyebrow: "Treasury, without the spreadsheet",
    headline: "Every dollar accounted for, in real time",
    sub: "Connect your accounts, categorise automatically, and close the month in an afternoon instead of a week.",
    primaryCta: "Start free trial",
    secondaryCta: "Book a demo",
    features: [
      { title: "Live reconciliation", body: "Transactions match themselves against invoices as they clear.", icon: "zap" },
      { title: "Runway forecasting", body: "Model hiring and spend scenarios against real burn, not guesses.", icon: "pie" },
      { title: "Audit-ready trails", body: "Every approval, edit, and export is logged and exportable.", icon: "shield" },
    ],
    proofPoints: [
      { value: "$4.2B", label: "processed annually" },
      { value: "12k", label: "finance teams" },
      { value: "SOC 2", label: "Type II certified" },
    ],
  },
};

const HEALTHCARE: IndustryPack = {
  id: "healthcare",
  label: "Healthcare",
  brandInitial: "C",
  productName: "CareChart",
  nav: ["Dashboard", "Patients", "Schedule", "Charts", "Referrals", "Billing"],
  pageTitle: "Today's Panel",
  pageMeta: "Tuesday · Dr. Amara Osei · Internal Medicine",
  primaryCta: "New encounter",
  stats: [
    { label: "Scheduled today", value: "24", delta: "+3", up: true, icon: "calendar" },
    { label: "Awaiting triage", value: "6", delta: "2 urgent", up: false, icon: "activity" },
    { label: "Avg. wait", value: "11 min", delta: "−4 min", up: true, icon: "heart" },
    { label: "Charts open", value: "9", delta: "3 overdue", up: false, icon: "users" },
  ],
  table: {
    columns: ["MRN", "Patient", "Department", "Status", "Billed"],
    statusLabels: { Cleared: "Seen", Pending: "Waiting", Flagged: "Urgent" },
    rows: [
      { id: "MRN-3391", date: "2026-07-01", payee: "R. Castellanos", category: "Cardiology", status: "Cleared", amount: 480.0 },
      { id: "MRN-3392", date: "2026-07-01", payee: "T. Nakamura", category: "Internal Med", status: "Pending", amount: 215.0 },
      { id: "MRN-3393", date: "2026-07-02", payee: "L. Abiodun", category: "Endocrinology", status: "Flagged", amount: 1340.5 },
      { id: "MRN-3394", date: "2026-07-02", payee: "S. Whitfield", category: "Radiology", status: "Cleared", amount: 920.0 },
      { id: "MRN-3395", date: "2026-07-03", payee: "M. Delacroix", category: "Internal Med", status: "Cleared", amount: 185.0 },
      { id: "MRN-3396", date: "2026-07-03", payee: "J. Petrov", category: "Orthopedics", status: "Pending", amount: 2650.0 },
      { id: "MRN-3397", date: "2026-07-04", payee: "A. Okonkwo", category: "Dermatology", status: "Cleared", amount: 310.0 },
      { id: "MRN-3398", date: "2026-07-04", payee: "H. Lindqvist", category: "Cardiology", status: "Flagged", amount: 1875.25 },
    ],
  },
  mobile: {
    screenTitle: "My Care",
    balanceLabel: "Next appointment",
    balanceValue: "Thu, 2:30 PM",
    listTitle: "Upcoming",
    items: [
      { title: "Dr. Osei — Follow-up", meta: "Internal Medicine · Thu", trailing: "2:30 PM", up: true },
      { title: "Lab work", meta: "Fasting required · Fri", trailing: "8:00 AM", up: true },
      { title: "Prescription refill", meta: "Metformin · ready", trailing: "Ready", up: true },
      { title: "Physio session", meta: "Rescheduled · Mon", trailing: "10:15 AM", up: false },
    ],
    tabs: [
      { label: "Care", icon: "heart" },
      { label: "Visits", icon: "calendar" },
      { label: "Results", icon: "activity" },
      { label: "Profile", icon: "users" },
    ],
  },
  marketing: {
    eyebrow: "Charting that keeps up with the room",
    headline: "More time with patients, less with the chart",
    sub: "An EHR surface clinicians actually finish before the next appointment — structured notes, orders, and billing in one pass.",
    primaryCta: "Request access",
    secondaryCta: "Talk to clinical ops",
    features: [
      { title: "Ambient notes", body: "Encounter summaries drafted from the visit, edited in seconds.", icon: "zap" },
      { title: "Order sets", body: "Department-tuned defaults so common pathways are one click.", icon: "activity" },
      { title: "HIPAA by default", body: "Access, audit, and retention policies enforced at the record.", icon: "shield" },
    ],
    proofPoints: [
      { value: "38%", label: "less charting time" },
      { value: "2,400", label: "clinics onboarded" },
      { value: "HIPAA", label: "compliant since day one" },
    ],
  },
};

const ECOMMERCE: IndustryPack = {
  id: "ecommerce",
  label: "E-commerce",
  brandInitial: "F",
  productName: "Fieldgoods",
  nav: ["Overview", "Orders", "Catalog", "Inventory", "Customers", "Payouts"],
  pageTitle: "Order Queue",
  pageMeta: "Last 7 days · 3 fulfilment centres",
  primaryCta: "Create order",
  stats: [
    { label: "Revenue (7d)", value: "$84,210.60", delta: "+12.4%", up: true, icon: "cart" },
    { label: "Orders", value: "1,284", delta: "+96", up: true, icon: "package" },
    { label: "Avg. order", value: "$65.58", delta: "−1.2%", up: false, icon: "receipt" },
    { label: "Late shipments", value: "7", delta: "3 escalated", up: false, icon: "truck" },
  ],
  table: {
    columns: ["Order", "Customer", "Channel", "Status", "Total"],
    statusLabels: { Cleared: "Shipped", Pending: "Packing", Flagged: "On hold" },
    rows: [
      { id: "#10451", date: "2026-07-01", payee: "Priya Raghunathan", category: "Web", status: "Cleared", amount: 128.4 },
      { id: "#10452", date: "2026-07-01", payee: "Tomás Iglesias", category: "Marketplace", status: "Pending", amount: 64.99 },
      { id: "#10453", date: "2026-07-02", payee: "Wholesale — Bright Co.", category: "B2B", status: "Cleared", amount: 4820.0 },
      { id: "#10454", date: "2026-07-02", payee: "Emeka Nwosu", category: "Web", status: "Flagged", amount: 212.75 },
      { id: "#10455", date: "2026-07-03", payee: "Hanna Lindgren", category: "Retail POS", status: "Cleared", amount: 38.5 },
      { id: "#10456", date: "2026-07-03", payee: "Yuki Tanabe", category: "Web", status: "Pending", amount: 156.0 },
      { id: "#10457", date: "2026-07-04", payee: "Marcus Ø. Dahl", category: "Marketplace", status: "Cleared", amount: 92.25 },
      { id: "#10458", date: "2026-07-04", payee: "Refund — L. Moreau", category: "Web", status: "Flagged", amount: -74.0 },
    ],
  },
  mobile: {
    screenTitle: "Shop",
    balanceLabel: "Cart total",
    balanceValue: "$128.40",
    listTitle: "In your bag",
    items: [
      { title: "Field Jacket — Olive", meta: "Size M · 1", trailing: "$68.00", up: true },
      { title: "Merino Crew — Slate", meta: "Size L · 1", trailing: "$42.00", up: true },
      { title: "Canvas Tote", meta: "One size · 1", trailing: "$18.40", up: true },
      { title: "Express shipping", meta: "Arrives Thursday", trailing: "$0.00", up: true },
    ],
    tabs: [
      { label: "Shop", icon: "cart" },
      { label: "Orders", icon: "package" },
      { label: "Saved", icon: "star" },
      { label: "Account", icon: "users" },
    ],
  },
  marketing: {
    eyebrow: "Built for brands that ship",
    headline: "One catalog, every channel, no reconciling",
    sub: "Sell on web, marketplace, and in store from a single inventory truth — and find out about a stockout before your customer does.",
    primaryCta: "Start selling",
    secondaryCta: "See pricing",
    features: [
      { title: "Unified inventory", body: "One stock count across every channel, updated as orders land.", icon: "package" },
      { title: "Smart fulfilment", body: "Routes each order to the centre that gets it there soonest.", icon: "truck" },
      { title: "Payouts you can read", body: "Fees, refunds, and settlements reconciled per order.", icon: "receipt" },
    ],
    proofPoints: [
      { value: "99.98%", label: "checkout uptime" },
      { value: "48", label: "countries supported" },
      { value: "1.9s", label: "median page load" },
    ],
  },
};

export const INDUSTRY_PACKS: Record<Industry, IndustryPack> = {
  fintech: FINTECH,
  healthcare: HEALTHCARE,
  ecommerce: ECOMMERCE,
};
