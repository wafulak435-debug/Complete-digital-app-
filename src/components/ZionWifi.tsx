import React, { useState, useEffect, useRef } from "react";
import { 
  Wifi, ShieldCheck, Lock, Unlock, RefreshCw, Sliders, Clock, 
  Coins, Users, Smartphone, AlertTriangle, Check, Loader2, Zap, CreditCard, ArrowRight,
  MapPin, Navigation, Search, QrCode, Hourglass, Activity, Map, X
} from "lucide-react";
import * as d3 from "d3";
import { User, WifiPurchase } from "../types";
import { saveWifiPurchaseToFirestore, fetchWifiPurchasesFromFirestore, handleFirestoreError, OperationType } from "../lib/firestoreUtils";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

interface ZionWifiProps {
  currentUser: User | null;
  isOnline: boolean;
  onLogIn: () => void;
}

interface WifiNode {
  id: string;
  hostName: string;
  hostEmail: string;
  signalStrength: 'Excellent' | 'Good' | 'Fair';
  clientsCount: number;
  sharedAt: string;
}

export interface MapHotspot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  strength: "Excellent" | "Good" | "Fair";
  clients: number;
  ssid: string;
  district: string;
}

const MAP_HOTSPOTS_DB: MapHotspot[] = [
  // Bungoma, Kenya
  { id: "b1", name: "Zion Chapel Cyber Gate", lat: 0.5635, lng: 34.5605, strength: "Excellent", clients: 14, ssid: "ZionMesh_Chapel_5G", district: "Bungoma, Kenya" },
  { id: "b2", name: "Kelvin Opara Wafula (Office)", lat: 0.5645, lng: 34.5585, strength: "Excellent", clients: 5, ssid: "ZionMesh_Wafula_HQ", district: "Bungoma, Kenya" },
  { id: "b3", name: "Bungoma Town Hall Hub", lat: 0.5601, lng: 34.5612, strength: "Good", clients: 9, ssid: "ZionMesh_TownHall", district: "Bungoma, Kenya" },
  { id: "b4", name: "Kanduyi Junction Tower", lat: 0.5710, lng: 34.5420, strength: "Fair", clients: 4, ssid: "ZionMesh_Kanduyi_Free", district: "Bungoma, Kenya" },
  { id: "b5", name: "Bungoma Gateway Plaza", lat: 0.5651, lng: 34.5668, strength: "Good", clients: 12, ssid: "ZionMesh_GatewayPlaza", district: "Bungoma, Kenya" },

  // Nairobi, Kenya
  { id: "n1", name: "Nairobi CBD Greenmesh Hub", lat: -1.286389, lng: 36.817223, strength: "Excellent", clients: 43, ssid: "ZionMesh_Nairobi_CBD_Core", district: "Nairobi, Kenya" },
  { id: "n2", name: "Westlands Mall Bypass", lat: -1.2612, lng: 36.8044, strength: "Good", clients: 25, ssid: "ZionMesh_Westlands_Proxy", district: "Nairobi, Kenya" },
  { id: "n3", name: "Kenyatta Ave High-Speed", lat: -1.2850, lng: 36.8190, strength: "Excellent", clients: 18, ssid: "ZionMesh_Kenyatta_Super", district: "Nairobi, Kenya" },

  // New York, USA
  { id: "ny1", name: "Times Square Corner Spot", lat: 40.7580, lng: -73.9855, strength: "Excellent", clients: 87, ssid: "ZionMesh_NY_TimesSq", district: "New York, USA" },
  { id: "ny2", name: "Central Park Oasis Free Wifi", lat: 40.7851, lng: -73.9683, strength: "Good", clients: 29, ssid: "ZionMesh_CentralPark_5G", district: "New York, USA" },

  // London, UK
  { id: "l1", name: "King's Cross Transit Portal", lat: 51.5309, lng: -0.1238, strength: "Excellent", clients: 62, ssid: "ZionMesh_LDN_KingsCross", district: "London, UK" },
  { id: "l2", name: "Soho Media Hub Gateway", lat: 51.5136, lng: -0.1365, strength: "Good", clients: 31, ssid: "ZionMesh_Soho_Creative", district: "London, UK" },

  // Tokyo, Japan
  { id: "t1", name: "Shibuya Crossing Node Alpha", lat: 35.6595, lng: 139.7005, strength: "Excellent", clients: 110, ssid: "ZionMesh_TYO_Shibuya", district: "Tokyo, Japan" },
  { id: "t2", name: "Shinjuku Station Gateway", lat: 35.6909, lng: 139.7003, strength: "Good", clients: 74, ssid: "ZionMesh_TYO_Shinjuku", district: "Tokyo, Japan" }
];

