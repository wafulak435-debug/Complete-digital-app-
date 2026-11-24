import React, { useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import {
  MapPin,
  Navigation as NavIcon,
  Phone,
  Compass,
  BookOpen,
  GraduationCap,
  Sparkles,
  ExternalLink,
  Search,
  CheckCircle2,
} from "lucide-react";

export interface CampusLocation {
  id: string;
  name: string;
  tagline: string;
  category: "headquarters" | "bible_school" | "leadership" | "bookstore";
  address: string;
  town: string;
  country: string;
  lat: number;
  lng: number;
  coordinator: string;
  phone: string;
  hours: string;
  services: string[];
}

export const ZION_CAMPUSES: CampusLocation[] = [
  {
    id: "bungoma-hq",
    name: "Zion Digital Global Headquarters",
    tagline: "Main Campus, Leadership Academy & Central Library",
    category: "headquarters",
    address: "Off Cathedral Road, Bungoma Town",
    town: "Bungoma",
    country: "Kenya",
    lat: 0.5695,
    lng: 34.5584,
    coordinator: "Kelvin Opara Wafula (Founder & Dean)",
    phone: "+254 114 684 132",
    hours: "Mon - Sat: 8:00 AM - 6:00 PM (EAT)",
    services: [
      "School of Leadership",
      "Executive Bible School",
      "Digital Publishing Hub",
      "Central Book Archive",
    ],
  },
  {
    id: "bungoma-town",
    name: "Bungoma Town Resource Depository",
    tagline: "E-Book Pickup, Study Lounge & Wi-Fi Library",
    category: "bookstore",
    address: "Moi Avenue Commercial Center, 2nd Floor",
    town: "Bungoma",
    country: "Kenya",
    lat: 0.5638,
    lng: 34.5606,
    coordinator: "Brother Brian Waf",
    phone: "+254 700 000 000",
    hours: "Mon - Sun: 7:30 AM - 8:00 PM",
    services: ["Physical & PDF Book Purchases", "Offline PDF Sync Station", "Student Study Desks"],
  },
  {
    id: "kanduyi-hub",
    name: "Kanduyi Youth & Tech Fellowship",
    tagline: "Computer Academy & Innovation Lab",
    category: "leadership",
    address: "Kanduyi Junction Near Technical Institute",
    town: "Bungoma",
    country: "Kenya",
    lat: 0.5742,
    lng: 34.5385,
    coordinator: "Pastor Michael Kuria",
    phone: "+254 114 684 132",
    hours: "Tue - Sat: 9:00 AM - 5:00 PM",
    services: ["Computer Academy", "Youth Leadership Seminars", "Mentorship Circles"],
  },
  {
    id: "webuye-center",
    name: "Webuye Regional Study Center",
    tagline: "Theological Library & Ministers Fellowship",
    category: "bible_school",
    address: "Webuye Town Central, Opp. District Hospital",
    town: "Webuye",
    country: "Kenya",
    lat: 0.5982,
    lng: 34.7706,
    coordinator: "Elder Sarah Nafula",
    phone: "+254 114 684 132",
    hours: "Wed & Sat: 10:00 AM - 4:00 PM",
    services: ["Pastoral Fellowship", "Old & New Testament Seminars", "Community Outreach"],
  },
  {
    id: "eldoret-hub",
    name: "Eldoret North Rift Learning Wing",
    tagline: "Highland Seminary & Student Desk",
    category: "bible_school",
    address: "Uganda Road, Central Square Building",
    town: "Eldoret",
    country: "Kenya",
    lat: 0.5143,
    lng: 35.2698,
    coordinator: "Tutor David K.",
    phone: "+254 114 684 132",
    hours: "Mon - Fri: 8:30 AM - 5:00 PM",
    services: ["Regional Exam Center", "Leadership Workshops", "Ordination Classes"],
  },
  {
    id: "kisumu-center",
    name: "Kisumu Lake Basin Center",
    tagline: "Media, Worship & Evangelism Hub",
    category: "leadership",
    address: "Oginga Odinga Street, Lakeside Plaza",
    town: "Kisumu",
    country: "Kenya",
    lat: -0.1022,
    lng: 34.7617,
    coordinator: "Minister Grace Achieng",
    phone: "+254 114 684 132",
    hours: "Tue - Sat: 9:00 AM - 6:00 PM",
    services: ["Worship Ministry Training", "Christian Audio/Video Editing", "Outreach Planning"],
  },
  {
    id: "nairobi-liaison",
    name: "Nairobi Metropolitan Resource Center",
    tagline: "Corporate Leadership & National Liaison",
    category: "headquarters",
    address: "Kimathi Street, City Center Wing",
    town: "Nairobi",
    country: "Kenya",
    lat: -1.2864,
    lng: 36.8172,
    coordinator: "Executive Council Office",
    phone: "+254 114 684 132",
    hours: "Mon - Fri: 8:00 AM - 5:00 PM",
    services: ["Executive Leadership Certification", "National Seminary Admissions", "Publisher Liaison"],
  },
];

interface CampusesMapProps {
  onBack?: () => void;
  onNavigateView?: (view: string) => void;
}

export default function CampusesMap({ onBack, onNavigateView }: CampusesMapProps) {
  const [selectedCampus, setSelectedCampus] = useState<CampusLocation | null>(ZION_CAMPUSES[0]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 0.5695,
    lng: 34.5584,
  });
  const [mapZoom, setMapZoom] = useState<number>(11);

  // In Google AI Studio Build, VITE_GOOGLE_MAPS_API_KEY is configured in runtime environment
  const mapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();

  const filteredCampuses = ZION_CAMPUSES.filter((c) => {
    const matchesCategory = activeCategory === "all" || c.category === activeCategory;
    const matchesQuery =
      searchQuery.trim() === "" ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.town.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.services.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  const handleSelectCampus = (campus: CampusLocation) => {
    setSelectedCampus(campus);
    setMapCenter({ lat: campus.lat, lng: campus.lng });
    setMapZoom(13);
  };

  const getPinColors = (category: CampusLocation["category"]) => {
    switch (category) {
      case "headquarters":
        return { background: "#A8421B", glyphColor: "#FFFFFF", borderColor: "#7C2D12" };
      case "bible_school":
        return { background: "#1E3A8A", glyphColor: "#FFFFFF", borderColor: "#172554" };
      case "leadership":
        return { background: "#047857", glyphColor: "#FFFFFF", borderColor: "#064E3B" };
      case "bookstore":
        return { background: "#D97706", glyphColor: "#FFFFFF", borderColor: "#92400E" };
      default:
        return { background: "#A8421B", glyphColor: "#FFFFFF", borderColor: "#7C2D12" };
    }
  };

  const openDirections = (campus: CampusLocation) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${campus.lat},${campus.lng}&destination_place_id=${encodeURIComponent(
      campus.name
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E7E1D8] dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#A8421B] dark:text-[#E07A5F] uppercase tracking-wider mb-1">
            <Compass className="h-4 w-4" />
            <span>Interactive Campus & Fellowship Locator</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1B18] dark:text-stone-100">
            Zion Digital Campuses & Study Centers
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 max-w-2xl">
            Explore our main headquarters in Bungoma, Kenya, alongside satellite study centers,
            pastoral fellowships, and book collection hubs across East Africa.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-2 rounded-xl border border-[#D8D0C5] dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-semibold text-[#1F1B18] dark:text-stone-200 hover:bg-stone-50 cursor-pointer transition shadow-2xs"
            >
              Back
            </button>
          )}
          {onNavigateView && (
            <button
              type="button"
              onClick={() => onNavigateView("contact")}
              className="px-4 py-2 rounded-xl bg-[#A8421B] hover:bg-[#8C3414] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>Contact Admissions</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-5 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by town, service, or campus name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D8D0C5] dark:border-stone-700 bg-white dark:bg-stone-900 text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#A8421B] shadow-2xs"
          />
        </div>

        <div className="sm:col-span-7 flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "All Centers", count: ZION_CAMPUSES.length },
            { id: "headquarters", label: "HQ & Main", count: 2 },
            { id: "bible_school", label: "Bible School", count: 2 },
            { id: "leadership", label: "Leadership & Tech", count: 2 },
            { id: "bookstore", label: "Book Depository", count: 1 },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? "bg-[#A8421B] text-white shadow-2xs"
                  : "bg-white dark:bg-stone-900 border border-[#D8D0C5] dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50"
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeCategory === cat.id
                    ? "bg-white/20 text-white"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Interactive Map + Campus Selector List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Map Container with explicit CSS height (CF2) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="w-full h-[520px] sm:h-[580px] rounded-2xl overflow-hidden border border-[#D8D0C5] dark:border-stone-800 shadow-sm relative bg-stone-100 dark:bg-stone-900">
            {mapsApiKey ? (
              <APIProvider apiKey={mapsApiKey} solutionChannel="GMP_visgl_reactgooglemaps_v1.7.1">
                <Map
                  mapId="DEMO_MAP_ID"
                  center={mapCenter}
                  zoom={mapZoom}
                  onCenterChanged={(ev) => setMapCenter(ev.detail.center)}
                  onZoomChanged={(ev) => setMapZoom(ev.detail.zoom)}
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  fullscreenControl={true}
                  mapTypeControl={true}
                  internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                  style={{ width: "100%", height: "100%" }}
                >
                  {filteredCampuses.map((campus) => {
                    const pin = getPinColors(campus.category);
                    const isSelected = selectedCampus?.id === campus.id;
                    return (
                      <AdvancedMarker
                        key={campus.id}
                        position={{ lat: campus.lat, lng: campus.lng }}
                        title={campus.name}
                        onClick={() => setSelectedCampus(campus)}
                        zIndex={isSelected ? 50 : 10}
                      >
                        <Pin
                          background={isSelected ? "#7C2D12" : pin.background}
                          glyphColor={pin.glyphColor}
                          borderColor={pin.borderColor}
                          scale={isSelected ? 1.25 : 1.0}
                        />
                      </AdvancedMarker>
                    );
                  })}

                  {selectedCampus && (
                    <InfoWindow
                      position={{ lat: selectedCampus.lat, lng: selectedCampus.lng }}
                      onCloseClick={() => setSelectedCampus(null)}
                      headerContent={
                        <div className="font-bold text-xs text-[#7C2D12]">
                          {selectedCampus.name}
                        </div>
                      }
                    >
                      <div className="p-1 space-y-2 max-w-[260px] text-xs text-stone-800">
                        <p className="font-medium text-stone-600">{selectedCampus.address}</p>
                        <div className="text-[11px] text-stone-500 space-y-0.5">
                          <p>
                            <strong>Leader:</strong> {selectedCampus.coordinator}
                          </p>
                          <p>
                            <strong>Phone:</strong> {selectedCampus.phone}
                          </p>
                          <p>
                            <strong>Hours:</strong> {selectedCampus.hours}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-stone-200 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDirections(selectedCampus)}
                            className="px-2.5 py-1 rounded bg-[#A8421B] hover:bg-[#8C3414] text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <NavIcon className="h-3 w-3" />
                            <span>Directions</span>
                          </button>
                          <a
                            href={`tel:${selectedCampus.phone.replace(/\s+/g, "")}`}
                            className="px-2.5 py-1 rounded border border-stone-300 text-stone-800 hover:bg-stone-50 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <Phone className="h-3 w-3" />
                            <span>Call</span>
                          </a>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            ) : (
              /* Fallback Preview Map Display when API Key is pending */
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#FAF6F0] dark:bg-stone-900">
                <div className="h-14 w-14 rounded-full bg-[#F3E7E1] dark:bg-stone-800 text-[#A8421B] flex items-center justify-center mb-4">
                  <Compass className="h-7 w-7" />
                </div>
                <h3 className="font-serif text-lg font-bold text-[#1F1B18] dark:text-stone-100 mb-1">
                  Google Maps Platform Initialized
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 max-w-md mb-4 leading-relaxed">
                  Google Maps is provisioned for Zion Digital. When viewing in Google AI Studio or
                  production, set <code className="bg-white/80 dark:bg-stone-800 px-1 py-0.5 rounded font-mono text-[#A8421B]">VITE_GOOGLE_MAPS_API_KEY</code>{" "}
                  in Secrets to unlock interactive vector rendering, live Street View and route calculation.
                </p>

                {/* Interactive Mock Preview with Active Coordinates */}
                <div className="w-full max-w-lg bg-white dark:bg-stone-800 rounded-xl p-4 border border-[#E7E1D8] dark:border-stone-700 shadow-2xs text-left space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#A8421B]">HQ Coordinates:</span>
                    <span className="font-mono text-stone-600 dark:text-stone-300">
                      0.5695° N, 34.5584° E (Bungoma, Kenya)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-t border-stone-100 dark:border-stone-700 pt-2">
                    <span className="font-bold text-stone-700 dark:text-stone-200">
                      {selectedCampus?.name || ZION_CAMPUSES[0].name}
                    </span>
                    <button
                      type="button"
                      onClick={() => openDirections(selectedCampus || ZION_CAMPUSES[0])}
                      className="px-2.5 py-1 rounded-md bg-[#A8421B] hover:bg-[#8C3414] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Open in Maps</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Map Legend Badge */}
            <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xs border border-[#E7E1D8] dark:border-stone-700 rounded-xl p-2.5 text-[11px] shadow-sm flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#A8421B]" />
                <span className="text-stone-700 dark:text-stone-300 font-medium">Headquarters</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#1E3A8A]" />
                <span className="text-stone-700 dark:text-stone-300 font-medium">Bible School</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#047857]" />
                <span className="text-stone-700 dark:text-stone-300 font-medium">Leadership</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#D97706]" />
                <span className="text-stone-700 dark:text-stone-300 font-medium">Bookstore</span>
              </div>
            </div>
          </div>

          {/* Directions / Travel Summary Bar */}
          {selectedCampus && (
            <div className="rounded-xl border border-[#E7E1D8] dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#A8421B]">
                    Active Selection
                  </span>
                  <span className="text-stone-400">•</span>
                  <span className="text-xs text-stone-500 font-medium">{selectedCampus.town}, Kenya</span>
                </div>
                <h4 className="font-serif text-base font-bold text-[#1F1B18] dark:text-stone-100">
                  {selectedCampus.name}
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  {selectedCampus.address} — Coordinator: {selectedCampus.coordinator} ({selectedCampus.phone})
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openDirections(selectedCampus)}
                  className="px-3.5 py-2 rounded-xl bg-[#A8421B] hover:bg-[#8C3414] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <NavIcon className="h-3.5 w-3.5" />
                  <span>Get Driving Route</span>
                </button>
                <a
                  href={`tel:${selectedCampus.phone.replace(/\s+/g, "")}`}
                  className="px-3.5 py-2 rounded-xl border border-[#D8D0C5] dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Call Campus</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Right: Interactive List of Study Centers */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E7E1D8] dark:border-stone-800">
            <h3 className="font-serif text-base font-bold text-[#1F1B18] dark:text-stone-100 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#A8421B]" />
              <span>Campus Directory</span>
            </h3>
            <span className="text-xs text-stone-500 font-medium">
              {filteredCampuses.length} locations
            </span>
          </div>

          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredCampuses.map((campus) => {
              const isSelected = selectedCampus?.id === campus.id;
              const pin = getPinColors(campus.category);

              return (
                <div
                  key={campus.id}
                  onClick={() => handleSelectCampus(campus)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer text-left ${
                    isSelected
                      ? "border-[#A8421B] bg-[#FAF2ED] dark:bg-stone-800/80 shadow-2xs ring-1 ring-[#A8421B]/50"
                      : "border-[#E7E1D8] dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-50/80 dark:hover:bg-stone-800/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-white"
                      style={{ backgroundColor: pin.background }}
                    >
                      {campus.town}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-[#A8421B]">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Focused</span>
                      </span>
                    )}
                  </div>

                  <h4 className="font-serif text-sm font-bold text-[#1F1B18] dark:text-stone-100">
                    {campus.name}
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">
                    {campus.tagline}
                  </p>

                  <div className="mt-2 text-[11px] text-stone-600 dark:text-stone-300 space-y-0.5">
                    <p className="truncate">📍 {campus.address}</p>
                    <p className="truncate">👤 {campus.coordinator}</p>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {campus.services.slice(0, 2).map((srv, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                      >
                        {srv}
                      </span>
                    ))}
                    {campus.services.length > 2 && (
                      <span className="text-[10px] px-1 py-0.5 text-stone-400 font-medium">
                        +{campus.services.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredCampuses.length === 0 && (
              <div className="text-center p-8 bg-stone-50 dark:bg-stone-900 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-stone-500 text-xs">
                No campuses match "{searchQuery}". Try selecting "All Centers".
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
