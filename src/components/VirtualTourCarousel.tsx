import React, { useState, useEffect, useRef } from "react";
import {
  Compass, ChevronLeft, ChevronRight, Play, Pause, MapPin, Sparkles,
  Maximize2, X, Tag, Plus, Edit, Trash2, CheckCircle2, RotateCcw,
  BookOpen, Eye, Layers, ShieldCheck, UploadCloud
} from "lucide-react";
import {
  CampusBuildingPhoto,
  getLocalCampusPhotos,
  saveLocalCampusPhotos,
  addOrUpdateCampusPhoto,
  deleteCampusPhoto,
  resetCampusPhotosToDefaults,
  syncCampusPhotosFromFirestore
} from "../utils/campusPhotoManager";
import { User } from "../types";

interface VirtualTourCarouselProps {
  currentUser?: User | null;
  onNavigate?: (view: string) => void;
  onSelectFacilityForInquiry?: (facilityName: string, location: string) => void;
  compactMode?: boolean;
  highlightCategory?: string;
  titleOverride?: string;
  subtitleOverride?: string;
}

export default function VirtualTourCarousel({
  currentUser,
  onNavigate,
  onSelectFacilityForInquiry,
  compactMode = false,
  highlightCategory,
  titleOverride,
  subtitleOverride
}: VirtualTourCarouselProps) {
  const [photos, setPhotos] = useState<CampusBuildingPhoto[]>(() => getLocalCampusPhotos());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [lightboxPhoto, setLightboxPhoto] = useState<CampusBuildingPhoto | null>(null);
  const [is360Active, setIs360Active] = useState(false);
  const [panOffset, setPanOffset] = useState(0);
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);

  // Admin Management Modal
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<CampusBuildingPhoto | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCampusName, setFormCampusName] = useState("Bungoma Kanduyi Main Campus (HQ)");
  const [formLibraryCategory, setFormLibraryCategory] = useState("Leadership");
  const [formCategory, setFormCategory] = useState<CampusBuildingPhoto["category"]>("Campus Buildings");
  const [formUrl, setFormUrl] = useState("");
  const [formLocation, setFormLocation] = useState("Kanduyi Hub, Bungoma, Western Kenya");
  const [formDescription, setFormDescription] = useState("");
  const [formFeatures, setFormFeatures] = useState("");
  const [formIsFeatured, setFormIsFeatured] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isAdmin = Boolean(
    currentUser && ["main_admin", "admin", "sub_admin", "manager"].includes(currentUser.role)
  );

  // Sync photos from Firestore on mount & listen to updates
  useEffect(() => {
    syncCampusPhotosFromFirestore().then((res) => {
      if (res && res.length > 0) setPhotos(res);
    });

    const handleUpdate = (e: any) => {
      if (e.detail?.photos) {
        setPhotos(e.detail.photos);
      } else {
        setPhotos(getLocalCampusPhotos());
      }
    };
    window.addEventListener("ZION_CAMPUS_PHOTOS_UPDATED", handleUpdate);
    return () => window.removeEventListener("ZION_CAMPUS_PHOTOS_UPDATED", handleUpdate);
  }, []);

  // Filter if highlightCategory requested
  const displayPhotos = highlightCategory
    ? photos.filter((p) => p.libraryCategory.toLowerCase() === highlightCategory.toLowerCase())
    : photos;

  const activeList = displayPhotos.length > 0 ? displayPhotos : photos;
  const activePhoto = activeList[currentIndex % Math.max(1, activeList.length)] || activeList[0];

  // Auto-tour timer
  useEffect(() => {
    if (!isAutoPlaying || activeList.length <= 1) return;
    const intervalTime = 5000;
    const stepTime = 100;
    const increment = (stepTime / intervalTime) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentIndex((idx) => (idx + 1) % activeList.length);
          return 0;
        }
        return prev + increment;
      });
    }, stepTime);

    return () => clearInterval(timer);
  }, [isAutoPlaying, activeList.length, currentIndex]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeList.length);
    setProgress(0);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeList.length) % activeList.length);
    setProgress(0);
  };

  // Touch Swipe Handlers for mobile phone screens
  const touchStartXRef = useRef<number>(0);
  const touchEndXRef = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartXRef.current - touchEndXRef.current;
    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        // Swiped left -> next
        handleNext();
      } else {
        // Swiped right -> prev
        handlePrev();
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxPhoto || is360Active) return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxPhoto, is360Active, activeList.length]);

  // Open Form for Add / Edit
  const handleOpenAddPhoto = () => {
    setEditingPhoto(null);
    setFormTitle("");
    setFormCampusName("Bungoma Kanduyi Main Campus (HQ)");
    setFormLibraryCategory("Leadership");
    setFormCategory("Campus Buildings");
    setFormUrl("");
    setFormLocation("Kanduyi Hub, Bungoma, Western Kenya");
    setFormDescription("");
    setFormFeatures("High-Speed Wi-Fi, Solar Backup, Executive Air-Conditioning");
    setFormIsFeatured(true);
    setStatusMessage(null);
    setIsAdminModalOpen(true);
  };

  const handleOpenEditPhoto = (photo: CampusBuildingPhoto) => {
    setEditingPhoto(photo);
    setFormTitle(photo.title);
    setFormCampusName(photo.campusName);
    setFormLibraryCategory(photo.libraryCategory);
    setFormCategory(photo.category);
    setFormUrl(photo.url);
    setFormLocation(photo.location);
    setFormDescription(photo.description);
    setFormFeatures((photo.features || []).join(", "));
    setFormIsFeatured(Boolean(photo.isFeaturedTour));
    setStatusMessage(null);
    setIsAdminModalOpen(true);
  };

  const handleSavePhotoForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formUrl) {
      setStatusMessage("Please enter both a title and an image URL or uploaded file.");
      return;
    }

    const newPhoto: CampusBuildingPhoto = {
      id: editingPhoto ? editingPhoto.id : `campus_${Date.now()}`,
      title: formTitle.trim(),
      campusName: formCampusName.trim(),
      libraryCategory: formLibraryCategory,
      category: formCategory,
      url: formUrl.trim(),
      location: formLocation.trim(),
      description: formDescription.trim(),
      features: formFeatures.split(",").map((f) => f.trim()).filter(Boolean),
      isFeaturedTour: formIsFeatured,
      addedBy: currentUser?.name || currentUser?.email || "Administrator",
      createdAt: editingPhoto?.createdAt || new Date().toISOString().slice(0, 10),
    };

    await addOrUpdateCampusPhoto(newPhoto);
    setStatusMessage(`Successfully saved "${newPhoto.title}"! Assigned to ${newPhoto.campusName} & "${newPhoto.libraryCategory}".`);
    setPhotos(getLocalCampusPhotos());
    setTimeout(() => {
      setIsAdminModalOpen(false);
      setStatusMessage(null);
    }, 1200);
  };

  const handleDeletePhoto = async (id: string) => {
    if (window.confirm("Are you sure you want to remove this campus building photograph?")) {
      await deleteCampusPhoto(id);
      setPhotos(getLocalCampusPhotos());
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm("Reset all campus building photos to official Bungoma campus defaults?")) {
      const defs = resetCampusPhotosToDefaults();
      setPhotos(defs);
      setCurrentIndex(0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setFormUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!activePhoto) return null;

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#07142B] text-slate-800 dark:text-slate-100 shadow-md ${compactMode ? "p-4" : "p-5 sm:p-7"}`}>
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-stone-200/80 dark:border-slate-800">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase text-[#155EEF] dark:text-[#F5B82E]">
            <Compass className="h-4 w-4 shrink-0 animate-spin-slow" />
            <span>Zion Leadership Campus · Bungoma, Western Kenya</span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
              Interactive Tour
            </span>
          </div>
          <h3 className="font-display text-xl sm:text-2xl font-bold text-[#0B254D] dark:text-white leading-tight">
            {titleOverride || "Experience Our Physical Campus & Facilities"}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
            {subtitleOverride || "Take an interactive virtual walk through our lecture blocks, digital library, theological chapel, and computer labs in Kanduyi, Bungoma. Swipe or click through areas."}
          </p>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Autoplay Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              isAutoPlaying
                ? "bg-[#EFF6FF] dark:bg-blue-950/40 text-[#155EEF] dark:text-blue-300 border-blue-200 dark:border-blue-800"
                : "bg-stone-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-stone-200 dark:border-slate-700"
            }`}
            title={isAutoPlaying ? "Pause Auto-Tour" : "Resume Auto-Tour"}
          >
            {isAutoPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
            <span className="hidden sm:inline">{isAutoPlaying ? "Auto-Tour On" : "Auto-Tour Paused"}</span>
          </button>

          {/* Admin Management Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenAddPhoto}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B254D] dark:bg-slate-800 hover:bg-[#155EEF] text-white text-xs font-bold transition cursor-pointer shadow-xs"
              title="Add & Assign Campus Photos"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Manage Photos</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Facility Area Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-left mb-4 select-none">
        {activeList.map((photo, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => {
                setCurrentIndex(idx);
                setProgress(0);
              }}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isActive
                  ? "bg-[#155EEF] text-white shadow-xs font-bold scale-[1.02]"
                  : "bg-stone-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700"
              }`}
            >
              <span className="text-[10px] font-mono opacity-80">{idx + 1}.</span>
              <span className="truncate max-w-[150px] sm:max-w-[200px]">{photo.title}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Stage Interactive Viewport with Touch Handlers */}
      <div
        className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-950 shadow-inner group select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background Visual Asset */}
        <img
          src={activePhoto.url}
          alt={activePhoto.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Ambient Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/20" />

        {/* Progress Bar for Auto-Tour */}
        {isAutoPlaying && (
          <div className="absolute top-0 inset-x-0 h-1 bg-white/20 z-20">
            <div
              className="h-full bg-[#F5B82E] transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 z-20">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-lg bg-[#0B254D]/90 backdrop-blur-md text-white font-mono text-[10px] font-bold tracking-wider uppercase border border-white/10 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-[#F5B82E]" />
              <span>{activePhoto.campusName}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#155EEF]/90 backdrop-blur-md text-white font-mono text-[10px] font-bold tracking-wider uppercase border border-white/10">
              {activePhoto.category}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#F5B82E]/90 backdrop-blur-md text-[#0B254D] font-mono text-[10px] font-black tracking-wider uppercase">
              📚 Library Category: {activePhoto.libraryCategory}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* 360 Simulated Panorama View */}
            <button
              type="button"
              onClick={() => setIs360Active(true)}
              className="px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[11px] font-bold transition flex items-center gap-1 border border-white/15 cursor-pointer"
              title="Experience 360° Simulated Pan"
            >
              <RotateCcw className="h-3 w-3 text-[#F5B82E]" />
              <span className="hidden sm:inline">360° Pan</span>
            </button>

            {/* Lightbox Trigger */}
            <button
              type="button"
              onClick={() => setLightboxPhoto(activePhoto)}
              className="h-8 w-8 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition border border-white/15 cursor-pointer"
              title="View Fullscreen Photo"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Previous & Next Click Arrows */}
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous facility"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/50 hover:bg-[#155EEF] text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer z-20 border border-white/20 active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={handleNext}
          aria-label="Next facility"
          className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/50 hover:bg-[#155EEF] text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer z-20 border border-white/20 active:scale-95"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Bottom Card Overlay with Description & Amenities */}
        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 text-white text-left z-20 bg-gradient-to-t from-black via-black/80 to-transparent">
          <div className="max-w-3xl space-y-2">
            <div className="flex items-center gap-2 text-xs text-amber-300 font-medium">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{activePhoto.location}</span>
            </div>

            <h4 className="font-display text-lg sm:text-2xl font-bold tracking-tight text-white leading-tight">
              {activePhoto.title}
            </h4>

            <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 leading-relaxed">
              {activePhoto.description}
            </p>

            {/* Feature Pills */}
            {activePhoto.features && activePhoto.features.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activePhoto.features.map((feat, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/15 backdrop-blur-xs text-[10px] font-semibold text-white border border-white/10"
                  >
                    <Sparkles className="h-2.5 w-2.5 text-[#F5B82E]" />
                    <span>{feat}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Bottom Quick Action Bar */}
      <div className="mt-4 pt-3 border-t border-stone-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
          <span>
            Area {currentIndex + 1} of {activeList.length}
          </span>
          <span>•</span>
          <span className="hidden sm:inline">Use left/right keys or swipe on mobile</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSelectFacilityForInquiry && (
            <button
              type="button"
              onClick={() => onSelectFacilityForInquiry(activePhoto.title, activePhoto.location)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Schedule Campus Visit</span>
            </button>
          )}

          {onNavigate && activePhoto.libraryCategory && (
            <button
              type="button"
              onClick={() => onNavigate("store")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#155EEF] text-[#155EEF] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-bold transition cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Explore {activePhoto.libraryCategory} Books</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => handleOpenEditPhoto(activePhoto)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 font-semibold transition cursor-pointer"
            >
              <Edit className="h-3 w-3" />
              <span>Edit Area Info</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. 360° Interactive Simulated Pan Viewport Modal */}
      {is360Active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="relative w-full max-w-5xl bg-[#07142B] border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-[#F5B82E] animate-spin-slow" />
                <span className="font-display font-bold text-sm">
                  360° Interactive Panorama View: {activePhoto.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIs360Active(false)}
                className="h-8 w-8 rounded-full bg-slate-800 hover:bg-red-700 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              className="relative flex-1 bg-black overflow-hidden cursor-grab active:cursor-grabbing select-none h-[50vh] sm:h-[60vh]"
              onMouseDown={(e) => {
                setIsDraggingPan(true);
                setDragStartX(e.clientX - panOffset);
              }}
              onMouseMove={(e) => {
                if (!isDraggingPan) return;
                setPanOffset(e.clientX - dragStartX);
              }}
              onMouseUp={() => setIsDraggingPan(false)}
              onMouseLeave={() => setIsDraggingPan(false)}
            >
              <img
                src={activePhoto.url}
                alt={activePhoto.title}
                className="absolute inset-y-0 h-full max-w-none transition-transform duration-75 pointer-events-none"
                style={{
                  transform: `translateX(${panOffset % 800}px) scale(1.3)`,
                  left: "-15%",
                  width: "140%",
                }}
              />
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/30" />

              {/* Hotspot Indicators */}
              <div
                className="absolute top-1/3 left-1/4 -translate-x-1/2 p-2 rounded-xl bg-black/75 border border-[#F5B82E] text-white text-[11px] font-bold backdrop-blur-md shadow-lg pointer-events-none"
                style={{ transform: `translateX(${panOffset * 0.4}px)` }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Main Lecture Hall</span>
                </div>
              </div>

              <div
                className="absolute top-1/2 left-2/3 -translate-x-1/2 p-2 rounded-xl bg-black/75 border border-[#155EEF] text-white text-[11px] font-bold backdrop-blur-md shadow-lg pointer-events-none"
                style={{ transform: `translateX(${panOffset * 0.4}px)` }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                  <span>Interactive Smart Podiums</span>
                </div>
              </div>
            </div>

            {/* Panorama Controls footer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
              <span className="font-mono text-[11px]">Click and drag left or right to pan across this Bungoma facility</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPanOffset((prev) => prev + 120)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                >
                  &larr; Pan Left
                </button>
                <button
                  type="button"
                  onClick={() => setPanOffset((prev) => prev - 120)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                >
                  Pan Right &rarr;
                </button>
                <button
                  type="button"
                  onClick={() => setPanOffset(0)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                >
                  Reset Pan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Lightbox Fullscreen Modal */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="relative max-w-5xl w-full bg-[#07142B] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#F5B82E]" />
                <span className="font-display font-bold text-sm sm:text-base">{lightboxPhoto.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="h-8 w-8 rounded-full bg-slate-800 hover:bg-red-700 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative bg-black flex-1 overflow-hidden flex items-center justify-center max-h-[65vh]">
              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.title}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="p-5 bg-slate-900 border-t border-slate-800 text-left space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-[#155EEF] text-white font-bold font-mono">
                  {lightboxPhoto.campusName}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold font-mono border border-amber-500/30">
                  Category: {lightboxPhoto.libraryCategory}
                </span>
                <span className="text-slate-400">{lightboxPhoto.location}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {lightboxPhoto.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 7. Admin Photo Management Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative max-w-2xl w-full bg-white dark:bg-[#07142B] border border-stone-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-left">
            <div className="p-5 bg-stone-50 dark:bg-slate-900 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#155EEF]" />
                  <span>{editingPhoto ? "Edit Campus Building Photo" : "Upload & Assign Campus Photo"}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Assign official building photos to physical campuses and digital bookstore categories.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminModalOpen(false)}
                className="h-8 w-8 rounded-full bg-stone-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-white hover:bg-red-700 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePhotoForm} className="p-6 overflow-y-auto space-y-4 text-xs">
              {statusMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-medium">
                  {statusMessage}
                </div>
              )}

              {/* Title */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                  Facility / Building Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Chancellor's Executive & Lecture Complex"
                  className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
              </div>

              {/* Campus & Library Category dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                    Assign to Campus *
                  </label>
                  <select
                    value={formCampusName}
                    onChange={(e) => setFormCampusName(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 px-3 py-2 text-xs"
                  >
                    <option value="Bungoma Kanduyi Main Campus (HQ)">Bungoma Kanduyi Main Campus (HQ)</option>
                    <option value="Bible School Grounds, Bungoma">Bible School Grounds, Bungoma</option>
                    <option value="Eldoret Campus Wing">Eldoret Campus Wing</option>
                    <option value="Kisumu Regional Center">Kisumu Regional Center</option>
                    <option value="Nairobi Directorate">Nairobi Directorate</option>
                    <option value="Chwele / Webuye Annex">Chwele / Webuye Annex</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                    Assign to Bookstore / Library Category *
                  </label>
                  <select
                    value={formLibraryCategory}
                    onChange={(e) => setFormLibraryCategory(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 px-3 py-2 text-xs"
                  >
                    <option value="Leadership">Leadership & Governance</option>
                    <option value="Christian Books">Christian Books & Theology</option>
                    <option value="Computer">Computer Science & ICT</option>
                    <option value="Education">Education & Academic Textbooks</option>
                    <option value="Mathematics">Mathematics & CBC</option>
                    <option value="Science">Sciences & Innovation</option>
                    <option value="Business">Business & Entrepreneurship</option>
                    <option value="Personal Development">Personal Development</option>
                    <option value="All">All / General Campus Facility</option>
                  </select>
                </div>
              </div>

              {/* Image Source: URL or File Upload */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                  Building Photograph Source (URL or File Upload) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or data:image/..."
                    className="flex-1 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono"
                  />
                  <label className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shrink-0">
                    <UploadCloud className="h-4 w-4 text-[#155EEF]" />
                    <span>Upload File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {formUrl && (
                  <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-stone-200 dark:border-slate-700 bg-black/20">
                    <img src={formUrl} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>

              {/* Location & Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                    Physical Location Details
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Kanduyi Hub, Bungoma-Malaba Highway"
                    className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 px-3 py-2 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                    Key Features / Amenities (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formFeatures}
                    onChange={(e) => setFormFeatures(e.target.value)}
                    placeholder="e.g. 500-Seat Hall, Solar Power, Wi-Fi"
                    className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                  Architectural &amp; Facility Description
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe the facility, classrooms, equipment, and purpose..."
                  className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-3 border-t border-stone-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  Reset Defaults
                </button>

                <div className="flex items-center gap-2">
                  {editingPhoto && (
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(editingPhoto.id)}
                      className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800 cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white font-bold transition cursor-pointer shadow-xs"
                  >
                    {editingPhoto ? "Save Changes" : "Publish Photo to Tour"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
