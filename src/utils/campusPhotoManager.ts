import { collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface CampusBuildingPhoto {
  id: string;
  title: string;
  campusName: string; // e.g. "Bungoma Kanduyi Main Campus (HQ)", "Eldoret Campus Wing", "Kisumu Regional Center", "Nairobi Directorate"
  libraryCategory: string; // e.g. "All", "Leadership", "Christian Books", "Computer", "Mathematics", "Science", "Business", "Personal Development"
  category: "Campus Buildings" | "ICT & Library" | "Fellowship & Seminars" | "Students & Graduation" | "Lecture Halls";
  url: string;
  location: string;
  description: string;
  features?: string[];
  isFeaturedTour?: boolean;
  addedBy?: string;
  createdAt?: string;
}

export const OFFICIAL_BUNGOMA_CAMPUS_PHOTOS: CampusBuildingPhoto[] = [
  {
    id: "campus_hq_admin",
    title: "Chancellor's Executive & Lecture Complex",
    campusName: "Bungoma Kanduyi Main Campus (HQ)",
    libraryCategory: "Leadership",
    category: "Campus Buildings",
    url: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80",
    location: "Kanduyi Hub, Bungoma-Malaba Highway, Bungoma",
    description: "The primary architectural beacon of Zion Digital in Bungoma, housing executive administration, academic registrar suites, and high-capacity leadership lecture halls equipped with digital presentation podiums.",
    features: ["500-Seat Lecture Hall", "Executive Boardroom", "Solar Backup Power", "Admissions Gateway"],
    isFeaturedTour: true,
    createdAt: "2026-01-15"
  },
  {
    id: "campus_central_library",
    title: "Zion Central Reference Library & Archive",
    campusName: "Bungoma Kanduyi Main Campus (HQ)",
    libraryCategory: "Education",
    category: "ICT & Library",
    url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80",
    location: "Academic Quadrangle, Kanduyi, Bungoma",
    description: "Multi-level academic reading wing housing thousands of physical volumes, Christian literature, and digital study terminals with high-speed optical fiber connectivity.",
    features: ["Quiet Reading Carrels", "Digital Archive Terminals", "Fibre Internet", "E-Book Sync Hub"],
    isFeaturedTour: true,
    createdAt: "2026-01-20"
  },
  {
    id: "campus_theology_sanctuary",
    title: "Theological Sanctum & Bible Fellowship Chapel",
    campusName: "Bible School Grounds, Bungoma",
    libraryCategory: "Christian Books",
    category: "Fellowship & Seminars",
    url: "https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&w=1200&q=80",
    location: "Zion Prayer Hill, Kanduyi, Bungoma",
    description: "A serene prayer chapel and biblical study sanctuary dedicated to pastoral mentorship, daily morning devotionals, theological defense seminars, and spiritual retreats.",
    features: ["Acoustic Worship Hall", "Pastoral Counseling Suites", "Scripture Study Desks", "Baptismal Pavilion"],
    isFeaturedTour: true,
    createdAt: "2026-02-01"
  },
  {
    id: "campus_computer_lab",
    title: "Zion Computer & Software Engineering Hub",
    campusName: "Bungoma Kanduyi Main Campus (HQ)",
    libraryCategory: "Computer",
    category: "ICT & Library",
    url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80",
    location: "Technology Wing, Second Floor, Bungoma",
    description: "State-of-the-art computer laboratories outfitted with development workstations, server racks, and high-speed local intranet where students build web, mobile, and AI solutions.",
    features: ["Dual-Monitor Coding Desks", "Dedicated Cloud Server Rack", "AI Research Lab", "High-Speed Wi-Fi"],
    isFeaturedTour: true,
    createdAt: "2026-02-10"
  },
  {
    id: "campus_stem_pavilion",
    title: "Mathematics & Science Innovation Center",
    campusName: "Bungoma Kanduyi Main Campus (HQ)",
    libraryCategory: "Mathematics",
    category: "Lecture Halls",
    url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
    location: "CBC & Sciences Wing, Bungoma",
    description: "Dedicated science and mathematical analytics hall facilitating 8-4-4, CBC, and university-level computational workshops with smart interactive digital whiteboards.",
    features: ["Smart Whiteboards", "Computational Math Workstations", "CBC Demonstration Lab"],
    isFeaturedTour: true,
    createdAt: "2026-02-15"
  },
  {
    id: "campus_business_incubator",
    title: "Enterprise & Leadership Innovation Hub",
    campusName: "Bungoma Kanduyi Main Campus (HQ)",
    libraryCategory: "Business",
    category: "Campus Buildings",
    url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
    location: "Enterprise Hall, West Wing, Bungoma",
    description: "Collaborative incubator where scholars formulate community transformation projects, M-Pesa enterprise models, and Christian business stewardship ventures.",
    features: ["Co-Working Desks", "Conference Facilities", "Presentation Screens", "Venture Mentorship"],
    isFeaturedTour: true,
    createdAt: "2026-02-20"
  },
  {
    id: "campus_convocation_grounds",
    title: "Convocation Amphitheatre & Graduation Grounds",
    campusName: "Bungoma Kanduyi Main Campus (HQ)",
    libraryCategory: "Personal Development",
    category: "Students & Graduation",
    url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80",
    location: "Main Ceremonial Grounds, Bungoma",
    description: "Landscaped open-air graduation grounds and ceremonial lawns where Zion Digital confers diplomas, certificates, and hosts regional Christian leadership conferences.",
    features: ["2,000 Capacity Lawn", "Covered Ceremonial Stage", "Broadcast Video Setup"],
    isFeaturedTour: true,
    createdAt: "2026-03-01"
  },
  {
    id: "campus_student_fellowship",
    title: "Mentorship & Green Fellowship Gardens",
    campusName: "Bungoma Kanduyi Main Campus (HQ)",
    libraryCategory: "All",
    category: "Fellowship & Seminars",
    url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
    location: "Central Campus Quad, Bungoma",
    description: "Lush gardens with shaded gazebo discussion alcoves where students gather between lectures for prayer, collaborative study, and peer fellowship.",
    features: ["Outdoor Wi-Fi Access", "Solar Gazebos", "Student Cafe Patio"],
    isFeaturedTour: true,
    createdAt: "2026-03-05"
  }
];

const LOCAL_STORAGE_KEY = "ZION_CAMPUS_BUILDING_PHOTOS";

export function getLocalCampusPhotos(): CampusBuildingPhoto[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (_) {}
  // Default fallback
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(OFFICIAL_BUNGOMA_CAMPUS_PHOTOS));
  return OFFICIAL_BUNGOMA_CAMPUS_PHOTOS;
}

