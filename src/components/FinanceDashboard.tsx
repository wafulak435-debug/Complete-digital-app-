import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Landmark,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import { secureApiFetch } from "../lib/aiClient";

export interface FinanceOrderRecord {
  id: string;
  userId?: string;
  userEmail: string;
  userName: string;
  bookId: string;
  bookTitle: string;
  price: number;
  status: "pending" | "approved" | "rejected";
  paymentReference?: string;
  verifiedBy?: string;
  date: string;
  updatedAt?: string;
}

export interface FinanceFeeRecord {
  id: string;
  userId?: string;
  userEmail: string;
  userName: string;
  feeType: "library" | "certificate" | "tuition" | "wifi" | string;
  planName: string;
  amount: number;
  phoneNumber?: string;
  status: "pending" | "confirmed" | "rejected";
  verifiedBy?: string;
  date: string;
  updatedAt?: string;
}

export interface FinanceMpesaTransaction {
  id: string;
  checkoutRequestId: string;
  merchantRequestId?: string;
  userEmail: string;
  userName: string;
  phoneNumber: string;
  amount: number;
  currency?: string;
  purpose: "book" | "course" | "fee" | "subscription" | string;
  targetId?: string;
  targetTitle?: string;
  accountReference?: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FinanceMpesaOverview {
  metrics?: {
    totalRevenueKes?: number;
    todayRevenueKes?: number;
    completedCount?: number;
    failedCount?: number;
    pendingCount?: number;
    revenueByCategory?: Record<string, number>;
  };
  config?: {
    environment?: "sandbox" | "production" | string;
    shortcode?: string;
    shortcodeType?: "paybill" | "till" | string;
    isLiveConfigured?: boolean;
    callbackUrl?: string;
  };
  recentTransactions?: FinanceMpesaTransaction[];
}

interface FinanceDashboardProps {
  orders?: FinanceOrderRecord[];
  feePayments?: FinanceFeeRecord[];
  mpesaOverview?: FinanceMpesaOverview | null;
  isDarkMode?: boolean;
  isLoading?: boolean;
  onRefresh?: () => Promise<void> | void;
  onOrderStatus?: (id: string, status: "approved" | "rejected") => Promise<void> | void;
  onFeeConfirm?: (id: string, status: "confirmed" | "rejected") => Promise<void> | void;
  onOpenMpesaLedger?: () => void;
}

type RangeDays = 7 | 14 | 30;
type ChannelFilter = "all" | "mpesa" | "ecitizen";
type OutcomeScope = "orders" | "combined";

function formatKes(value: number): string {
  return `KES ${Math.round(value).toLocaleString("en-KE")}`;
}

function toDayKey(dateInput?: string): string {
  if (!dateInput) return "";
  const parsed = new Date(dateInput);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDay(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  if (!y || !m || !d) return dayKey;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-KE", { month: "short", day: "numeric" });
}

function detectOrderChannel(order: FinanceOrderRecord, mpesaReceiptSet: Set<string>): "mpesa" | "ecitizen" {
  const ref = String(order.paymentReference || "").trim().toUpperCase();
  const verifier = String(order.verifiedBy || "").toLowerCase();
  if (verifier.startsWith("m-pesa automated") || (ref && mpesaReceiptSet.has(ref))) {
    return "mpesa";
  }
  if (
    ref.includes("ECITIZEN") ||
    ref.includes("PESAFLOW") ||
    ref.includes("CITIZEN") ||
    ref.includes("USD") ||
    ref.includes("FOREIGN")
  ) {
    return "ecitizen";
  }
  // M-Pesa phone / manual Daraja code vs eCitizen/bank order
  if (/^(07|01|254|\+254)/.test(ref) || /^MPESA/i.test(ref)) {
    return "mpesa";
  }
  return "ecitizen";
}

function detectFeeChannel(fee: FinanceFeeRecord): "mpesa" | "ecitizen" {
  const verifier = String(fee.verifiedBy || "").toLowerCase();
  const phone = String(fee.phoneNumber || "").trim();
  if (verifier.startsWith("m-pesa automated") || /^(07|01|254|\+254)/.test(phone)) {
    return "mpesa";
  }
  return "ecitizen";
}

export default function FinanceDashboard({
  orders: propOrders,
  feePayments: propFeePayments,
  mpesaOverview: propMpesaOverview,
  isDarkMode = false,
  isLoading = false,
  onRefresh,
  onOrderStatus,
  onFeeConfirm,
  onOpenMpesaLedger,
}: FinanceDashboardProps) {
  const [rangeDays, setRangeDays] = useState<RangeDays>(14);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [outcomeScope, setOutcomeScope] = useState<OutcomeScope>("orders");
  const [allMpesaReceipts, setAllMpesaReceipts] = useState<FinanceMpesaTransaction[]>([]);
  const [localOrders, setLocalOrders] = useState<FinanceOrderRecord[]>([]);
  const [localFees, setLocalFees] = useState<FinanceFeeRecord[]>([]);
  const [localOverview, setLocalOverview] = useState<FinanceMpesaOverview | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [ledgerMode, setLedgerMode] = useState<"all" | "approved_orders">("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [voucherNote, setVoucherNote] = useState("Approved bookstore orders reconciled for bookkeeping.");
  const [preparedBy, setPreparedBy] = useState("Finance Manager");

  const loadFinanceFeeds = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const requests: Promise<Response>[] = [secureApiFetch("/api/mpesa/receipts")];
      if (!propOrders) requests.push(secureApiFetch("/api/orders"));
      if (!propFeePayments) requests.push(secureApiFetch("/api/fee-payments"));
      if (!propMpesaOverview) requests.push(secureApiFetch("/api/mpesa/admin/overview"));

      const responses = await Promise.all(requests);
      const payloads = await Promise.all(responses.map((r) => r.json().catch(() => ({}))));

      let idx = 0;
      const receiptsJson = payloads[idx++];
      if (receiptsJson?.success && Array.isArray(receiptsJson.receipts)) {
        setAllMpesaReceipts(receiptsJson.receipts);
      }
      if (!propOrders) {
        const ordersJson = payloads[idx++];
        if (ordersJson?.success && Array.isArray(ordersJson.orders)) {
          setLocalOrders(ordersJson.orders);
        }
      }
      if (!propFeePayments) {
        const feesJson = payloads[idx++];
        if (feesJson?.success && Array.isArray(feesJson.payments)) {
          setLocalFees(feesJson.payments);
        }
      }
      if (!propMpesaOverview) {
        const overviewJson = payloads[idx++];
        if (overviewJson?.success) {
          setLocalOverview(overviewJson);
        }
      }
    } catch {
      // Preserve currently rendered state on transient fetch issue
    } finally {
      setIsRefreshing(false);
    }
  }, [propOrders, propFeePayments, propMpesaOverview]);

  useEffect(() => {
    loadFinanceFeeds();
  }, [loadFinanceFeeds]);