export default function ZionWifi({ currentUser, isOnline, onLogIn }: ZionWifiProps) {
  // Available packages
  const presets = [
    { id: "1h", name: "1 Hour Zion Fast", durationText: "1 Hour", price: 4, desc: "Ultra-low rate local bypass. Ideal for quick check-ins." },
    { id: "2h", name: "2 Hours Zion Fast", durationText: "2 Hours", price: 7, desc: "Double uptime at KES 3.5 per hour. Best for studies." },
    { id: "24h", name: "24 Hours Day Pass", durationText: "24 Hours (1 Day)", price: 25, desc: "Full round-the-clock unlimited access pass." },
    { id: "7d", name: "7 Days Week Super", durationText: "7 Days (1 Week)", price: 150, desc: "Secure weekly flatrate. 40% more savings." },
    { id: "30d", name: "30 Days Elite Pass", durationText: "30 Days (1 Month)", price: 550, desc: "Unlimited monthly high-speed digital flow." },
    { id: "365d", name: "Annual Mega Pass", durationText: "365 Days (1 Year)", price: 4500, desc: "Enterprise annual pass for ultimate digital learners." },
  ];

  // Component States
  const [selectedPack, setSelectedPack] = useState(presets[0]);
  const [customHours, setCustomHours] = useState(5);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [activeNodes, setActiveNodes] = useState<WifiNode[]>([]);
  const [wifiPurchases, setWifiPurchases] = useState<WifiPurchase[]>([]);
  const [activeTunnelHost, setActiveTunnelHost] = useState<string | null>(null);

  // Connection & Tunnel States
  const [isConnectingNode, setIsConnectingNode] = useState<string | null>(null);
  const [isTunnelConnected, setIsTunnelConnected] = useState<string | null>(null);

  // Checkout States
  const [showPayModal, setShowPayModal] = useState(false);
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [paymentGateway, setPaymentGateway] = useState<'mpesa' | 'ecitizen'>('mpesa');
  const [stkStatus, setStkStatus] = useState<'idle' | 'sending' | 'pending' | 'success' | 'failed'>('idle');
  const [pinSent, setPinSent] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // Safaricom comparison calculation
  // Safaricom charges KES 10 for 1 Hour high speed (Zion is 4 KES)
  // Safaricom average 1GB daily is KES 99 (Zion unlimited daily is KES 25)
  const calculateSafaricomRate = (hours: number) => hours * 10;
  const calculateZionRate = (hours: number) => {
    if (hours <= 2) return hours * 4;
    if (hours <= 24) return Math.round(hours * 3.0);
    if (hours <= 168) return Math.round(hours * 1.5);
    return Math.round(hours * 1.2);
  };

  // --- ADDITIONAL INTERACTIVE FEATURES STATE ---
  // 1. Interactive world map and searching
  const [mapSearch, setMapSearch] = useState("Bungoma, Kenya");
  const [currentMapCenter, setCurrentMapCenter] = useState({ lat: 0.5635, lng: 34.5605 });
  const [mapHotspots, setMapHotspots] = useState<MapHotspot[]>(
    MAP_HOTSPOTS_DB.filter(h => h.district === "Bungoma, Kenya")
  );
  const [selectedMapNode, setSelectedMapNode] = useState<MapHotspot | null>(
    MAP_HOTSPOTS_DB.find(h => h.id === "b2") || MAP_HOTSPOTS_DB[0]
  );
  const [mapZoom, setMapZoom] = useState(14);

  // 2. Countdown Notification States
  const [timeLeftSecs, setTimeLeftSecs] = useState<number | null>(null);
  const [showCountdownWarning, setShowCountdownWarning] = useState(false);

  // 3. D3 Bandwidth visualization data
  const [bandwidthData, setBandwidthData] = useState<{ time: Date; usage: number; limit: number }[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // 4. Hotspot Connection QR State
  const [qrSsid, setQrSsid] = useState("");
  const [qrSecurityToken, setQrSecurityToken] = useState("");
  const [showQrCode, setShowQrCode] = useState(false);

  // Real-time synchronization of purchase records
  useEffect(() => {
    if (!currentUser || currentUser.role === "guest" || !auth.currentUser) return;

    const isPrivileged = ["main_admin", "admin", "sub_admin", "manager"].includes(currentUser.role);
    const targetQuery = isPrivileged
      ? collection(db, "wifiPurchases")
      : query(collection(db, "wifiPurchases"), where("userId", "==", auth.currentUser.uid));

    const unSub = onSnapshot(targetQuery, (snap) => {
      const records: WifiPurchase[] = [];
      snap.forEach((docSnap) => {
        records.push({ id: docSnap.id, ...docSnap.data() } as WifiPurchase);
      });
      setWifiPurchases(records);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "wifiPurchases");
    });

    return () => unSub();
  }, [currentUser]);

  // Handle active host broadcast simulations
  useEffect(() => {
    // Simulated active hotspots in Bungoma area
    const defaults: WifiNode[] = [
      { id: "node-1", hostName: "Kelvin Opara Wafula (Office)", hostEmail: "wafulak435@gmail.com", signalStrength: "Excellent", clientsCount: 5, sharedAt: "9:15 AM" },
      { id: "node-2", hostName: "Zion Chapel Cyber Gate", hostEmail: "chapel.adm@zion.org", signalStrength: "Good", clientsCount: 14, sharedAt: "8:00 AM" },
    ];

    if (isBroadcasting && currentUser) {
      defaults.unshift({
        id: "node-user",
        hostName: `${currentUser.name} (My Hotspot Broadcast)`,
        hostEmail: currentUser.email,
        signalStrength: "Excellent",
        clientsCount: 2,
        sharedAt: "Just now"
      });
    }

    setActiveNodes(defaults);
  }, [isBroadcasting, currentUser]);

  const matchesCurrentUser = (purchaseUserId?: string) => {
    if (!purchaseUserId || !currentUser) return false;
    return (
      purchaseUserId === currentUser.id ||
      purchaseUserId === auth.currentUser?.uid ||
      purchaseUserId.toLowerCase() === currentUser.email.toLowerCase()
    );
  };

  // Check if current user owns an active (approved) pass for Zion Wi-Fi
  const activeApprovedPurchase = wifiPurchases.find(
    p => matchesCurrentUser(p.userId) && p.status === "approved"
  );

  const activePendingPurchase = wifiPurchases.find(
    p => matchesCurrentUser(p.userId) && p.status === "pending"
  );

  // --- 1. Real-time Countdown and 5-Min Remaining Warning Notification ---
  useEffect(() => {
    if (!activeApprovedPurchase) {
      setTimeLeftSecs(null);
      setShowCountdownWarning(false);
      return;
    }

    const targetDate = new Date(activeApprovedPurchase.expiresAt).getTime();
    
    const checkTime = () => {
      const remainingMs = targetDate - Date.now();
      const remainingSecs = Math.max(0, Math.floor(remainingMs / 1000));
      setTimeLeftSecs(remainingSecs);

      // Warn if user has less than 5 minutes remaining (300 seconds)
      if (remainingSecs > 0 && remainingSecs <= 300) {
        setShowCountdownWarning(true);
      } else {
        setShowCountdownWarning(false);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [activeApprovedPurchase, wifiPurchases]);

  // Handle simulated custom 5-Min demo plan addition for instant countdown verification
  const handleTriggerDemoCountdown = async () => {
    if (!currentUser) {
      onLogIn();
      return;
    }

    // Set expiration to exactly 5 minutes + 5 seconds from now
    const expiration = new Date();
    expiration.setTime(expiration.getTime() + 5 * 60 * 1000 + 5 * 1000);

    const demoPurchase: WifiPurchase = {
      id: "WFI-DEMO",
      userId: currentUser.email,
      userName: currentUser.name || "Demo User",
      planName: "5-Min Ticking Zion Test Pass",
      price: 0,
      phoneNumber: "0712345678",
      status: "approved",
      expiresAt: expiration.toISOString(),
      date: new Date().toISOString()
    };

    try {
      await saveWifiPurchaseToFirestore(demoPurchase);
    } catch (e) {
      console.error("Failed saving countdown demo purchase:", e);
    }
  };

  // --- 2. Live Bandwidth Signal Simulation & Interactive D3 Chart Rendering ---
  useEffect(() => {
    const now = new Date();
    const initialPoints = Array.from({ length: 15 }, (_, idx) => {
      const step = new Date(now.getTime() - (15 - idx) * 10000);
      return {
        time: step,
        usage: 18 + Math.sin(idx / 2) * 9 + Math.random() * 6,
        limit: 50
      };
    });
    setBandwidthData(initialPoints);

    const dataTimer = setInterval(() => {
      setBandwidthData((prev) => {
        if (prev.length === 0) return [];
        const nextTime = new Date();
        const lastUsage = prev[prev.length - 1].usage;
        // Moderate random fluctuations
        const nextUsage = Math.max(8, Math.min(48, lastUsage + (Math.random() - 0.5) * 8));
        return [
          ...prev.slice(1),
          {
            time: nextTime,
            usage: parseFloat(nextUsage.toFixed(2)),
            limit: 50
          }
        ];
      });
    }, 4000);

    return () => clearInterval(dataTimer);
  }, []);

  // Responsive D3 Chart Drawing Side-Effect
  useEffect(() => {
    if (!svgRef.current || bandwidthData.length === 0) return;

    try {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const width = 600;
      const height = 240;
      const margin = { top: 20, right: 30, bottom: 45, left: 45 };

      // Scales
      const xScale = d3.scaleTime()
        .domain(d3.extent(bandwidthData, (d: any) => d.time) as [Date, Date])
        .range([margin.left, width - margin.right]);

      const yScale = d3.scaleLinear()
        .domain([0, 60]) // up to 60 Mbps load
        .range([height - margin.bottom, margin.top]);

      // Horizontal grid lines
      svg.append("g")
        .attr("class", "grid")
        .attr("stroke", "#e2e8f0")
        .attr("stroke-opacity", 0.5)
        .selectAll("line")
        .data(yScale.ticks(5))
        .join("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", d => yScale(d))
        .attr("y2", d => yScale(d));

      // X Axis
      const xAxis = d3.axisBottom(xScale)
        .ticks(5)
        .tickFormat((d) => d3.timeFormat("%H:%M:%S")(d as Date));

      svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(xAxis)
        .attr("color", "#64748b")
        .attr("font-size", "10px")
        .selectAll("text")
        .attr("transform", "rotate(-10)")
        .style("text-anchor", "end");

      // Y Axis (Mbps Label)
      const yAxis = d3.axisLeft(yScale).ticks(5);
      svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(yAxis)
        .attr("color", "#64748b")
        .attr("font-size", "10px");

      // Define beautiful area gradient for neon blue glow
      const defs = svg.append("defs");
      const areaGradient = defs.append("linearGradient")
        .attr("id", "blue-glow-grad")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "0%").attr("y2", "100%");

      areaGradient.append("stop").attr("offset", "0%").attr("stop-color", "#2563eb").attr("stop-opacity", 0.45);
      areaGradient.append("stop").attr("offset", "100%").attr("stop-color", "#3b82f6").attr("stop-opacity", 0.0);

      // Area layout path
      const areaPath = d3.area<{ time: Date; usage: number; limit: number }>()
        .x(d => xScale(d.time))
        .y0(height - margin.bottom)
        .y1(d => yScale(d.usage))
        .curve(d3.curveMonotoneX);

      svg.append("path")
        .datum(bandwidthData)
        .attr("fill", "url(#blue-glow-grad)")
        .attr("d", areaPath);

      // Usage line compiler path
      const linePath = d3.line<{ time: Date; usage: number; limit: number }>()
        .x(d => xScale(d.time))
        .y(d => yScale(d.usage))
        .curve(d3.curveMonotoneX);

      svg.append("path")
        .datum(bandwidthData)
        .attr("fill", "none")
        .attr("stroke", "#2563eb")
        .attr("stroke-width", 2.5)
        .attr("d", linePath);

      // Target cap bandwidth line
      svg.append("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", yScale(50))
        .attr("y2", yScale(50))
        .attr("stroke", "#dc2626")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,4");

      // Red limit label badge
      svg.append("text")
        .attr("x", width - margin.right - 240)
        .attr("y", yScale(51) - 6)
        .attr("fill", "#dc2626")
        .attr("font-size", "9px")
        .attr("font-family", "monospace")
        .attr("font-weight", "bold")
        .text("SHARED BANDWIDTH TARGET CAP (50 Mbps LIMIT)");

      // Interactive tooltip tracker circles
      svg.selectAll(".marker")
        .data(bandwidthData)
        .join("circle")
        .attr("cx", (d: any) => xScale(d.time))
        .attr("cy", (d: any) => yScale(d.usage))
        .attr("r", (d: any, i) => i === bandwidthData.length - 1 ? 5 : 3)
        .attr("fill", (d: any, i) => i === bandwidthData.length - 1 ? "#ef4444" : "#2563eb")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1.5);

    } catch (chartErr) {
      console.error("D3 compiler error:", chartErr);
    }
  }, [bandwidthData]);

  // --- 3. Map Searches & Hotspot lookups ---
  const handleMapSearchQuery = (query: string) => {
    const term = query.trim().toLowerCase();
    if (!term) return;

    setMapSearch(query);

    // Search inside database matching district names or spot titles
    const candidates = MAP_HOTSPOTS_DB.filter(
      h => h.district.toLowerCase().includes(term) || h.name.toLowerCase().includes(term) 
    );

    if (candidates.length > 0) {
      setMapHotspots(candidates);
      setSelectedMapNode(candidates[0]);
      setCurrentMapCenter({ lat: candidates[0].lat, lng: candidates[0].lng });
      setMapZoom(14);
    } else {
      // Dynamic random plot generator centered for "ANY PLACE IN THE WORLD!"
      let checksum = 0;
      for (let i = 0; i < term.length; i++) {
        checksum += term.charCodeAt(i);
      }
      const latHash = (checksum % 80) * (checksum % 2 === 0 ? 1 : -1) * 0.9 + 4.0;
      const lngHash = (checksum % 170) * (checksum % 3 === 0 ? 1 : -1) * 0.9 - 12.0;

      const generatedHotspots: MapHotspot[] = [
        {
          id: `dyn-node-${checksum}-1`,
          name: `Zion Node Main - ${query}`,
          lat: latHash,
          lng: lngHash,
          strength: "Excellent",
          clients: Math.floor(Math.random() * 25) + 3,
          ssid: `ZionMesh_${query.toUpperCase().replace(/[^A-Z0-9]/g, "")}_HighSpeed`,
          district: query
        },
        {
          id: `dyn-node-${checksum}-2`,
          name: `${query} Community Relay`,
          lat: latHash + 0.004,
          lng: lngHash - 0.005,
          strength: "Good",
          clients: Math.floor(Math.random() * 12) + 1,
          ssid: `ZionMesh_${query.toUpperCase().replace(/[^A-Z0-9]/g, "")}_Relay`,
          district: query
        },
        {
          id: `dyn-node-${checksum}-3`,
          name: `${query} Gateway AirTunnel`,
          lat: latHash - 0.003,
          lng: lngHash + 0.004,
          strength: "Fair",
          clients: Math.floor(Math.random() * 7),
          ssid: `ZionMesh_${query.toUpperCase().replace(/[^A-Z0-9]/g, "")}_AirTunnel`,
          district: query
        }
      ];

      setMapHotspots(generatedHotspots);
      setSelectedMapNode(generatedHotspots[0]);
      setCurrentMapCenter({ lat: latHash, lng: lngHash });
      setMapZoom(13);
    }
  };

  // --- 4. QR Code visual trigger ---
  const handleOpenQrConnection = (ssid: string, code: string) => {
    setQrSsid(ssid);
    setQrSecurityToken(code);
    setShowQrCode(true);
  };

  // Hotspot sharing toggle
  const handleToggleBroadcast = () => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    setIsBroadcasting(!isBroadcasting);
  };

  // Connect to a peer broadcaster node
  const handleConnectTunnel = (node: WifiNode) => {
    if (!currentUser) {
      onLogIn();
      return;
    }

    // DRM Gate Check: User must have an approved WiFi plan to establish connection!
    if (!activeApprovedPurchase && currentUser.role !== "admin") {
      // Prompt user to purchase WiFi pack
      setCheckoutError("");
      setSelectedPack({
        id: "1h",
        name: "1 Hour Zion Fast",
        durationText: "1 Hour",
        price: 4,
        desc: "Bypass gateway access needed to join this hotspot."
      });
      setShowPayModal(true);
      return;
    }

    setIsConnectingNode(node.id);
    setTimeout(() => {
      setIsConnectingNode(null);
      setIsTunnelConnected(node.id);
      setActiveTunnelHost(node.hostName);
    }, 1500);
  };

  const handleDisconnectTunnel = () => {
    setIsTunnelConnected(null);
    setActiveTunnelHost(null);
  };

  // Initiate STK Push checkout payment flow
  const handleStartPayment = (packName: string, KESamount: number) => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    setCheckoutError("");
    setPinSent(false);
    setStkStatus("idle");
    setCheckoutPhone("");
    setShowPayModal(true);
  };

  const handleTriggerSTKPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPhone.trim()) {
      setCheckoutError("Valid M-Pesa contact number is requested.");
      return;
    }

    setStkStatus("sending");
    setCheckoutError("");

    // Step 1: Push network simulation
    setTimeout(() => {
      setStkStatus("pending");
      setPinSent(true);
    }, 1500);
  };

  // Simulate prompt acceptance code
  const handleAcceptPaymentSimulate = async () => {
    setStkStatus("success");
    
    // Save record to firestore so both admin and node instantly register it!
    const expiration = new Date();
    if (selectedPack.id === "1h") expiration.setHours(expiration.getHours() + 1);
    else if (selectedPack.id === "2h") expiration.setHours(expiration.getHours() + 2);
    else if (selectedPack.id === "24h") expiration.setDate(expiration.getDate() + 1);
    else if (selectedPack.id === "7d") expiration.setDate(expiration.getDate() + 7);
    else if (selectedPack.id === "30d") expiration.setDate(expiration.getDate() + 30);
    else expiration.setFullYear(expiration.getFullYear() + 1);

    const newPurchase: WifiPurchase = {
      id: "WFI-" + Math.floor(Math.random() * 89999 + 10000),
      userId: currentUser?.email || "anonymous",
      userName: currentUser?.name || "WiFi Guest",
      planName: selectedPack.name,
      price: selectedPack.price,
      phoneNumber: checkoutPhone,
      status: "approved", // auto approved in demo mode for flawless flow, but saved securely
      expiresAt: expiration.toISOString(),
      date: new Date().toISOString()
    };

    try {
      await saveWifiPurchaseToFirestore(newPurchase);
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => {
      setShowPayModal(false);
      setStkStatus("idle");
      setPinSent(false);
    }, 2000);
  };

  const handleRejectPaymentSimulate = () => {
    setStkStatus("failed");
    setCheckoutError("User cancelled PIN verification.");
    setTimeout(() => {
      setStkStatus("idle");
      setPinSent(false);
    }, 2000);
  };

  // Custom Hour Calculation Pay trigger
  const handlePayCustomHours = () => {
    const calculatedPrice = calculateZionRate(customHours);
    setSelectedPack({
      id: `custom-${customHours}h`,
      name: `Custom ${customHours} Hours Plan`,
      durationText: `${customHours} Hours`,
      price: calculatedPrice,
      desc: `Dynamic customized bandwidth allocation for ${customHours} full hours of data.`
    });
    setCheckoutError("");
    setPinSent(false);
    setStkStatus("idle");
    setCheckoutPhone("");
    setShowPayModal(true);
  };

  return (
    <div className="space-y-8" id="zion_wifi_feature">
      {/* 5-Minute Warning Countdown Banner */}
      {showCountdownWarning && timeLeftSecs !== null && (
        <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse shadow-md" id="wifi-expiry-warning-banner">
          <div className="flex items-center space-x-3 text-red-105">
            <div className="p-2.5 bg-red-600 text-white rounded-xl">
              <Hourglass className="h-5 w-5 animate-spin" />
            </div>
            <div className="text-left">
              <h4 className="font-display font-black text-sm uppercase tracking-tight text-red-950">CRITICAL ALERT: WiFi Plan is Expiring Soon!</h4>
              <p className="text-[11px] font-sans font-semibold text-red-700 leading-normal">
                Your purchased Wi-Fi session <span className="font-bold underline">({activeApprovedPurchase?.planName})</span> has less than 5 minutes remaining. Access will be disconnected shortly!
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-red-950 font-mono text-white text-xs font-black px-4 py-2 rounded-xl shrink-0 uppercase tracking-widest border border-red-500 flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
              <span>{Math.floor(timeLeftSecs / 60)}m : {timeLeftSecs % 60}s left</span>
            </div>
            <button
              onClick={() => handleStartPayment(presets[0].name, presets[0].price)}
              className="bg-red-650 hover:bg-red-700 text-white font-sans font-bold text-xs uppercase px-4 py-2.5 rounded-xl transition cursor-pointer shrink-0 shadow-sm"
            >
              Extend Pass (+KES {presets[0].price})
            </button>
          </div>
        </div>
      )}

      {/* 1. Header Hero section */}
      <div className="rounded-3xl border border-blue-105 bg-gradient-to-br from-slate-900 to-indigo-950 p-8 text-white relative overflow-hidden shadow-xl" id="wifi-hero">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Wifi className="h-64 w-64 animate-ping" />
        </div>
        
        <div className="max-w-2xl space-y-4 relative z-10 text-left">
          <span className="bg-blue-500/10 border border-blue-400/20 text-blue-400 text-xs font-mono font-black uppercase tracking-widest px-3 py-1 rounded-full inline-flex items-center space-x-1">
            <Zap className="h-3 w-3 text-cyan-405 fill-cyan-405" />
            <span>Zion Wi-Fi Mesh Network Core</span>
          </span>
          <h2 className="font-display text-3xl font-black tracking-tight leading-none sm:text-4xl">
            Smarter Hotspots. Lower Pricing.
          </h2>
          <p className="text-stone-300 text-sm leading-relaxed font-sans">
            Zion Wi-Fi bridges bandwidth gaps across Kenya. Hotspot your mobile data slightly cheaper than Safaricom rates and gain profits, or tap into existing local Zion proxy tunnels starting as cheap as <strong className="text-white">KES 4 per hour</strong>.
          </p>
          
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={handleToggleBroadcast}
              className={`font-sans font-bold text-xs uppercase px-5 py-3 rounded-xl transition duration-200 flex items-center space-x-2 shadow cursor-pointer ${
                isBroadcasting 
                  ? "bg-red-600 hover:bg-red-700 text-white" 
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              <Wifi className={`h-4 w-4 ${isBroadcasting ? "animate-pulse" : ""}`} />
              <span>{isBroadcasting ? "Stop Spot Broadcast" : "Share My Hotspot (Earn KES)"}</span>
            </button>

            {activeApprovedPurchase ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="bg-emerald-950/70 border border-emerald-500 text-emerald-400 text-xs font-mono font-bold uppercase rounded-xl px-4 py-3 flex items-center space-x-1.5 shadow-md">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>
                    Plan Active
                    {timeLeftSecs !== null && ` (${Math.floor(timeLeftSecs / 60)}m ${timeLeftSecs % 60}s left)`}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleTriggerDemoCountdown}
                  className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-sans font-extrabold text-xs uppercase px-4 py-3 rounded-xl transition duration-150 cursor-pointer shadow flex items-center space-x-1"
                >
                  <Hourglass className="h-3.5 w-3.5 animate-pulse" />
                  <span>Extend (+5m Test)</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => handleStartPayment(presets[0].name, presets[0].price)}
                  className="font-sans font-bold text-xs bg-white/10 hover:bg-white/15 border border-white/20 text-white px-5 py-3 rounded-xl transition duration-200 cursor-pointer"
                >
                  Buy Active Zion Wi-Fi Pass
                </button>
                <button
                  type="button"
                  onClick={handleTriggerDemoCountdown}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-sans font-extrabold text-xs uppercase px-5 py-3 rounded-xl transition duration-200 cursor-pointer shadow flex items-center space-x-1.5"
                >
                  <Hourglass className="h-3.5 w-3.5 animate-bounce" />
                  <span>⚡ Demo 5-Min Countdown</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Interactive Hotspots Global Tracker Map & D3 Bandwidth Monitor Grid (Bento style) */}
      <div className="grid gap-6 lg:grid-cols-12" id="zion-map-monitoring-bento">
        {/* INTERACTIVE GEOGRAPHIC RADAR SEARCH MAP CONTAINER */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-3xl p-6 shadow-sm flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 text-left">
            <div>
              <h3 className="font-display text-lg font-black text-stone-900 flex items-center space-x-2">
                <Map className="h-5 w-5 text-blue-600" />
                <span>Zion Global Hotspots GIS Tracker Map</span>
              </h3>
              <p className="text-stone-500 text-xs mt-0.5">Explore active community broadband wave relays on our vector grid.</p>
            </div>
            
            <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-mono font-black py-1 px-3 rounded-lg shrink-0">
              {mapHotspots.length} ACTIVE TRANSMITTERS Plotted
            </span>
          </div>

          {/* Search bar helper */}
          <div className="flex items-center space-x-2 font-sans">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input 
                type="text"
                placeholder="Type any area name on earth... (e.g. Bungoma, Nairobi, London, Paris)"
                defaultValue={mapSearch}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleMapSearchQuery(e.currentTarget.value);
                  }
                }}
                className="w-full bg-stone-50 border border-stone-200 hover:border-stone-300 focus:border-blue-500 outline-none rounded-xl py-2.5 pl-11 pr-4 text-xs text-slate-950 transition-all font-bold"
              />
            </div>
            <button
              type="button"
              onClick={(e) => {
                const parent = e.currentTarget.parentElement;
                const input = parent?.querySelector("input") as HTMLInputElement;
                if (input) handleMapSearchQuery(input.value);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-sans font-bold text-xs uppercase px-4 py-2.5 rounded-xl transition duration-150 cursor-pointer"
            >
              Scan Area
            </button>
          </div>

          {/* Micro presets row */}
          <div className="flex flex-wrap gap-1.5 pt-1 text-left">
            <span className="text-[10px] text-stone-500 uppercase font-mono font-bold pt-1.5 mr-1">Presets:</span>
            {["Bungoma, Kenya", "Nairobi, Kenya", "New York, USA", "London, UK", "Tokyo, Japan"].map((presetLoc) => (
              <button
                key={presetLoc}
                type="button"
                onClick={() => handleMapSearchQuery(presetLoc)}
                className={`text-[10px] font-sans font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                  mapSearch === presetLoc 
                    ? "bg-slate-900 text-white border-slate-900" 
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100 border-stone-200"
                }`}
              >
                {presetLoc.split(",")[0]}
              </button>
            ))}
          </div>

          {/* Interactive Vector GIS Radar Map Canvas Grid container */}
          <div className="h-68 w-full bg-slate-950 rounded-2xl border-2 border-stone-850 relative overflow-hidden flex flex-col justify-end select-none">
            {/* Holographic scanning grids */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
            
            {/* Visual satellite panning coordinates frame */}
            <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-800 text-[10px] font-mono font-bold text-slate-400 p-2.5 rounded-xl shadow space-y-1 z-20 text-left">
              <div className="flex items-center space-x-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>PANNING STABLE: {mapSearch}</span>
              </div>
              <p className="text-stone-500 font-medium">Center: LAT {currentMapCenter.lat.toFixed(4)}° / LNG {currentMapCenter.lng.toFixed(4)}°</p>
            </div>

            {/* Radar Circular overlay representing scanning sweep */}
            <div className="absolute inset-0 border border-indigo-500/10 rounded-full scale-75 animate-pulse flex items-center justify-center pointer-events-none">
              <div className="border border-indigo-400/5 rounded-full w-48 h-48"></div>
            </div>

            {/* Render Map node pins */}
            {mapHotspots.map((hotspot) => {
              // Map simulated latitude into relative SVG coordinates
              const latDiff = hotspot.lat - currentMapCenter.lat;
              const lngDiff = hotspot.lng - currentMapCenter.lng;
              
              const leftPercent = 50 + lngDiff * 4000;
              const topPercent = 52 - latDiff * 4000;

              // Constrain percentage coordinates to screen boundaries
              const boundX = Math.max(12, Math.min(88, leftPercent));
              const boundY = Math.max(12, Math.min(80, topPercent));

              const isSelected = selectedMapNode?.id === hotspot.id;

              return (
                <button
                  key={hotspot.id}
                  type="button"
                  onClick={() => setSelectedMapNode(hotspot)}
                  style={{ left: `${boundX}%`, top: `${boundY}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 p-2 transition duration-200 hover:scale-125 focus:outline-none cursor-pointer z-10 group"
                >
                  <div className="relative flex flex-col items-center">
                    {/* Ring glow */}
                    <span className={`absolute inline-flex h-6 w-6 rounded-full opacity-60 animate-ping ${
                      hotspot.strength === "Excellent" ? "bg-emerald-400" : "bg-blue-400"
                    }`}></span>

                    <MapPin className={`h-6 w-6 relative filter drop-shadow ${
                      isSelected ? "text-red-505 scale-125" : hotspot.strength === "Excellent" ? "text-emerald-500 hover:text-emerald-400" : "text-blue-500 hover:text-blue-400"
                    }`} />

                    {/* Micro tooltip label overlay */}
                    <span className="absolute top-7 bg-slate-900 border border-slate-800 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap opacity-95 scale-90 group-hover:scale-100 uppercase transition">
                      {hotspot.name.split(" ")[0]} ({hotspot.strength})
                    </span>
                  </div>
                </button>
              );
            })}

            {/* Map scale gauge */}
            <div className="absolute bottom-3 left-3 bg-slate-900/80 border border-slate-800 text-[9px] font-mono text-stone-400 px-2 py-1 rounded-lg flex items-center space-x-2 shadow z-20">
              <span>Grid Scale: Level {mapZoom}</span>
              <div className="w-10 h-1.5 bg-slate-800 rounded border border-stone-700 flex items-center">
                <div className="w-6 h-full bg-slate-500 rounded"></div>
              </div>
              <span>400m / Div</span>
            </div>

            {/* Interactive World Map backdrop vector layout */}
            <div className="w-full h-full absolute inset-0 text-stone-600/15 pointer-events-none flex items-center justify-center font-mono text-[140px] tracking-widest font-black uppercase overflow-hidden opacity-10 select-none">
              ZION GPS
            </div>
          </div>

          {/* Selected map hotspot details panels */}
          {selectedMapNode && (
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left font-sans">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="inline-block p-1 bg-blue-105 text-blue-700 rounded-lg">
                    <Navigation className="h-4 w-4 transform rotate-45" />
                  </span>
                  <strong className="text-stone-900 text-xs sm:text-sm font-black text-left">{selectedMapNode.name}</strong>
                </div>
                <p className="text-[11px] text-stone-500 text-left pl-7 font-semibold">
                  SSID: <span className="font-mono font-bold text-slate-800 pl-0.5">{selectedMapNode.ssid}</span> • Status: <span className="text-emerald-700 font-bold">Active ({selectedMapNode.strength} Link)</span> • Users: <span className="font-bold text-slate-850">{selectedMapNode.clients} tied telemetry</span>
                </p>
              </div>

              <div className="flex gap-2 w-full sm:w-auto shrink-0 pl-7 sm:pl-0">
                <button
                  type="button"
                  onClick={() => handleOpenQrConnection(selectedMapNode.ssid, `WPA_ZION_SECURE_${selectedMapNode.id}`)}
                  className="bg-slate-900 hover:bg-slate-950 font-sans font-bold text-[10px] uppercase text-white px-3.5 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow w-full sm:w-auto justify-center cursor-pointer"
                >
                  <QrCode className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
                  <span>View Connection QR</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* D3 NETWORK TRAFFIC AND BANDWIDTH MONITORING TERMINAL */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="border-b pb-4 text-left">
            <h3 className="font-display text-lg font-black text-stone-900 flex items-center space-x-2">
              <Activity className="h-5 w-5 text-indigo-600 animate-pulse" />
              <span>D3 Shared Bandwidth Analytics</span>
            </h3>
            <p className="text-stone-505 text-xs mt-0.5">Real-time telemetry measuring active client bypass streams against limits over time.</p>
          </div>

          {/* Real-time statistics widgets */}
          <div className="grid grid-cols-2 gap-3 pb-2 font-mono">
            <div className="bg-blue-50/45 border border-blue-100 rounded-2xl p-3 text-left">
              <span className="text-[9px] uppercase font-bold text-slate-500">Peak Bandwidth</span>
              <strong className="text-blue-700 block text-base font-black mt-0.5 leading-none">
                {bandwidthData.length > 0 ? `${Math.max(...bandwidthData.map(d => d.usage)).toFixed(1)} Mbps` : "0.0 Mbps"}
              </strong>
            </div>
            <div className="bg-red-50/45 border border-red-100 rounded-2xl p-3 text-left">
              <span className="text-[9px] uppercase font-bold text-red-500">Shared limit cap</span>
              <strong className="text-red-700 block text-base font-black mt-0.5 leading-none">50.0 Mbps</strong>
            </div>
          </div>

          {/* D3 Vector Canvas Container */}
          <div className="flex-1 w-full bg-stone-50 rounded-2xl p-2.5 border border-stone-200 flex items-center justify-center relative min-h-[170px]">
            <svg 
              ref={svgRef} 
              viewBox="0 0 600 240" 
              className="w-full h-auto text-slate-800"
              style={{ maxHeight: "200px" }}
            />
          </div>

          <div className="text-[10px] font-mono leading-relaxed text-stone-500 bg-stone-50 p-3 rounded-xl border border-stone-150 text-left">
            📊 The red dashed line denotes our <strong className="text-slate-800">50 Mbps shared target ceiling</strong>. In Zion Wi-Fi mesh protocols, individual clients are dynamic throttled safely during high density usage spikes.
          </div>
        </div>
      </div>

      {/* 2. Hotspots Nearby Grid Section */}
      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-8 space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div>
                <h3 className="font-display text-lg font-extrabold text-slate-900 flex items-center space-x-1.5">
                  <Wifi className="h-5 w-5 text-blue-600 animate-pulse" />
                  <span>Available Local Hotspot Tunnels</span>
                </h3>
                <p className="text-stone-500 text-xs mt-0.5">Connect to nearby broadcasters using their Safaricom/Zion proxy tunnels.</p>
              </div>
              <span className="bg-slate-105 text-slate-800 text-[10px] font-mono font-bold uppercase py-1 px-3.5 rounded border">
                {activeNodes.length} NODES NEARBY
              </span>
            </div>

            {isTunnelConnected ? (
              <div className="rounded-xl border border-emerald-500 bg-emerald-50 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-emerald-600 rounded-2xl text-white">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-sans font-black text-slate-900 text-sm">Protected Tunnel Established Successfully</h4>
                    <p className="text-stone-600 text-xs mt-0.5 leading-snug">Connected client node safely routed over <strong>{activeTunnelHost}</strong> broad wave protocols.</p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnectTunnel}
                  className="bg-red-600 hover:bg-red-700 text-white font-sans font-bold text-xs uppercase px-4 py-2 rounded-xl transition cursor-pointer shrink-0"
                >
                  Disconnect Tunnel
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeNodes.map((node) => (
                  <div 
                    key={node.id} 
                    className="p-4 rounded-xl border border-stone-150 bg-stone-50 hover:bg-stone-100 transition duration-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <strong className="text-slate-900 font-sans font-bold text-sm">📡 {node.hostName}</strong>
                        <span className="bg-blue-55 text-blue-805 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded">
                          {node.signalStrength} Link
                        </span>
                      </div>
                      <p className="text-stone-500 text-xs">Host: <span className="text-stone-700 font-semibold">{node.hostEmail}</span> • Connected clients: <span className="text-slate-900 font-black">{node.clientsCount} users</span></p>
                    </div>

                    <button
                      disabled={isConnectingNode !== null}
                      onClick={() => handleConnectTunnel(node)}
                      className="w-full sm:w-auto font-sans font-bold text-xs uppercase bg-white hover:bg-slate-55 border border-stone-250 text-slate-800 px-4 py-2.5 rounded-xl transition cursor-pointer inline-flex items-center justify-center space-x-1"
                    >
                      {isConnectingNode === node.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-slate-700" />
                          <span>Tunneling...</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="h-3.5 w-3.5 text-blue-600" />
                          <span>Secure Node Bypass</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preset Packages Grid */}
          <div className="space-y-4">
            <h3 className="font-display font-black text-slate-900 text-base uppercase tracking-wider pl-1">Buy Packages (M-Pesa / eCitizen Gateway)</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {presets.map((pack) => {
                const isSelected = selectedPack.id === pack.id;
                return (
                  <div 
                    key={pack.id}
                    onClick={() => setSelectedPack(pack)}
                    className={`p-5 rounded-2xl border transition duration-200 cursor-pointer flex flex-col justify-between space-y-4 relative ${
                      isSelected 
                        ? "border-blue-605 bg-blue-50/20 shadow-md" 
                        : "border-stone-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded uppercase">
                          {pack.durationText}
                        </span>
                        {isSelected && <span className="text-lg">✅</span>}
                      </div>
                      <h4 className="font-display text-sm font-black text-slate-950 mt-1">{pack.name}</h4>
                      <p className="text-stone-505 text-[11px] leading-tight">{pack.desc}</p>
                    </div>

                    <div className="border-t pt-3 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-semibold uppercase">Gateway Cost</span>
                        <strong className="text-slate-950 font-black text-base">KES {pack.price}</strong>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPack(pack);
                          handleStartPayment(pack.name, pack.price);
                        }}
                        className="bg-blue-650 hover:bg-blue-700 text-white font-sans font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-lg transition-all"
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Slider Costs calculator & Safaricom Comparative Stats */}
        <div className="md:col-span-4 space-y-6">
          {/* Custom Calculation Slider */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
            <div>
              <h3 className="font-display text-base font-extrabold text-slate-900 flex items-center space-x-1.5">
                <Sliders className="h-5 w-5 text-indigo-600" />
                <span>Calculate As-You-Go</span>
              </h3>
              <p className="text-stone-500 text-xs mt-0.5">Drag to customize target hours & immediately view savings metrics.</p>
            </div>

            <div className="space-y-4 font-sans bg-stone-50 p-4.5 rounded-xl border border-stone-150">
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase font-extrabold text-stone-605">Target Duration</span>
                <strong className="text-slate-900 text-sm font-black">{customHours} Hours</strong>
              </div>

              <input 
                type="range"
                min="1"
                max="1000"
                value={customHours}
                onChange={(e) => setCustomHours(parseInt(e.target.value) || 1)}
                className="w-full h-2 bg-stone-200 rounded-lg cursor-pointer accent-blue-600 focus:outline"
              />

              <div className="space-y-2 border-t pt-3 border-stone-200">
                <div className="flex justify-between text-xs text-stone-600 leading-none">
                  <span>Safaricom Directly</span>
                  <span className="line-through text-red-600">KES {calculateSafaricomRate(customHours)}</span>
                </div>
                <div className="flex justify-between items-center text-xs leading-none">
                  <span className="text-emerald-700 font-extrabold uppercase text-[10px]">Wafula Zion WiFi Rate</span>
                  <strong className="text-slate-905 font-black text-sm text-emerald-700">KES {calculateZionRate(customHours)}</strong>
                </div>
                <div className="flex justify-between text-[11px] font-mono select-none px-2 py-1.5 bg-emerald-150/50 rounded-lg text-emerald-850 mt-2">
                  <span>Total Saved Budget:</span>
                  <strong>{Math.round(((calculateSafaricomRate(customHours) - calculateZionRate(customHours)) / calculateSafaricomRate(customHours)) * 100)}% Savings</strong>
                </div>
              </div>
            </div>

            <button
              onClick={handlePayCustomHours}
              className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-950 font-sans font-bold text-xs uppercase text-white py-3.5 rounded-xl transition shadow cursor-pointer mt-1"
            >
              <Coins className="h-4 w-4 text-yellow-450" />
              <span>Purchase Dynamic Pass</span>
            </button>
          </div>

          {/* Active Broadcast Clients Console for share-node */}
          {isBroadcasting && (
            <div className="rounded-2xl border border-red-200 bg-red-50/40 p-6 shadow-sm space-y-4">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-605"></span>
                </span>
                <h3 className="font-display text-xs font-black uppercase text-red-900 tracking-wider">Broadcaster Node Panel Operations</h3>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-red-150 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Transferred Bytes:</span>
                  <strong className="text-stone-850">4.12 GB (Mesh Peak)</strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Earned Profit:</span>
                  <strong className="text-green-700 font-bold">KES 32.50 Accumulated</strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Active Clients Tied:</span>
                  <strong className="text-slate-900 font-black flex items-center space-x-1.5 bg-slate-100 px-2 py-0.5 rounded">
                    <Users className="h-3 w-3 text-slate-600" />
                    <span>3 connected</span>
                  </strong>
                </div>
              </div>

              <div className="text-[10px] text-red-800 leading-snug bg-white p-3 border rounded-xl font-mono">
                💡 Other users logged-in nearby can dynamically tether to your Safaricom hotspot wave safely. Payment allocations auto-deposit KES tokens directly to your registered checkout wallet.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. PAYMENT STK PUSH MODAL SIMULATION */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs font-sans">
          <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-mono font-bold uppercase text-slate-500 tracking-widest block">Lipa na Zion Gateway</span>
                <h3 className="font-display text-base font-black text-slate-900 mt-0.5">Complete Package Checkout</h3>
              </div>
              <button 
                onClick={() => {
                  setShowPayModal(false);
                  setStkStatus("idle");
                  setPinSent(false);
                }}
                className="p-1.5 rounded-lg border border-stone-105 bg-stone-50 hover:bg-stone-100 text-stone-500 transition cursor-pointer"
              >
                <Check className="h-4 w-4 rotate-45" />
              </button>
            </div>

            {/* Selected package specifications detail */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-150 space-y-2.5">
              <div className="flex justify-between">
                <div>
                  <strong className="text-slate-905 block text-sm">{selectedPack.name}</strong>
                  <span className="text-[11px] text-stone-500 block leading-tight mt-0.5">{selectedPack.desc}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase font-mono">Checkout Target</span>
                  <strong className="text-slate-950 text-base font-black">KES {selectedPack.price}</strong>
                </div>
              </div>
            </div>

            {/* Gateway choices tabs */}
            <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPaymentGateway('mpesa')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  paymentGateway === 'mpesa' 
                    ? "bg-white text-emerald-800 shadow" 
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Lipa Na M-Pesa</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentGateway('ecitizen')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  paymentGateway === 'ecitizen' 
                    ? "bg-white text-indigo-800 shadow" 
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span>eCitizen Bypass</span>
              </button>
            </div>

            {/* Dynamic content */}
            {stkStatus === "idle" && (
              <form onSubmit={handleTriggerSTKPush} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-600">Enter Payment Mobile Number (Safaricom M-Pesa)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs font-semibold text-stone-500 font-mono">+254</span>
                    <input 
                      type="tel"
                      required
                      placeholder="712345678"
                      value={checkoutPhone}
                      onChange={(e) => setCheckoutPhone(e.target.value.replace(/[^0-9]/g, ""))}
                      className="w-full rounded-xl border border-stone-250 bg-white py-3 pl-14 pr-4 font-mono font-bold text-slate-950 outline-none text-xs focus:border-blue-600"
                    />
                  </div>
                  <p className="text-[10px] text-slate-505 font-mono leading-tight">
                    {paymentGateway === 'mpesa' 
                      ? "A secure real-time STK PIN checkup prompt trigger will launch instantly on your hand device."
                      : "Direct eCitizen Treasury account secure routing integration to clear local or foreign accounts."
                    }
                  </p>
                </div>

                {checkoutError && (
                  <p className="p-2.5 rounded-lg bg-red-50 text-red-700 text-[11px] font-mono leading-tight">{checkoutError}</p>
                )}

                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-sans font-extrabold py-3 text-xs uppercase rounded-xl transition cursor-pointer"
                >
                  <Smartphone className="h-4 w-4 shrink-0" />
                  <span>Send Push Verification Pop-up</span>
                </button>
              </form>
            )}

            {stkStatus === "sending" && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <div>
                  <h4 className="font-sans font-black text-slate-900 text-sm">Initiating Cryptographic Bypass Tunnel...</h4>
                  <p className="text-stone-500 text-xs mt-1">Acquiring Safaricom STK route logs securely.</p>
                </div>
              </div>
            )}

            {pinSent && stkStatus === "pending" && (
              <div className="space-y-5 py-3">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3">
                  <div className="p-1 px-2.5 bg-amber-500 text-white font-mono rounded-lg font-black shrink-0 text-sm animate-bounce">📱</div>
                  <div>
                    <h5 className="font-sans font-bold text-xs text-amber-800 uppercase tracking-tight">STK Verification Sent (Interactive Sim)</h5>
                    <p className="text-stone-650 text-[11px] leading-tight mt-1">
                      Check your mobile screen now! A simulated payment overlay has appeared request KES <strong>{selectedPack.price}</strong>.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleAcceptPaymentSimulate}
                    className="flex items-center justify-center space-x-1.5 py-3.5 bg-green-700 hover:bg-green-800 text-white font-sans font-bold text-xs uppercase rounded-xl transition cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>Confirm PIN Done</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectPaymentSimulate}
                    className="flex items-center justify-center space-x-1.5 py-3.5 bg-red-100 hover:bg-red-200 text-red-700 font-sans font-bold text-xs uppercase rounded-xl transition cursor-pointer"
                  >
                    <Check className="h-4 w-4 rotate-45" />
                    <span>Reject / Cancel</span>
                  </button>
                </div>
              </div>
            )}

            {stkStatus === "success" && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-3 bg-emerald-100/75 text-emerald-700 rounded-full text-2xl animate-bounce">✓</div>
                <div>
                  <h4 className="font-sans font-black text-slate-950 text-sm uppercase text-emerald-800">Payment Confirmed Wave Opened</h4>
                  <p className="text-stone-500 text-xs mt-0.5">Your Zion Bypass is successfully configured. Access granted instantly.</p>
                </div>
              </div>
            )}

            {stkStatus === "failed" && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-3 bg-rose-100 text-rose-700 rounded-full text-2xl font-black">✗</div>
                <div>
                  <h4 className="font-sans font-black text-slate-905 text-sm uppercase text-rose-800">Clearance Declined</h4>
                  <p className="text-stone-550 text-xs mt-1">The STK push token verification was declined. Please try again.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Connection QR Code Scanning Overlay Modal */}
      {showQrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in" id="qr-scanners-overlay">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative space-y-5">
            {/* Modal Heading */}
            <div className="flex items-center justify-between border-b pb-3 text-left">
              <div className="flex items-center space-x-2 text-slate-900">
                <QrCode className="h-5 w-5 text-indigo-600 animate-pulse" />
                <h3 className="font-display font-black text-sm uppercase tracking-tight">Access Node Scan Code</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowQrCode(false)}
                className="p-1 px-2.5 rounded-lg hover:bg-stone-100 text-stone-550 cursor-pointer transition font-sans font-bold text-xs"
              >
                ✕ Close
              </button>
            </div>

            {/* QR Matrix Graphics Wrapper */}
            <div className="flex flex-col items-center justify-center space-y-4 py-2">
              <div className="p-4 bg-stone-50 border-2 border-stone-200 rounded-2xl relative shadow-inner">
                {/* SVG vector representing highly intricate secure hotspot network QR pattern */}
                <svg width="180" height="180" viewBox="0 0 100 100" className="text-slate-900 drop-shadow-sm select-none">
                  {/* Outer corner find squares */}
                  <rect x="0" y="0" width="24" height="24" fill="currentColor" rx="2" />
                  <rect x="3" y="3" width="18" height="18" fill="white" rx="1" />
                  <rect x="6" y="6" width="12" height="12" fill="currentColor" rx="1" />

                  <rect x="76" y="0" width="24" height="24" fill="currentColor" rx="2" />
                  <rect x="79" y="3" width="18" height="18" fill="white" rx="1" />
                  <rect x="82" y="6" width="12" height="12" fill="currentColor" rx="1" />

                  <rect x="0" y="76" width="24" height="24" fill="currentColor" rx="2" />
                  <rect x="3" y="79" width="18" height="18" fill="white" rx="1" />
                  <rect x="6" y="82" width="12" height="12" fill="currentColor" rx="1" />

                  {/* Alignment sub-finder square */}
                  <rect x="70" y="70" width="10" height="10" fill="currentColor" />
                  <rect x="72" y="72" width="6" height="6" fill="white" />
                  <rect x="74" y="74" width="2" height="2" fill="currentColor" />

                  {/* Matrix codes representing SSID: WPA_ZION_SECURE_... */}
                  <path d="M 30,0 H 40 V 10 H 30 Z M 45,0 H 50 V 5 H 45 Z M 55,0 H 70 V 10 H 55 Z" fill="currentColor" />
                  <path d="M 30,15 H 35 V 25 H 30 Z M 40,30 H 60 V 35 H 40 Z M 65,15 H 70 V 30 H 65 Z" fill="currentColor" />
                  <path d="M 0,30 H 10 V 45 H 0 Z M 15,35 H 25 V 50 H 15 Z M 45,45 H 55 V 60 H 45 Z" fill="currentColor" />
                  <path d="M 76,30 H 85 V 40 H 76 Z M 90,35 H 100 V 55 H 90 Z M 80,45 H 85 V 55 H 80 Z" fill="currentColor" />
                  <path d="M 30,55 H 40 V 70 H 30 Z M 0,55 H 10 V 65 H 0 Z M 15,60 H 25 V 70 H 15 Z" fill="currentColor" />
                  <path d="M 55,65 H 65 V 75 H 55 Z M 45,75 H 50 V 90 H 45 Z M 55,85 H 65 V 100 H 55 Z" fill="currentColor" />
                  <path d="M 30,80 H 40 V 100 H 30 Z M 15,85 H 25 V 100 H 15 Z M 65,85 H 70 V 95 H 65 Z" fill="currentColor" />

                  {/* Intricate binary background mock logic */}
                  <circle cx="50" cy="50" r="14" fill="white" />
                  <circle cx="50" cy="50" r="10" fill="#2563eb" />
                  {/* Small padlock icon path inside */}
                  <path d="M 47,48 H 53 V 54 H 47 Z M 48,48 V 45 A 2,2 0 0,1 52,45 V 48" stroke="white" strokeWidth="1.2" fill="none" />
                </svg>
              </div>

              {/* SSID and key detail logs */}
              <div className="w-full text-center space-y-1 font-sans">
                <span className="text-[10px] text-stone-500 uppercase font-mono font-bold tracking-tight">Mesh HotSpot SSID</span>
                <br />
                <h4 className="font-mono text-xs font-black text-slate-900 border border-dashed border-stone-250 bg-stone-50 px-2.5 py-1.5 rounded-lg inline-block select-all">{qrSsid}</h4>
                <p className="text-[10px] text-stone-500 font-mono mt-0.5">Security Token: <span className="font-bold underline text-stone-700">{qrSecurityToken}</span></p>
              </div>
            </div>

            {/* Steps text instructions */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-left font-sans text-[11px] leading-relaxed text-stone-605">
              <span className="font-black text-blue-700 uppercase tracking-tight block mb-1">⚡ SCAN & CONNECT INSTANTLY</span>
              Open your smartphone camera or QR Scanner, and aim directly at the vector code above. Your device will automatically latch into the private decentralized proxy tunnel with no extra configuration needed.
            </div>

            {/* Reset toggle */}
            <button
              onClick={() => setShowQrCode(false)}
              className="w-full bg-slate-900 hover:bg-slate-950 text-white font-sans font-extrabold py-3 text-xs uppercase rounded-xl transition cursor-pointer shadow-md"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
