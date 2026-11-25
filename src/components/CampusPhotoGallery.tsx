import React, { useState } from "react";
import { Camera, ZoomIn, X, MapPin, Sparkles } from "lucide-react";

interface CampusPhoto {
  id: string;
  title: string;
  category: "Campus Buildings" | "ICT & Library" | "Fellowship & Seminars" | "Students & Graduation";
  url: string;
  location: string;
  description: string;
}

const ZION_CAMPUS_PHOTOS: CampusPhoto[] = [
  {
    id: "photo_1",
    title: "Main Administration & Lecture Block",
    category: "Campus Buildings",
    url: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80",
    location: "Kanduyi Main Campus, Bungoma",
    description: "State-of-the-art academic administration building housing leadership seminar halls, registrar offices, and executive boardrooms."
  },
  {
    id: "photo_2",
    title: "Zion Digital Reference Library",
    category: "ICT & Library",
    url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80",
    location: "Bungoma Library Wing",
    description: "Extensive theological, computer science, and leadership book collections with quiet reading carrels and high-speed fibre internet."
  },
  {
    id: "photo_3",
    title: "Advanced Computer & Coding Lab",
    category: "ICT & Library",
    url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80",
    location: "Computer School Complex",
    description: "Equipped with modern workstations, dual monitors, and coding suites where students build mobile apps and web platforms."
  },
  {
    id: "photo_4",
    title: "Chapel & Bible Study Sanctuary",
    category: "Fellowship & Seminars",
    url: "https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&w=1200&q=80",
    location: "Bible School Grounds",
    description: "A serene spiritual sanctuary dedicated to daily devotions, worship sessions, pastoral mentorship, and theological symposia."
  },
  {
    id: "photo_5",
    title: "Student Leadership Cohort & Seminars",
    category: "Students & Graduation",
    url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
    location: "Main Auditorium, Bungoma",
    description: "Engaged theological and leadership scholars participating in collaborative workshops and community service planning."
  },
  {
    id: "photo_6",
    title: "Annual Graduation & Convocation Grounds",
    category: "Students & Graduation",
    url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80",
    location: "Ceremonial Grounds, Kanduyi",
    description: "Celebrating graduating cohorts in Leadership, Computer Science, and Biblical Studies ready to transform African communities."
  }
];

export default function CampusPhotoGallery() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activePhoto, setActivePhoto] = useState<CampusPhoto | null>(null);

  const categories = ["All", "Campus Buildings", "ICT & Library", "Fellowship & Seminars", "Students & Graduation"];

  const filteredPhotos = selectedCategory === "All" 
    ? ZION_CAMPUS_PHOTOS 
    : ZION_CAMPUS_PHOTOS.filter(p => p.category === selectedCategory);

  return (
    <div className="space-y-6 my-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-[#A8421B] dark:text-[#F5B82E] mb-1 font-mono text-xs font-bold uppercase tracking-wider">
            <Camera className="h-4 w-4" />
            <span>Zion Digital Campus Tour</span>
          </div>
          <h3 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
            Bungoma Facilities &amp; Learning Spaces
          </h3>
          <p className="text-xs text-neutral-600 dark:text-slate-400 mt-1 max-w-xl">
            Explore vivid snapshots of our modern classrooms, computer labs, library wings, and chapel facilities located in Bungoma, Western Kenya.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 bg-[#FAF8F4] dark:bg-slate-900 p-1.5 rounded-xl border border-stone-200 dark:border-slate-800">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#A8421B] text-white shadow-xs"
                  : "text-neutral-600 dark:text-slate-300 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPhotos.map((photo) => (
          <div
            key={photo.id}
            onClick={() => setActivePhoto(photo)}
            className="group relative rounded-2xl overflow-hidden border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-stone-100 dark:bg-slate-800">
              <img
                src={photo.url}
                alt={photo.title}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-85 group-hover:opacity-95 transition-opacity" />
              
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-md bg-[#0B254D]/90 text-white font-mono text-[10px] font-bold tracking-wider uppercase backdrop-blur-xs">
                  {photo.category}
                </span>
              </div>

              <div className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="h-4 w-4" />
              </div>

              <div className="absolute bottom-3 left-3 right-3 text-white space-y-1">
                <div className="flex items-center space-x-1 text-[11px] text-amber-300 font-medium">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{photo.location}</span>
                </div>
                <h4 className="font-display text-base font-bold leading-tight group-hover:text-amber-200 transition">
                  {photo.title}
                </h4>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative max-w-4xl w-full bg-[#FAF8F4] dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-stone-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-[#A8421B]" />
                <span className="font-mono text-xs uppercase tracking-wider font-bold text-neutral-500">
                  {activePhoto.category}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="h-8 w-8 rounded-full bg-stone-100 dark:bg-slate-800 flex items-center justify-center text-neutral-700 dark:text-white hover:bg-red-700 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative bg-black flex-1 overflow-hidden flex items-center justify-center max-h-[60vh]">
              <img
                src={activePhoto.url}
                alt={activePhoto.title}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 space-y-2 text-left">
              <div className="flex items-center space-x-1.5 text-xs text-[#A8421B] dark:text-[#F5B82E] font-semibold">
                <MapPin className="h-3.5 w-3.5" />
                <span>{activePhoto.location}</span>
              </div>
              <h3 className="font-display text-xl font-bold text-neutral-900 dark:text-white">
                {activePhoto.title}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-slate-300 leading-relaxed">
                {activePhoto.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