  const handleFullRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        Promise.resolve(onRefresh?.()),
        loadFinanceFeeds(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const orders = propOrders ?? localOrders;
  const feePayments = propFeePayments ?? localFees;
  const mpesaOverview = propMpesaOverview ?? localOverview;

  // Merge full receipts endpoint with overview recentTransactions so charts never miss records
  const mpesaTransactions = useMemo<FinanceMpesaTransaction[]>(() => {
    const map = new Map<string, FinanceMpesaTransaction>();
    for (const tx of mpesaOverview?.recentTransactions || []) {
      map.set(tx.id || tx.checkoutRequestId, tx);
    }
    for (const tx of allMpesaReceipts) {
      map.set(tx.id || tx.checkoutRequestId, tx);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [mpesaOverview, allMpesaReceipts]);

  const mpesaReceiptSet = useMemo(() => {
    const set = new Set<string>();
    for (const tx of mpesaTransactions) {
      if (tx.mpesaReceiptNumber) {
        set.add(String(tx.mpesaReceiptNumber).trim().toUpperCase());
      }
    }
    return set;
  }, [mpesaTransactions]);

  // Deduplicated financial computations
  const analytics = useMemo(() => {
    const completedMpesa = mpesaTransactions.filter((t) => t.status === "completed");
    const pendingMpesa = mpesaTransactions.filter((t) => t.status === "pending");
    const failedMpesa = mpesaTransactions.filter(
      (t) => t.status === "failed" || t.status === "cancelled"
    );

    const approvedOrders = orders.filter((o) => o.status === "approved");
    const pendingOrders = orders.filter((o) => o.status === "pending");
    const rejectedOrders = orders.filter((o) => o.status === "rejected");

    const confirmedFees = feePayments.filter((f) => f.status === "confirmed");
    const pendingFees = feePayments.filter((f) => f.status === "pending");
    const rejectedFees = feePayments.filter((f) => f.status === "rejected");

    // Non-automated orders/fees avoid double-counting STK callbacks that already settled into Orders/Fees
    const directApprovedOrders = approvedOrders.filter((o) => {
      const ref = String(o.paymentReference || "").trim().toUpperCase();
      const automated = String(o.verifiedBy || "").startsWith("M-PESA Automated");
      return !automated && !(ref && mpesaReceiptSet.has(ref));
    });

    const directConfirmedFees = confirmedFees.filter(
      (f) => !String(f.verifiedBy || "").startsWith("M-PESA Automated")
    );

    const mpesaRevenueKes = completedMpesa.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const directOrdersRevenueKes = directApprovedOrders.reduce(
      (sum, o) => sum + (Number(o.price) || 0),
      0
    );
    const directFeesRevenueKes = directConfirmedFees.reduce(
      (sum, f) => sum + (Number(f.amount) || 0),
      0
    );
    const directTotalKes = directOrdersRevenueKes + directFeesRevenueKes;

    const totalRevenueKes =
      channelFilter === "mpesa"
        ? mpesaRevenueKes
        : channelFilter === "ecitizen"
        ? directTotalKes
        : mpesaRevenueKes + directTotalKes;

    const pendingOrdersValueKes = pendingOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
    const pendingFeesValueKes = pendingFees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const pendingMpesaValueKes = pendingMpesa.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Total successful payments (deduplicated)
    const successfulMpesaCount = completedMpesa.length;
    const successfulDirectOrderCount = directApprovedOrders.length;
    const successfulDirectFeeCount = directConfirmedFees.length;
    const totalSuccessfulPayments =
      channelFilter === "mpesa"
        ? successfulMpesaCount
        : channelFilter === "ecitizen"
        ? successfulDirectOrderCount + successfulDirectFeeCount
        : successfulMpesaCount + successfulDirectOrderCount + successfulDirectFeeCount;

    const todayKey = toDayKey(new Date().toISOString());
    let todayInflowKes = 0;
    for (const tx of completedMpesa) {
      if (channelFilter !== "ecitizen" && toDayKey(tx.transactionDate || tx.createdAt) === todayKey) {
        todayInflowKes += Number(tx.amount) || 0;
      }
    }
    for (const ord of directApprovedOrders) {
      if (channelFilter !== "mpesa" && toDayKey(ord.updatedAt || ord.date) === todayKey) {
        todayInflowKes += Number(ord.price) || 0;
      }
    }
    for (const fee of directConfirmedFees) {
      if (channelFilter !== "mpesa" && toDayKey(fee.updatedAt || fee.date) === todayKey) {
        todayInflowKes += Number(fee.amount) || 0;
      }
    }

    // Build continuous daily time-series for the selected window
    const dayMap = new Map<
      string,
      {
        dayKey: string;
        label: string;
        mpesaKes: number;
        ecitizenKes: number;
        totalKes: number;
        successfulCount: number;
      }
    >();

    const now = new Date();
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = toDayKey(d.toISOString());
      dayMap.set(key, {
        dayKey: key,
        label: formatShortDay(key),
        mpesaKes: 0,
        ecitizenKes: 0,
        totalKes: 0,
        successfulCount: 0,
      });
    }

    if (channelFilter !== "ecitizen") {
      for (const tx of completedMpesa) {
        const key = toDayKey(tx.transactionDate || tx.createdAt);
        const bucket = dayMap.get(key);
        if (bucket) {
          const amt = Number(tx.amount) || 0;
          bucket.mpesaKes += amt;
          bucket.totalKes += amt;
          bucket.successfulCount += 1;
        }
      }
    }

    if (channelFilter !== "mpesa") {
      for (const ord of directApprovedOrders) {
        const key = toDayKey(ord.updatedAt || ord.date);
        const bucket = dayMap.get(key);
        if (bucket) {
          const amt = Number(ord.price) || 0;
          bucket.ecitizenKes += amt;
          bucket.totalKes += amt;
          bucket.successfulCount += 1;
        }
      }
      for (const fee of directConfirmedFees) {
        const key = toDayKey(fee.updatedAt || fee.date);
        const bucket = dayMap.get(key);
        if (bucket) {
          const amt = Number(fee.amount) || 0;
          bucket.ecitizenKes += amt;
          bucket.totalKes += amt;
          bucket.successfulCount += 1;
        }
      }
    }

    const dailySeries = Array.from(dayMap.values());

    // Pending vs Approved comparison across operational streams
    const statusComparisonData = [
      {
        stream: "Bookstore Orders",
        pending: pendingOrders.length,
        approved: approvedOrders.length,
        rejected: rejectedOrders.length,
      },
      {
        stream: "M-Pesa STK",
        pending: pendingMpesa.length,
        approved: completedMpesa.length,
        rejected: failedMpesa.length,
      },
      {
        stream: "Tuition & Fees",
        pending: pendingFees.length,
        approved: confirmedFees.length,
        rejected: rejectedFees.length,
      },
    ];

    // Outcome donut data
    const pieData =
      outcomeScope === "orders"
        ? [
            { name: "Approved Orders", value: approvedOrders.length, color: "#2E7D32" },
            { name: "Pending Orders", value: pendingOrders.length, color: "#D97706" },
            { name: "Rejected Orders", value: rejectedOrders.length, color: "#BE123C" },
          ]
        : [
            {
              name: "Successful Payments",
              value: successfulMpesaCount + successfulDirectOrderCount + successfulDirectFeeCount,
              color: "#2E7D32",
            },
            {
              name: "Pending Verification",
              value: pendingOrders.length + pendingMpesa.length + pendingFees.length,
              color: "#D97706",
            },
            {
              name: "Failed / Rejected",
              value: rejectedOrders.length + failedMpesa.length + rejectedFees.length,
              color: "#BE123C",
            },
          ];

    // Revenue by category across M-Pesa + eCitizen/Direct
    const streamRevenue = [
      {
        category: "Digital Books",
        revenueKes:
          (channelFilter !== "ecitizen"
            ? completedMpesa
                .filter((t) => t.purpose === "book")
                .reduce((s, t) => s + (Number(t.amount) || 0), 0)
            : 0) +
          (channelFilter !== "mpesa" ? directOrdersRevenueKes : 0),
        count:
          (channelFilter !== "ecitizen"
            ? completedMpesa.filter((t) => t.purpose === "book").length
            : 0) +
          (channelFilter !== "mpesa" ? directApprovedOrders.length : 0),
      },
      {
        category: "Tuition & Fees",
        revenueKes:
          (channelFilter !== "ecitizen"
            ? completedMpesa
                .filter((t) => t.purpose === "fee")
                .reduce((s, t) => s + (Number(t.amount) || 0), 0)
            : 0) +
          (channelFilter !== "mpesa" ? directFeesRevenueKes : 0),
        count:
          (channelFilter !== "ecitizen"
            ? completedMpesa.filter((t) => t.purpose === "fee").length
            : 0) +
          (channelFilter !== "mpesa" ? directConfirmedFees.length : 0),
      },
      {
        category: "Course Enrollments",
        revenueKes:
          channelFilter !== "ecitizen"
            ? completedMpesa
                .filter((t) => t.purpose === "course")
                .reduce((s, t) => s + (Number(t.amount) || 0), 0)
            : 0,
        count:
          channelFilter !== "ecitizen"
            ? completedMpesa.filter((t) => t.purpose === "course").length
            : 0,
      },
      {
        category: "Study Plans",
        revenueKes:
          channelFilter !== "ecitizen"
            ? completedMpesa
                .filter((t) => t.purpose === "subscription")
                .reduce((s, t) => s + (Number(t.amount) || 0), 0)
            : 0,
        count:
          channelFilter !== "ecitizen"
            ? completedMpesa.filter((t) => t.purpose === "subscription").length
            : 0,
      },
    ];

    const totalOrdersCount = orders.length;
    const orderApprovalRate =
      totalOrdersCount > 0 ? Math.round((approvedOrders.length / totalOrdersCount) * 100) : 0;

    const totalMpesaResolved = completedMpesa.length + failedMpesa.length;
    const mpesaSuccessRate =
      totalMpesaResolved > 0 ? Math.round((completedMpesa.length / totalMpesaResolved) * 100) : 100;

    return {
      totalRevenueKes,
      mpesaRevenueKes,
      directTotalKes,
      todayInflowKes,
      totalSuccessfulPayments,
      successfulMpesaCount,
      successfulDirectCount: successfulDirectOrderCount + successfulDirectFeeCount,
      approvedOrdersCount: approvedOrders.length,
      pendingOrdersCount: pendingOrders.length,
      rejectedOrdersCount: rejectedOrders.length,
      pendingOrdersValueKes,
      pendingAllCount: pendingOrders.length + pendingMpesa.length + pendingFees.length,
      pendingAllValueKes: pendingOrdersValueKes + pendingFeesValueKes + pendingMpesaValueKes,
      orderApprovalRate,
      mpesaSuccessRate,
      completedMpesaCount: completedMpesa.length,
      failedMpesaCount: failedMpesa.length,
      dailySeries,
      statusComparisonData,
      pieData,
      streamRevenue,
    };
  }, [orders, feePayments, mpesaTransactions, mpesaReceiptSet, rangeDays, channelFilter, outcomeScope]);

  // Unified verification & recent ledger rows (prioritize pending items first, then latest)
  const unifiedLedger = useMemo(() => {
    type LedgerRow = {
      key: string;
      recordId: string;
      kind: "order" | "fee" | "mpesa";
      channel: "mpesa" | "ecitizen";
      title: string;
      customer: string;
      email: string;
      reference: string;
      amount: number;
      status: "pending" | "approved" | "rejected";
      rawStatus: string;
      timestamp: string;
    };

    const rows: LedgerRow[] = [];

    for (const ord of orders) {
      const ch = detectOrderChannel(ord, mpesaReceiptSet);
      if (channelFilter !== "all" && ch !== channelFilter) continue;
      rows.push({
        key: `order_${ord.id}`,
        recordId: ord.id,
        kind: "order",
        channel: ch,
        title: ord.bookTitle || "Book Order",
        customer: ord.userName || ord.userEmail,
        email: ord.userEmail,
        reference: ord.paymentReference || ord.id,
        amount: Number(ord.price) || 0,
        status: ord.status === "approved" ? "approved" : ord.status === "rejected" ? "rejected" : "pending",
        rawStatus: ord.status,
        timestamp: ord.updatedAt || ord.date,
      });
    }

    for (const fee of feePayments) {
      const ch = detectFeeChannel(fee);
      if (channelFilter !== "all" && ch !== channelFilter) continue;
      rows.push({
        key: `fee_${fee.id}`,
        recordId: fee.id,
        kind: "fee",
        channel: ch,
        title: `${fee.planName} (${fee.feeType})`,
        customer: fee.userName || fee.userEmail,
        email: fee.userEmail,
        reference: fee.phoneNumber || fee.id,
        amount: Number(fee.amount) || 0,
        status: fee.status === "confirmed" ? "approved" : fee.status === "rejected" ? "rejected" : "pending",
        rawStatus: fee.status,
        timestamp: fee.updatedAt || fee.date,
      });
    }

    for (const tx of mpesaTransactions) {
      if (channelFilter === "ecitizen") continue;
      // Avoid listing automated book/fee STK entries twice if the exact receipt already appears in orders
      const receiptUpper = String(tx.mpesaReceiptNumber || "").trim().toUpperCase();
      if (
        tx.purpose === "book" &&
        receiptUpper &&
        orders.some((o) => String(o.paymentReference || "").trim().toUpperCase() === receiptUpper)
      ) {
        continue;
      }
      rows.push({
        key: `mpesa_${tx.id}`,
        recordId: tx.id,
        kind: "mpesa",
        channel: "mpesa",
        title: tx.targetTitle || `M-Pesa ${tx.purpose}`,
        customer: tx.userName || tx.userEmail,
        email: tx.userEmail,
        reference: tx.mpesaReceiptNumber || tx.accountReference || tx.checkoutRequestId,
        amount: Number(tx.amount) || 0,
        status:
          tx.status === "completed"
            ? "approved"
            : tx.status === "failed" || tx.status === "cancelled"
            ? "rejected"
            : "pending",
        rawStatus: tx.status,
        timestamp: tx.transactionDate || tx.updatedAt || tx.createdAt,
      });
    }

    return rows
      .sort((a, b) => {
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (a.status !== "pending" && b.status === "pending") return 1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
      .slice(0, 12);
  }, [orders, feePayments, mpesaTransactions, mpesaReceiptSet, channelFilter]);

  // All approved orders eligible for Bulk Print bookkeeping selection
  const approvedOrdersList = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders
      .filter((ord) => ord.status === "approved")
      .map((ord) => ({
        ...ord,
        channel: detectOrderChannel(ord, mpesaReceiptSet),
      }))
      .filter((ord) => {
        if (channelFilter !== "all" && ord.channel !== channelFilter) return false;
        if (!q) return true;
        return (
          String(ord.bookTitle || "").toLowerCase().includes(q) ||
          String(ord.userName || "").toLowerCase().includes(q) ||
          String(ord.userEmail || "").toLowerCase().includes(q) ||
          String(ord.paymentReference || "").toLowerCase().includes(q) ||
          String(ord.id || "").toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.date).getTime() - new Date(a.updatedAt || a.date).getTime()
      );
  }, [orders, mpesaReceiptSet, channelFilter, orderSearch]);

  // Keep selectedOrderIds synchronized with currently existing approved orders
  useEffect(() => {
    const validIds = new Set(
      orders.filter((o) => o.status === "approved").map((o) => o.id)
    );
    setSelectedOrderIds((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [orders]);

  // Isolate print sheet when bulk print preview modal is open
  useEffect(() => {
    if (!isPrintPreviewOpen) {
      document.body.classList.remove("bulk-print-active");
      return;
    }
    document.body.classList.add("bulk-print-active");
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsPrintPreviewOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("bulk-print-active");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isPrintPreviewOpen]);

  const selectedOrderSet = useMemo(() => new Set(selectedOrderIds), [selectedOrderIds]);

  const selectedApprovedOrders = useMemo(() => {
    return orders
      .filter((o) => o.status === "approved" && selectedOrderSet.has(o.id))
      .map((ord) => ({
        ...ord,
        channel: detectOrderChannel(ord, mpesaReceiptSet),
      }))
      .sort(
        (a, b) =>
          new Date(a.updatedAt || a.date).getTime() - new Date(b.updatedAt || b.date).getTime()
      );
  }, [orders, selectedOrderSet, mpesaReceiptSet]);

  const bulkPrintSummary = useMemo(() => {
    let totalKes = 0;
    let mpesaKes = 0;
    let mpesaCount = 0;
    let ecitizenKes = 0;
    let ecitizenCount = 0;
    for (const ord of selectedApprovedOrders) {
      const amt = Number(ord.price) || 0;
      totalKes += amt;
      if (ord.channel === "mpesa") {
        mpesaKes += amt;
        mpesaCount += 1;
      } else {
        ecitizenKes += amt;
        ecitizenCount += 1;
      }
    }
    return {
      totalKes,
      mpesaKes,
      mpesaCount,
      ecitizenKes,
      ecitizenCount,
      batchRef: `ZD-BK-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(
        selectedApprovedOrders.length
      ).padStart(2, "0")}`,
    };
  }, [selectedApprovedOrders]);

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const allVisibleApprovedSelected =
    approvedOrdersList.length > 0 &&
    approvedOrdersList.every((ord) => selectedOrderSet.has(ord.id));

  const toggleSelectAllVisibleApproved = () => {
    const visibleIds = approvedOrdersList.map((o) => o.id);
    if (visibleIds.length === 0) return;
    if (allVisibleApprovedSelected) {
      const visibleSet = new Set(visibleIds);
      setSelectedOrderIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    } else {
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleOpenBulkPrint = () => {
    if (selectedApprovedOrders.length > 0) {
      setIsPrintPreviewOpen(true);
      return;
    }
    setLedgerMode("approved_orders");
    const el = document.getElementById("finance-ledger-queue");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cardSurface = isDarkMode
    ? "bg-[#1E1A17] border-[#332C26] text-[#F5F2EB]"
    : "bg-white border-[#E7E1D8] text-[#1F1B18]";
  const subtleSurface = isDarkMode
    ? "bg-[#161310] border-[#332C26]"
    : "bg-[#FAF8F4] border-[#E7E1D8]";
  const mutedText = isDarkMode ? "text-[#B5ABA2]" : "text-[#6E655E]";
  const gridStroke = isDarkMode ? "#332C26" : "#EAE4DC";
  const axisTickColor = isDarkMode ? "#A3988E" : "#6E655E";

  const hasDailyRevenue = analytics.dailySeries.some((d) => d.totalKes > 0);
  const totalPieCount = analytics.pieData.reduce((sum, item) => sum + item.value, 0);

  const handleAction = async (
    kind: "order" | "fee",
    id: string,
    decision: "approve" | "reject"
  ) => {
    setActionBusyId(id);
    try {
      if (kind === "order" && onOrderStatus) {
        await onOrderStatus(id, decision === "approve" ? "approved" : "rejected");
      } else if (kind === "fee" && onFeeConfirm) {
        await onFeeConfirm(id, decision === "approve" ? "confirmed" : "rejected");
      }
      await loadFinanceFeeds();
    } finally {
      setActionBusyId(null);
    }
  };

  return (
    <div className="space-y-5 min-w-0">
      {/* Header & Interactive Controls */}
      <div className={`rounded-2xl border p-4 sm:p-5 ${cardSurface}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#A8421B] shrink-0" />
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#A8421B]">
                Finance Manager Analytics · M-Pesa &amp; eCitizen
              </p>
            </div>
            <h3 className="font-serif text-lg sm:text-xl font-bold tracking-tight">
              Revenue, Orders &amp; Settlement Intelligence
            </h3>
            <p className={`text-xs ${mutedText}`}>
              Gateway: {mpesaOverview?.config?.environment === "production" ? "Production Live" : "Sandbox"} · Shortcode{" "}
              <span className="font-mono font-semibold">{mpesaOverview?.config?.shortcode || "1171473"}</span> (
              {mpesaOverview?.config?.shortcodeType || "paybill"}) · Real-time ledger deduplication active
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Timeframe Selector */}
            <div className={`inline-flex rounded-xl border p-0.5 ${subtleSurface}`} role="group" aria-label="Timeframe filter">
              {([7, 14, 30] as RangeDays[]).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setRangeDays(days)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold tabular-nums transition cursor-pointer ${
                    rangeDays === days
                      ? "bg-[#1B365D] text-white"
                      : `${mutedText} hover:text-[#A8421B]`
                  }`}
                >
                  {days}D
                </button>
              ))}
            </div>

            {/* Channel Filter */}
            <div className={`inline-flex rounded-xl border p-0.5 ${subtleSurface}`} role="group" aria-label="Payment channel filter">
              {[
                { id: "all" as ChannelFilter, label: "All Channels" },
                { id: "mpesa" as ChannelFilter, label: "M-Pesa" },
                { id: "ecitizen" as ChannelFilter, label: "eCitizen / Direct" },
              ].map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setChannelFilter(ch.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    channelFilter === ch.id
                      ? "bg-[#A8421B] text-white"
                      : `${mutedText} hover:text-[#A8421B]`
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleOpenBulkPrint}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                selectedApprovedOrders.length > 0
                  ? "bg-[#1B365D] border-[#1B365D] text-white hover:opacity-95"
                  : `${cardSurface} hover:border-[#A8421B]`
              }`}
              title={
                selectedApprovedOrders.length > 0
                  ? `Open bookkeeping print view for ${selectedApprovedOrders.length} selected approved order(s)`
                  : "Select approved orders below for Bulk Print"
              }
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="tabular-nums">
                Bulk Print{selectedApprovedOrders.length > 0 ? ` (${selectedApprovedOrders.length})` : ""}
              </span>
            </button>

            <button
              type="button"
              onClick={handleFullRefresh}
              disabled={isLoading || isRefreshing}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer disabled:opacity-60 ${cardSurface} hover:border-[#A8421B]`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading || isRefreshing ? "animate-spin" : ""}`} />
              <span>Sync</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Key Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className={`rounded-2xl border p-4 space-y-2 ${cardSurface}`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>
              Verified Revenue
            </span>
            <Landmark className="h-4 w-4 text-[#1B365D]" />
          </div>
          <p className="font-serif text-2xl font-bold tabular-nums text-[#2E7D32]">
            {formatKes(analytics.totalRevenueKes)}
          </p>
          <p className={`text-[11px] tabular-nums ${mutedText}`}>
            Today: <span className="font-semibold">{formatKes(analytics.todayInflowKes)}</span> · M-Pesa{" "}
            {formatKes(analytics.mpesaRevenueKes)} · eCitizen {formatKes(analytics.directTotalKes)}
          </p>
        </div>

        <div className={`rounded-2xl border p-4 space-y-2 ${cardSurface}`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>
              Total Successful Payments
            </span>
            <CheckCircle2 className="h-4 w-4 text-[#2E7D32]" />
          </div>
          <p className="font-serif text-2xl font-bold tabular-nums">
            {analytics.totalSuccessfulPayments.toLocaleString("en-KE")}
          </p>
          <p className={`text-[11px] tabular-nums ${mutedText}`}>
            {analytics.successfulMpesaCount} M-Pesa STK · {analytics.successfulDirectCount} eCitizen / Direct
          </p>
        </div>

        <div className={`rounded-2xl border p-4 space-y-2 ${cardSurface}`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>
              Pending vs. Approved Orders
            </span>
            <Clock className="h-4 w-4 text-[#D97706]" />
          </div>
          <p className="font-serif text-2xl font-bold tabular-nums">
            <span className="text-[#D97706]">{analytics.pendingOrdersCount}</span>
            <span className={`mx-1.5 text-base font-normal ${mutedText}`}>/</span>
            <span className="text-[#2E7D32]">{analytics.approvedOrdersCount}</span>
          </p>
          <p className={`text-[11px] tabular-nums ${mutedText}`}>
            {analytics.orderApprovalRate}% approved · {formatKes(analytics.pendingOrdersValueKes)} awaiting review
          </p>
        </div>

        <div className={`rounded-2xl border p-4 space-y-2 ${cardSurface}`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>
              M-Pesa Settlement Rate
            </span>
            <ShieldCheck className="h-4 w-4 text-[#A8421B]" />
          </div>
          <p className="font-serif text-2xl font-bold tabular-nums text-[#1B365D] dark:text-[#F5F2EB]">
            {analytics.mpesaSuccessRate}%
          </p>
          <p className={`text-[11px] tabular-nums ${mutedText}`}>
            {analytics.completedMpesaCount} settled · {analytics.failedMpesaCount} failed/cancelled ·{" "}
            {analytics.pendingAllCount} total pending
          </p>
        </div>
      </div>

      {/* Primary Charts Row: Daily Revenue Trend + Pending vs Approved Orders */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-w-0">
        {/* Daily Revenue Trends (AreaChart) */}
        <div className={`xl:col-span-7 rounded-2xl border p-4 sm:p-5 space-y-4 min-w-0 ${cardSurface}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="font-serif text-base font-bold">Daily Revenue Trends ({rangeDays}-Day Window)</h4>
              <p className={`text-xs ${mutedText}`}>
                Verified KES inflows across M-Pesa Daraja callbacks and eCitizen / direct confirmations
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-medium">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#2E7D32]" />
                M-Pesa STK
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#1B365D]" />
                eCitizen / Direct
              </span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full min-w-0">
            {!hasDailyRevenue ? (
              <div className={`h-full rounded-xl border border-dashed flex flex-col items-center justify-center p-6 text-center ${subtleSurface}`}>
                <CreditCard className={`h-6 w-6 mb-2 ${mutedText}`} />
                <p className="text-xs font-semibold">No verified revenue recorded in the last {rangeDays} days</p>
                <p className={`text-[11px] mt-1 max-w-sm ${mutedText}`}>
                  Complete an M-Pesa STK push or confirm a pending eCitizen/direct order below to populate daily revenue trends.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dailySeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mpesaRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#2E7D32" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="ecitizenRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1B365D" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#1B365D" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: axisTickColor }}
                    tickLine={false}
                    axisLine={{ stroke: gridStroke }}
                    minTickGap={16}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: axisTickColor }}
                    tickLine={false}
                    axisLine={false}
                    width={54}
                    tickFormatter={(v) => (Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v))}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const point = payload[0]?.payload as {
                        mpesaKes: number;
                        ecitizenKes: number;
                        totalKes: number;
                        successfulCount: number;
                      };
                      return (
                        <div className={`rounded-xl border px-3 py-2.5 text-xs shadow-lg ${cardSurface}`}>
                          <p className="font-semibold mb-1.5">{label}</p>
                          <div className="space-y-1 tabular-nums">
                            <p className="flex items-center justify-between gap-4">
                              <span className="text-[#2E7D32] font-medium">M-Pesa STK:</span>
                              <span className="font-semibold">{formatKes(point.mpesaKes)}</span>
                            </p>
                            <p className="flex items-center justify-between gap-4">
                              <span className="text-[#1B365D] dark:text-sky-300 font-medium">eCitizen / Direct:</span>
                              <span className="font-semibold">{formatKes(point.ecitizenKes)}</span>
                            </p>
                            <div className="pt-1 mt-1 border-t border-[#E7E1D8] dark:border-[#332C26] flex items-center justify-between gap-4">
                              <span className={mutedText}>Total ({point.successfulCount} tx):</span>
                              <span className="font-bold">{formatKes(point.totalKes)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  {channelFilter !== "ecitizen" && (
                    <Area
                      type="monotone"
                      dataKey="mpesaKes"
                      name="M-Pesa STK"
                      stackId="1"
                      stroke="#2E7D32"
                      strokeWidth={2}
                      fill="url(#mpesaRevenueGrad)"
                    />
                  )}
                  {channelFilter !== "mpesa" && (
                    <Area
                      type="monotone"
                      dataKey="ecitizenKes"
                      name="eCitizen / Direct"
                      stackId="1"
                      stroke="#1B365D"
                      strokeWidth={2}
                      fill="url(#ecitizenRevenueGrad)"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pending vs. Approved Orders & Fee Claims (Grouped BarChart) */}
        <div className={`xl:col-span-5 rounded-2xl border p-4 sm:p-5 space-y-4 min-w-0 ${cardSurface}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="font-serif text-base font-bold">Pending vs. Approved by Stream</h4>
              <p className={`text-xs ${mutedText}`}>
                Live order fulfillment, M-Pesa STK callbacks, and tuition claims
              </p>
            </div>
            <div className="flex items-center gap-2.5 text-[11px] font-medium">
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#D97706]" />
                Pending
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#2E7D32]" />
                Approved
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#BE123C]" />
                Rejected
              </span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.statusComparisonData}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="stream"
                  tick={{ fontSize: 11, fill: axisTickColor }}
                  tickLine={false}
                  axisLine={{ stroke: gridStroke }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: axisTickColor }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(27,54,93,0.04)" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    return (
                      <div className={`rounded-xl border px-3 py-2 text-xs shadow-lg ${cardSurface}`}>
                        <p className="font-semibold mb-1">{label}</p>
                        {payload.map((entry) => (
                          <p key={String(entry.dataKey)} className="flex items-center justify-between gap-4 tabular-nums">
                            <span style={{ color: entry.color }}>{entry.name}:</span>
                            <span className="font-semibold">{entry.value}</span>
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="pending" name="Pending" fill="#D97706" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="approved" name="Approved" fill="#2E7D32" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="rejected" name="Rejected / Failed" fill="#BE123C" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Secondary Row: Order Outcome Donut + Revenue by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-w-0">
        {/* Donut Breakdown */}
        <div className={`lg:col-span-5 rounded-2xl border p-4 sm:p-5 space-y-4 min-w-0 ${cardSurface}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-serif text-base font-bold">Order &amp; Payment Split</h4>
              <p className={`text-xs ${mutedText}`}>Status distribution</p>
            </div>
            <div className={`inline-flex rounded-lg border p-0.5 ${subtleSurface}`}>
              <button
                type="button"
                onClick={() => setOutcomeScope("orders")}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                  outcomeScope === "orders" ? "bg-[#1B365D] text-white" : mutedText
                }`}
              >
                Book Orders
              </button>
              <button
                type="button"
                onClick={() => setOutcomeScope("combined")}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                  outcomeScope === "combined" ? "bg-[#1B365D] text-white" : mutedText
                }`}
              >
                All Payments
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
            <div className="h-48 w-full relative min-w-0">
              {totalPieCount === 0 ? (
                <div className={`h-full rounded-xl border border-dashed flex items-center justify-center text-xs ${subtleSurface} ${mutedText}`}>
                  No records yet
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={74}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {analytics.pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const item = payload[0];
                          return (
                            <div className={`rounded-lg border px-2.5 py-1.5 text-xs shadow-md tabular-nums ${cardSurface}`}>
                              <span className="font-semibold">{item.name}: </span>
                              <span>{item.value}</span>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-serif text-xl font-bold tabular-nums">{totalPieCount}</span>
                    <span className={`font-mono text-[10px] uppercase ${mutedText}`}>
                      {outcomeScope === "orders" ? "Orders" : "Total"}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2.5">
              {analytics.pieData.map((row) => {
                const pct = totalPieCount > 0 ? Math.round((row.value / totalPieCount) * 100) : 0;
                return (
                  <div
                    key={row.name}
                    className={`rounded-xl border px-3 py-2 flex items-center justify-between gap-2 text-xs ${subtleSurface}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="truncate font-medium">{row.name}</span>
                    </div>
                    <span className="font-mono font-semibold tabular-nums shrink-0">
                      {row.value} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Successful Payments by Product / Category */}
        <div className={`lg:col-span-7 rounded-2xl border p-4 sm:p-5 space-y-4 min-w-0 ${cardSurface}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-serif text-base font-bold">Successful Payments by Revenue Stream</h4>
              <p className={`text-xs ${mutedText}`}>
                Verified KES breakdown across digital books, school fees, courses, and study subscriptions
              </p>
            </div>
            {onOpenMpesaLedger && (
              <button
                type="button"
                onClick={onOpenMpesaLedger}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#A8421B] hover:underline cursor-pointer"
              >
                <span>Open M-Pesa Gateway Log</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="h-44 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.streamRevenue}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: axisTickColor }}
                  tickLine={false}
                  axisLine={{ stroke: gridStroke }}
                  tickFormatter={(v) => (Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v))}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={118}
                  tick={{ fontSize: 11, fill: axisTickColor }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(27,54,93,0.04)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const row = payload[0]?.payload as {
                      category: string;
                      revenueKes: number;
                      count: number;
                    };
                    return (
                      <div className={`rounded-xl border px-3 py-2 text-xs shadow-lg tabular-nums ${cardSurface}`}>
                        <p className="font-semibold">{row.category}</p>
                        <p className="text-[#2E7D32] font-bold mt-0.5">{formatKes(row.revenueKes)}</p>
                        <p className={mutedText}>{row.count} successful payment(s)</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="revenueKes" fill="#1B365D" radius={[0, 6, 6, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Unified Pending Verification & Approved Orders Bulk Print Queue */}
      <div id="finance-ledger-queue" className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${cardSurface}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-[#E7E1D8] dark:border-[#332C26] pb-3.5">
          <div>
            <h4 className="font-serif text-base font-bold">
              {ledgerMode === "approved_orders"
                ? "Approved Orders — Bookkeeping & Bulk Print"
                : "M-Pesa & eCitizen Verification Queue"}
            </h4>
            <p className={`text-xs ${mutedText}`}>
              {ledgerMode === "approved_orders"
                ? "Select one or more approved orders to generate a formatted bookkeeping print voucher"
                : "Pending claims are prioritized at the top; approved orders can be checked for Bulk Print"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Switcher */}
            <div className={`inline-flex rounded-xl border p-0.5 ${subtleSurface}`} role="group" aria-label="Queue view mode">
              <button
                type="button"
                onClick={() => setLedgerMode("all")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  ledgerMode === "all" ? "bg-[#A8421B] text-white" : `${mutedText} hover:text-[#A8421B]`
                }`}
              >
                All Activity ({unifiedLedger.length})
              </button>
              <button
                type="button"
                onClick={() => setLedgerMode("approved_orders")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold tabular-nums transition cursor-pointer ${
                  ledgerMode === "approved_orders"
                    ? "bg-[#1B365D] text-white"
                    : `${mutedText} hover:text-[#A8421B]`
                }`}
              >
                Approved Orders ({approvedOrdersList.length})
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Print Selection Bar */}
        <div className={`rounded-xl border px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 ${subtleSurface}`}>
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <button
              type="button"
              onClick={toggleSelectAllVisibleApproved}
              disabled={approvedOrdersList.length === 0}
              className={`px-2.5 py-1 rounded-lg border font-semibold transition cursor-pointer disabled:opacity-40 ${cardSurface} hover:border-[#1B365D]`}
            >
              {allVisibleApprovedSelected ? "Deselect Visible Approved" : `Select All Approved (${approvedOrdersList.length})`}
            </button>
            {selectedApprovedOrders.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedOrderIds([])}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${mutedText} hover:text-[#BE123C] cursor-pointer`}
              >
                Clear ({selectedApprovedOrders.length})
              </button>
            )}
            <span className={`text-[11px] tabular-nums ${mutedText}`}>
              {selectedApprovedOrders.length === 0
                ? "Check approved orders below to prepare a bookkeeping print sheet"
                : `${selectedApprovedOrders.length} order(s) selected · Batch Total: `}
              {selectedApprovedOrders.length > 0 && (
                <strong className="text-[#2E7D32] font-semibold">
                  {formatKes(bulkPrintSummary.totalKes)}
                </strong>
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {ledgerMode === "approved_orders" && (
              <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${cardSurface}`}>
                <Search className={`h-3.5 w-3.5 shrink-0 ${mutedText}`} />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Filter order, customer, ref..."
                  className="bg-transparent text-xs outline-none w-36 sm:w-44"
                />
                {orderSearch && (
                  <button
                    type="button"
                    onClick={() => setOrderSearch("")}
                    className={`${mutedText} hover:text-[#A8421B] cursor-pointer`}
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={selectedApprovedOrders.length === 0}
              onClick={() => setIsPrintPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B365D] hover:bg-[#152B4A] text-white text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="tabular-nums">
                Print Bookkeeping Sheet ({selectedApprovedOrders.length})
              </span>
            </button>
          </div>
        </div>

        {ledgerMode === "approved_orders" ? (
          approvedOrdersList.length === 0 ? (
            <p className={`text-xs py-8 text-center ${mutedText}`}>
              No approved orders match the current channel or search filter.
            </p>
          ) : (
            <>
              {/* Approved Orders Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b border-[#E7E1D8] dark:border-[#332C26] font-mono text-[10px] uppercase tracking-wider ${mutedText}`}>
                      <th className="py-2.5 pr-3 w-8">
                        <input
                          type="checkbox"
                          checked={allVisibleApprovedSelected}
                          onChange={toggleSelectAllVisibleApproved}
                          aria-label="Select all visible approved orders"
                          className="h-4 w-4 rounded accent-[#1B365D] cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 pr-3">Order &amp; Customer</th>
                      <th className="py-2.5 px-3">Channel</th>
                      <th className="py-2.5 px-3">Reference</th>
                      <th className="py-2.5 px-3">Verified By</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 pl-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E1D8] dark:divide-[#332C26]">
                    {approvedOrdersList.map((ord) => {
                      const checked = selectedOrderSet.has(ord.id);
                      return (
                        <tr
                          key={ord.id}
                          onClick={() => toggleOrderSelection(ord.id)}
                          className={`cursor-pointer transition ${
                            checked
                              ? isDarkMode
                                ? "bg-[#1B365D]/20"
                                : "bg-[#F3EFE8]/70"
                              : ""
                          }`}
                        >
                          <td className="py-3 pr-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleOrderSelection(ord.id)}
                              aria-label={`Select order ${ord.id}`}
                              className="h-4 w-4 rounded accent-[#1B365D] cursor-pointer"
                            />
                          </td>
                          <td className="py-3 pr-3">
                            <p className="font-semibold">{ord.bookTitle || "Book Order"}</p>
                            <p className={`text-[11px] ${mutedText}`}>
                              {ord.userName || ord.userEmail} · {ord.userEmail}
                            </p>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 font-medium">
                              {ord.channel === "mpesa" ? (
                                <>
                                  <Smartphone className="h-3.5 w-3.5 text-[#2E7D32]" />
                                  <span>M-Pesa</span>
                                </>
                              ) : (
                                <>
                                  <Landmark className="h-3.5 w-3.5 text-[#1B365D] dark:text-sky-300" />
                                  <span>eCitizen / Direct</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] max-w-[160px] truncate" title={ord.paymentReference || ord.id}>
                            {ord.paymentReference || ord.id}
                          </td>
                          <td className={`py-3 px-3 text-[11px] max-w-[160px] truncate ${mutedText}`}>
                            {ord.verifiedBy || "Finance Officer"}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold tabular-nums whitespace-nowrap text-[#2E7D32]">
                            {formatKes(Number(ord.price) || 0)}
                          </td>
                          <td className={`py-3 pl-3 text-right whitespace-nowrap text-[11px] tabular-nums ${mutedText}`}>
                            {new Date(ord.updatedAt || ord.date).toLocaleDateString("en-KE", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Approved Orders Mobile Cards (< 768px) */}
              <div className="md:hidden space-y-2.5">
                {approvedOrdersList.map((ord) => {
                  const checked = selectedOrderSet.has(ord.id);
                  return (
                    <label
                      key={ord.id}
                      className={`block rounded-xl border p-3.5 space-y-2 text-xs cursor-pointer transition ${
                        checked
                          ? isDarkMode
                            ? "bg-[#1B365D]/25 border-[#1B365D]"
                            : "bg-[#F3EFE8] border-[#1B365D]"
                          : subtleSurface
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOrderSelection(ord.id)}
                          className="mt-0.5 h-4 w-4 rounded accent-[#1B365D] shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold truncate">{ord.bookTitle || "Book Order"}</p>
                            <span className="font-bold tabular-nums shrink-0 text-[#2E7D32]">
                              {formatKes(Number(ord.price) || 0)}
                            </span>
                          </div>
                          <p className={`text-[11px] truncate ${mutedText}`}>
                            {ord.userName || ord.userEmail}
                          </p>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] mt-1.5">
                            <span className={`font-mono ${mutedText}`}>
                              {ord.channel === "mpesa" ? "M-Pesa" : "eCitizen"} · {ord.paymentReference || ord.id}
                            </span>
                            <span className={`tabular-nums ${mutedText}`}>
                              {new Date(ord.updatedAt || ord.date).toLocaleDateString("en-KE", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          )
        ) : unifiedLedger.length === 0 ? (
          <p className={`text-xs py-8 text-center ${mutedText}`}>
            No orders or payment transactions match the selected channel filter.
          </p>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b border-[#E7E1D8] dark:border-[#332C26] font-mono text-[10px] uppercase tracking-wider ${mutedText}`}>
                    <th className="py-2.5 pr-2 w-7" aria-label="Bulk print select" />
                    <th className="py-2.5 pr-3">Item &amp; Customer</th>
                    <th className="py-2.5 px-3">Channel</th>
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 pl-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E1D8] dark:divide-[#332C26]">
                  {unifiedLedger.map((row) => {
                    const isSelectableOrder = row.kind === "order" && row.status === "approved";
                    const checked = isSelectableOrder && selectedOrderSet.has(row.recordId);
                    return (
                      <tr key={row.key}>
                        <td className="py-3 pr-2">
                          {isSelectableOrder ? (
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleOrderSelection(row.recordId)}
                              aria-label={`Select approved order ${row.recordId} for bulk print`}
                              className="h-4 w-4 rounded accent-[#1B365D] cursor-pointer"
                            />
                          ) : (
                            <span className={`inline-block w-4 text-center ${mutedText}`}>—</span>
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          <p className="font-semibold">{row.title}</p>
                          <p className={`text-[11px] ${mutedText}`}>
                            {row.customer} · {row.email}
                          </p>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            {row.channel === "mpesa" ? (
                              <>
                                <Smartphone className="h-3.5 w-3.5 text-[#2E7D32]" />
                                <span>M-Pesa</span>
                              </>
                            ) : (
                              <>
                                <Landmark className="h-3.5 w-3.5 text-[#1B365D] dark:text-sky-300" />
                                <span>eCitizen / Direct</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] max-w-[180px] truncate" title={row.reference}>
                          {row.reference}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold tabular-nums whitespace-nowrap">
                          {formatKes(row.amount)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold uppercase ${
                              row.status === "approved"
                                ? "text-[#2E7D32]"
                                : row.status === "pending"
                                ? "text-[#D97706]"
                                : "text-[#BE123C]"
                            }`}
                          >
                            {row.status === "approved" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : row.status === "pending" ? (
                              <Clock className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {row.rawStatus}
                          </span>
                        </td>
                        <td className="py-3 pl-3 text-right whitespace-nowrap">
                          {row.status === "pending" && (row.kind === "order" || row.kind === "fee") ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={actionBusyId === row.recordId}
                                onClick={() => handleAction(row.kind as "order" | "fee", row.recordId, "approve")}
                                className="px-2.5 py-1 rounded-lg bg-[#2E7D32] hover:bg-[#246628] text-white font-semibold text-[11px] cursor-pointer disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={actionBusyId === row.recordId}
                                onClick={() => handleAction(row.kind as "order" | "fee", row.recordId, "reject")}
                                className="px-2.5 py-1 rounded-lg bg-[#BE123C] hover:bg-[#9F1239] text-white font-semibold text-[11px] cursor-pointer disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className={`text-[11px] ${mutedText}`}>
                              {new Date(row.timestamp).toLocaleDateString("en-KE", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (< 768px) */}
            <div className="md:hidden space-y-2.5">
              {unifiedLedger.map((row) => {
                const isSelectableOrder = row.kind === "order" && row.status === "approved";
                const checked = isSelectableOrder && selectedOrderSet.has(row.recordId);
                return (
                  <div key={row.key} className={`rounded-xl border p-3.5 space-y-2 text-xs ${subtleSurface}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        {isSelectableOrder && (
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOrderSelection(row.recordId)}
                            aria-label={`Select approved order ${row.recordId} for bulk print`}
                            className="mt-0.5 h-4 w-4 rounded accent-[#1B365D] shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{row.title}</p>
                          <p className={`text-[11px] truncate ${mutedText}`}>{row.customer}</p>
                        </div>
                      </div>
                      <span className="font-bold tabular-nums shrink-0">{formatKes(row.amount)}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className={`font-mono ${mutedText}`}>
                        {row.channel === "mpesa" ? "M-Pesa" : "eCitizen"} · {row.reference}
                      </span>
                      <span
                        className={`font-mono font-semibold uppercase ${
                          row.status === "approved"
                            ? "text-[#2E7D32]"
                            : row.status === "pending"
                            ? "text-[#D97706]"
                            : "text-[#BE123C]"
                        }`}
                      >
                        {row.rawStatus}
                      </span>
                    </div>
                    {row.status === "pending" && (row.kind === "order" || row.kind === "fee") && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          disabled={actionBusyId === row.recordId}
                          onClick={() => handleAction(row.kind as "order" | "fee", row.recordId, "approve")}
                          className="flex-1 py-1.5 rounded-lg bg-[#2E7D32] text-white font-semibold text-[11px] cursor-pointer disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={actionBusyId === row.recordId}
                          onClick={() => handleAction(row.kind as "order" | "fee", row.recordId, "reject")}
                          className="flex-1 py-1.5 rounded-lg bg-[#BE123C] text-white font-semibold text-[11px] cursor-pointer disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Formatted Bulk Print Bookkeeping Preview Modal (Portal) */}
      {isPrintPreviewOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            id="finance-bulk-print-modal"
            className="fixed inset-0 z-50 bg-black/75 overflow-y-auto p-3 sm:p-6 flex flex-col items-center"
            role="dialog"
            aria-modal="true"
            aria-label="Bookkeeping Print Preview"
          >
            {/* Screen Controls (Hidden on Print) */}
            <div className="no-print w-full max-w-5xl rounded-2xl border border-[#332C26] bg-[#1E1A17] text-[#F5F2EB] p-4 mb-4 space-y-3 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-[#D96B3E]" />
                  <div>
                    <h4 className="font-serif text-base font-bold">
                      Bookkeeping Print View · {selectedApprovedOrders.length} Approved Order(s)
                    </h4>
                    <p className="text-[11px] text-[#B5ABA2] tabular-nums">
                      Batch {bulkPrintSummary.batchRef} · Total {formatKes(bulkPrintSummary.totalKes)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#246628] text-white text-xs font-semibold cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print / Save PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrintPreviewOpen(false)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#332C26] hover:border-[#D96B3E] text-xs font-semibold cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Close</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="block text-[11px] space-y-1">
                  <span className="font-mono uppercase text-[#B5ABA2]">Prepared By (Signatory)</span>
                  <input
                    type="text"
                    value={preparedBy}
                    onChange={(e) => setPreparedBy(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#332C26] bg-[#141210] text-xs text-white outline-none focus:border-[#D96B3E]"
                  />
                </label>
                <label className="block text-[11px] space-y-1">
                  <span className="font-mono uppercase text-[#B5ABA2]">Bookkeeping Voucher Note</span>
                  <input
                    type="text"
                    value={voucherNote}
                    onChange={(e) => setVoucherNote(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#332C26] bg-[#141210] text-xs text-white outline-none focus:border-[#D96B3E]"
                  />
                </label>
              </div>
            </div>

            {/* Printable Bookkeeping Sheet */}
            <div
              id="finance-bulk-print-sheet"
              className="w-full max-w-5xl rounded-2xl bg-white text-[#111827] border border-[#D6D3CD] shadow-2xl p-6 sm:p-10 space-y-6"
            >
              {/* Voucher Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b-2 border-[#1B365D] pb-5">
                <div className="space-y-1">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#A8421B]">
                    Zion Digital · Finance &amp; Bookkeeping
                  </p>
                  <h2 className="font-serif text-2xl font-bold text-[#111827]">
                    Approved Orders Bookkeeping Voucher
                  </h2>
                  <p className="text-xs text-[#4B5563]">
                    Official settlement ledger for verified M-Pesa Daraja and eCitizen / Direct orders
                  </p>
                </div>
                <div className="text-left sm:text-right text-xs space-y-1 tabular-nums">
                  <p>
                    <span className="text-[#6B7280]">Batch Ref:</span>{" "}
                    <strong className="font-mono text-[#111827]">{bulkPrintSummary.batchRef}</strong>
                  </p>
                  <p>
                    <span className="text-[#6B7280]">Generated:</span>{" "}
                    <strong className="text-[#111827]">
                      {new Date().toLocaleString("en-KE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>
                  </p>
                  <p>
                    <span className="text-[#6B7280]">Channel Scope:</span>{" "}
                    <strong className="text-[#111827] uppercase">
                      {channelFilter === "all"
                        ? "All Channels"
                        : channelFilter === "mpesa"
                        ? "M-Pesa Daraja"
                        : "eCitizen / Direct"}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Channel Reconciliation Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3.5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#6B7280]">
                    M-Pesa Daraja Settled
                  </p>
                  <p className="font-serif text-lg font-bold tabular-nums text-[#111827] mt-0.5">
                    {formatKes(bulkPrintSummary.mpesaKes)}
                  </p>
                  <p className="text-[11px] text-[#4B5563] tabular-nums">
                    {bulkPrintSummary.mpesaCount} approved order(s)
                  </p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3.5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#6B7280]">
                    eCitizen / Direct Settled
                  </p>
                  <p className="font-serif text-lg font-bold tabular-nums text-[#111827] mt-0.5">
                    {formatKes(bulkPrintSummary.ecitizenKes)}
                  </p>
                  <p className="text-[11px] text-[#4B5563] tabular-nums">
                    {bulkPrintSummary.ecitizenCount} approved order(s)
                  </p>
                </div>
                <div className="rounded-xl border border-[#1B365D]/30 bg-[#F3F6FA] p-3.5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#1B365D]">
                    Batch Grand Total
                  </p>
                  <p className="font-serif text-lg font-bold tabular-nums text-[#1B365D] mt-0.5">
                    {formatKes(bulkPrintSummary.totalKes)}
                  </p>
                  <p className="text-[11px] text-[#374151] tabular-nums">
                    {selectedApprovedOrders.length} total order(s)
                  </p>
                </div>
              </div>

              {/* Itemized Bookkeeping Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-y border-[#111827] bg-[#F9FAFB] font-mono text-[10px] uppercase tracking-wider text-[#374151]">
                      <th className="py-2.5 px-2">#</th>
                      <th className="py-2.5 px-2">Date</th>
                      <th className="py-2.5 px-2">Order ID</th>
                      <th className="py-2.5 px-2">Customer</th>
                      <th className="py-2.5 px-2">Item / Book Title</th>
                      <th className="py-2.5 px-2">Channel</th>
                      <th className="py-2.5 px-2">Payment Ref</th>
                      <th className="py-2.5 px-2">Verified By</th>
                      <th className="py-2.5 px-2 text-right">Amount (KES)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {selectedApprovedOrders.map((ord, index) => (
                      <tr key={ord.id}>
                        <td className="py-2.5 px-2 font-mono text-[11px] text-[#6B7280] tabular-nums">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap tabular-nums text-[11px]">
                          {new Date(ord.updatedAt || ord.date).toLocaleDateString("en-KE", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-[10px] text-[#374151] max-w-[110px] truncate">
                          {ord.id}
                        </td>
                        <td className="py-2.5 px-2">
                          <p className="font-semibold text-[#111827]">{ord.userName || ord.userEmail}</p>
                          <p className="text-[10px] text-[#6B7280]">{ord.userEmail}</p>
                        </td>
                        <td className="py-2.5 px-2 font-medium text-[#111827]">
                          {ord.bookTitle || "Book Order"}
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap text-[11px]">
                          {ord.channel === "mpesa" ? "M-Pesa" : "eCitizen / Direct"}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-[10px] text-[#111827] max-w-[130px] break-all">
                          {ord.paymentReference || "—"}
                        </td>
                        <td className="py-2.5 px-2 text-[11px] text-[#4B5563]">
                          {ord.verifiedBy || "Finance Officer"}
                        </td>
                        <td className="py-2.5 px-2 text-right font-semibold tabular-nums whitespace-nowrap text-[#111827]">
                          {Number(ord.price || 0).toLocaleString("en-KE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#111827] bg-[#F9FAFB]">
                      <td colSpan={8} className="py-3 px-2 text-right font-mono text-xs font-bold uppercase tracking-wider text-[#111827]">
                        Grand Total ({selectedApprovedOrders.length} Approved Orders)
                      </td>
                      <td className="py-3 px-2 text-right font-serif text-sm font-bold tabular-nums text-[#111827] whitespace-nowrap">
                        KES{" "}
                        {bulkPrintSummary.totalKes.toLocaleString("en-KE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {voucherNote.trim() && (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-xs text-[#374151]">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mr-2">
                    Accounting Note:
                  </span>
                  <span>{voucherNote}</span>
                </div>
              )}

              {/* Bookkeeping Sign-off Footer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-[#E5E7EB] text-xs">
                <div className="space-y-6">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#6B7280]">
                    Prepared By
                  </p>
                  <div className="border-b border-[#9CA3AF] pb-1 font-semibold text-[#111827]">
                    {preparedBy || "Finance Manager"}
                  </div>
                  <p className="text-[10px] text-[#6B7280]">Signature &amp; Date</p>
                </div>
                <div className="space-y-6">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#6B7280]">
                    Verified / Audited By
                  </p>
                  <div className="border-b border-[#9CA3AF] pb-1 text-transparent select-none">.</div>
                  <p className="text-[10px] text-[#6B7280]">Chief Accountant / Auditor</p>
                </div>
                <div className="space-y-6">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#6B7280]">
                    Approved &amp; Stamped
                  </p>
                  <div className="border-b border-[#9CA3AF] pb-1 text-transparent select-none">.</div>
                  <p className="text-[10px] text-[#6B7280]">Institutional Stamp &amp; Date</p>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