export function saveLocalCampusPhotos(photos: CampusBuildingPhoto[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(photos));
    window.dispatchEvent(new CustomEvent("ZION_CAMPUS_PHOTOS_UPDATED", { detail: { photos } }));
  } catch (_) {}
}

export async function syncCampusPhotosFromFirestore(): Promise<CampusBuildingPhoto[]> {
  try {
    const colRef = collection(db, "campusPhotos");
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const remotePhotos: CampusBuildingPhoto[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as CampusBuildingPhoto;
        remotePhotos.push({ ...data, id: docSnap.id });
      });
      if (remotePhotos.length > 0) {
        saveLocalCampusPhotos(remotePhotos);
        return remotePhotos;
      }
    }
  } catch (err) {
    console.warn("Firestore campusPhotos sync fallback to local storage:", err);
  }
  return getLocalCampusPhotos();
}

export async function addOrUpdateCampusPhoto(photo: CampusBuildingPhoto): Promise<void> {
  const current = getLocalCampusPhotos();
  const existingIdx = current.findIndex((p) => p.id === photo.id);
  let updated: CampusBuildingPhoto[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = photo;
  } else {
    updated = [photo, ...current];
  }
  saveLocalCampusPhotos(updated);

  try {
    const docRef = doc(db, "campusPhotos", photo.id);
    await setDoc(docRef, photo);
  } catch (err) {
    console.warn("Could not save campusPhoto to Firestore (stored locally):", err);
  }
}

export async function deleteCampusPhoto(photoId: string): Promise<void> {
  const current = getLocalCampusPhotos();
  const filtered = current.filter((p) => p.id !== photoId);
  saveLocalCampusPhotos(filtered);

  try {
    const docRef = doc(db, "campusPhotos", photoId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Could not delete campusPhoto from Firestore (deleted locally):", err);
  }
}

export function resetCampusPhotosToDefaults(): CampusBuildingPhoto[] {
  saveLocalCampusPhotos(OFFICIAL_BUNGOMA_CAMPUS_PHOTOS);
  return OFFICIAL_BUNGOMA_CAMPUS_PHOTOS;
}

export function getBuildingPhotoForCategory(category: string, photos?: CampusBuildingPhoto[]): CampusBuildingPhoto | undefined {
  const list = photos || getLocalCampusPhotos();
  const catLower = category.toLowerCase().trim();
  
  // Exact or partial category match
  const match = list.find((p) => {
    const pCatLower = p.libraryCategory.toLowerCase();
    return pCatLower === catLower || pCatLower.includes(catLower) || catLower.includes(pCatLower);
  });
  if (match) return match;

  // Keyword associations
  if (catLower.includes("bible") || catLower.includes("theolog") || catLower.includes("relig") || catLower.includes("christian")) {
    return list.find((p) => p.libraryCategory === "Christian Books") || list[2];
  }
  if (catLower.includes("leader") || catLower.includes("govern") || catLower.includes("minist")) {
    return list.find((p) => p.libraryCategory === "Leadership") || list[0];
  }
  if (catLower.includes("comput") || catLower.includes("code") || catLower.includes("tech") || catLower.includes("ict")) {
    return list.find((p) => p.libraryCategory === "Computer") || list[3];
  }
  if (catLower.includes("math") || catLower.includes("cbc") || catLower.includes("scienc")) {
    return list.find((p) => p.libraryCategory === "Mathematics") || list[4];
  }
  if (catLower.includes("busin") || catLower.includes("econom") || catLower.includes("finan")) {
    return list.find((p) => p.libraryCategory === "Business") || list[5];
  }
  return list[0];
}
