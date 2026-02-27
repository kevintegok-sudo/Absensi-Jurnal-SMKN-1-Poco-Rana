import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { 
  Camera, 
  MapPin, 
  Calendar, 
  User, 
  LogOut, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Users, 
  Download,
  Clock,
  Menu,
  X,
  ChevronRight,
  Plus,
  Upload,
  Paperclip
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icon issue
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LOGO_URL = "https://storage.googleapis.com/static.run.app/v1/p/6bcl3nbtzle7yg6obs/image.png";

// --- Types ---
interface UserData {
  id: number;
  username: string;
  full_name: string;
  role: 'Guru' | 'Pegawai' | 'Admin';
}

// --- Components ---

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-200 active:shadow-none',
      secondary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:shadow-none',
      danger: 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-100 active:shadow-none',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
      outline: 'bg-white border-2 border-slate-200 text-slate-700 hover:border-rose-500 hover:text-rose-600',
    };
    return (
      <button
        ref={ref}
        className={cn(
          'px-6 py-3 rounded-2xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-sm',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => (
  <div className={cn('bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6', className)} {...props}>
    {children}
  </div>
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all bg-slate-50/50 text-slate-800 placeholder:text-slate-400',
      className
    )}
    {...props}
  />
));

const CameraView = ({ onCapture }: { onCapture: (base64: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    }
    startCamera();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        onCapture(canvasRef.current.toDataURL('image/jpeg'));
      }
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <button
          onClick={capture}
          className="w-16 h-16 rounded-full bg-white border-4 border-red-500 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
        >
          <Camera className="text-red-500" />
        </button>
      </div>
    </div>
  );
};

// --- Pages ---

const Login = ({ onLogin }: { onLogin: (user: UserData) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-rose-100 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md z-10"
      >
        <Card className="p-10 border-none shadow-2xl shadow-slate-200/60">
          <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 mb-6 p-4 bg-rose-50 rounded-[2rem] flex items-center justify-center overflow-hidden">
              <img 
                src={LOGO_URL} 
                alt="Logo" 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/2991/2991148.png";
                }}
              />
            </div>
            <h1 className="text-2xl font-extrabold text-center text-slate-900 tracking-tight">SMKN 1 Poco Ranaka</h1>
            <p className="text-slate-500 font-medium mt-1">Sistem Absensi & Jurnal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Username</label>
              <Input 
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Masukkan username"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <Input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
              />
            </div>
            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-rose-500 text-sm font-semibold text-center bg-rose-50 py-2 rounded-xl"
              >
                {error}
              </motion.p>
            )}
            <Button type="submit" className="w-full py-5 text-base" disabled={loading}>
              {loading ? 'Memproses...' : 'Masuk ke Akun'}
            </Button>
          </form>
        </Card>
        <p className="text-center mt-8 text-slate-400 text-sm font-medium">
          &copy; 2024 SMKN 1 Poco Ranaka
        </p>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ user }: { user: UserData }) => {
  const navigate = useNavigate();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => console.error(err)
    );
  }, []);

  const menuItems = [
    { label: 'Absen Masuk', icon: CheckCircle, color: 'bg-rose-50 text-rose-600', path: '/attendance/in' },
    { label: 'Absen Keluar', icon: XCircle, color: 'bg-indigo-50 text-indigo-600', path: '/attendance/out' },
    { label: 'Isi Jurnal', icon: FileText, color: 'bg-emerald-50 text-emerald-600', path: '/journal' },
    { label: 'Ijin / Sakit', icon: Calendar, color: 'bg-amber-50 text-amber-600', path: '/permission' },
  ];

  if (user.role === 'Admin') {
    menuItems.push(
      { label: 'Kelola User', icon: Users, color: 'bg-purple-50 text-purple-600', path: '/admin/users' },
      { label: 'Rekap Data', icon: Download, color: 'bg-slate-50 text-slate-600', path: '/admin/recap' },
      { label: 'Set Lokasi', icon: MapPin, color: 'bg-orange-50 text-orange-600', path: '/admin/settings' }
    );
  }

  return (
    <div className="p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Selamat Datang</p>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{user.full_name.split(' ')[0]}!</h2>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-white shadow-lg shadow-slate-200 flex items-center justify-center border border-slate-100">
          <User className="text-rose-600 w-7 h-7" />
        </div>
      </header>

      <Card className="brand-gradient text-white border-none p-8 relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="relative z-10 flex items-center gap-5">
          <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
            <MapPin className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <p className="text-rose-100 text-xs font-bold uppercase tracking-wider">Lokasi Anda</p>
            <p className="font-bold text-lg">
              {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Mencari lokasi...'}
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-slate-900 font-extrabold text-lg tracking-tight ml-1">Menu Utama</h3>
        <div className="grid grid-cols-2 gap-5">
          {menuItems.map((item, idx) => (
            <motion.button
              key={idx}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-start p-6 rounded-[2rem] bg-white shadow-sm border border-slate-100 gap-4 text-left transition-all hover:shadow-xl hover:shadow-slate-200/50"
            >
              <div className={cn('p-4 rounded-2xl', item.color)}>
                <item.icon className="w-7 h-7" />
              </div>
              <span className="font-bold text-slate-800 text-sm leading-tight">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <Card className="bg-slate-900 text-white border-none p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="text-rose-500" />
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Waktu Sekarang</p>
              <p className="font-bold">{format(new Date(), 'HH:mm:ss')}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium">{format(new Date(), 'd MMM yyyy')}</p>
        </div>
      </Card>
    </div>
  );
};

const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

const AttendancePage = ({ user, type }: { user: UserData; type: 'in' | 'out' }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(userLoc);
      },
      err => alert("Mohon aktifkan GPS untuk melakukan absensi")
    );
  }, []);

  useEffect(() => {
    if (location && settings) {
      const dist = calculateDistance(
        location.lat,
        location.lng,
        parseFloat(settings.school_lat),
        parseFloat(settings.school_lng)
      );
      setDistance(dist);
    }
  }, [location, settings]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const isWithinRadius = distance !== null && settings && distance <= parseFloat(settings.school_radius);

  const handleSubmit = async () => {
    if (!photo || !location) return;
    setLoading(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          type,
          latitude: location.lat,
          longitude: location.lng,
          photo,
          location_tag: `SMKN 1 Poco Ranaka - ${format(new Date(), 'HH:mm:ss')}`
        }),
      });
      if (res.ok) {
        alert(`Absen ${type === 'in' ? 'Masuk' : 'Keluar'} Berhasil!`);
        navigate('/');
      }
    } catch (err) {
      alert("Gagal mengirim data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}><X /></Button>
        <h2 className="text-xl font-bold">Absen {type === 'in' ? 'Masuk' : 'Keluar'}</h2>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between px-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-col items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
              step === s ? "bg-red-600 text-white scale-110" : step > s ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"
            )}>
              {step > s ? "✓" : s}
            </div>
            <span className="text-[10px] uppercase font-bold text-gray-400">
              {s === 1 ? "Lokasi" : s === 2 ? "Selfie" : "Kirim"}
            </span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <Card className="p-0 overflow-hidden border-none shadow-xl">
              <div className="h-64 w-full relative">
                {location ? (
                  <MapContainer center={[location.lat, location.lng]} zoom={16} className="h-full w-full z-0">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[location.lat, location.lng]} />
                    {settings && (
                      <Circle 
                        center={[parseFloat(settings.school_lat), parseFloat(settings.school_lng)]} 
                        radius={parseFloat(settings.school_radius)}
                        pathOptions={{ color: isWithinRadius ? '#10b981' : '#ef4444', fillColor: isWithinRadius ? '#10b981' : '#ef4444' }}
                      />
                    )}
                    <MapUpdater center={[location.lat, location.lng]} />
                  </MapContainer>
                ) : (
                  <div className="h-full w-full bg-slate-100 flex items-center justify-center">
                    <p className="text-slate-400 font-bold animate-pulse">Mencari Lokasi...</p>
                  </div>
                )}
              </div>
              <div className="p-6 text-center space-y-2">
                <h3 className="text-lg font-bold">{isWithinRadius ? "Lokasi Sesuai" : "Di Luar Jangkauan"}</h3>
                <p className="text-sm text-gray-500">
                  {distance !== null ? `Jarak Anda: ${distance.toFixed(0)} meter dari sekolah` : "Mencari lokasi..."}
                </p>
              </div>
            </Card>
            <Button 
              onClick={() => setStep(2)} 
              className="w-full py-4" 
              disabled={!isWithinRadius}
            >
              Lanjutkan ke Selfie
            </Button>
            {!isWithinRadius && distance !== null && (
              <p className="text-center text-xs text-red-500 font-medium">Anda harus berada di lingkungan sekolah untuk absen.</p>
            )}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            {!photo ? (
              <>
                <p className="text-gray-500 text-center">Ambil foto selfie untuk verifikasi</p>
                <CameraView onCapture={(p) => { setPhoto(p); setStep(3); }} />
              </>
            ) : (
              <div className="space-y-4">
                <img src={photo} className="w-full rounded-2xl shadow-lg aspect-square object-cover" />
                <Button variant="ghost" onClick={() => setPhoto(null)} className="w-full">Ambil Ulang</Button>
                <Button onClick={() => setStep(3)} className="w-full py-4">Lanjutkan</Button>
              </div>
            )}
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="relative rounded-2xl overflow-hidden shadow-lg">
              <img src={photo!} className="w-full aspect-square object-cover" />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/60 text-white text-[10px] backdrop-blur-sm">
                <p className="font-bold">SMKN 1 POCO RANAKA</p>
                <p>{format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
                <p>{location?.lat.toFixed(6)}, {location?.lng.toFixed(6)}</p>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="bg-emerald-50 border-emerald-100">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-emerald-600" />
                  <div>
                    <p className="text-xs text-emerald-700 font-bold">SIAP DIKIRIM</p>
                    <p className="text-sm text-emerald-600">Data lokasi dan foto sudah tervalidasi.</p>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Button variant="ghost" onClick={() => setStep(2)}>Ulangi Selfie</Button>
                <Button onClick={handleSubmit} className="py-4" disabled={loading}>
                  {loading ? 'Mengirim...' : 'Kumpulkan'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const JournalPage = ({ user }: { user: UserData }) => {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [className, setClassName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/classes').then(r => r.json()).then(setClasses);
    fetch('/api/subjects').then(r => r.json()).then(setSubjects);
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => console.error(err)
    );
  }, []);

  const handleSubmit = async () => {
    if (!content || !photo || !location || !className || !subjectName) {
      alert("Mohon lengkapi semua data jurnal");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          content,
          class_name: className,
          subject_name: subjectName,
          latitude: location.lat,
          longitude: location.lng,
          photo
        }),
      });
      if (res.ok) {
        alert("Jurnal berhasil disimpan!");
        navigate('/');
      }
    } catch (err) {
      alert("Gagal menyimpan jurnal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}><X /></Button>
        <h2 className="text-xl font-bold">Jurnal Harian</h2>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
            <select 
              value={className} 
              onChange={e => setClassName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50"
            >
              <option value="">Pilih Kelas</option>
              {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mata Pelajaran</label>
            <select 
              value={subjectName} 
              onChange={e => setSubjectName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50"
            >
              <option value="">Pilih Mapel</option>
              {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kegiatan Pembelajaran</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 h-32 bg-gray-50/50"
            placeholder="Tuliskan materi atau kegiatan yang diajarkan..."
          />
        </div>

        <label className="block text-sm font-medium text-gray-700">Lokasi Saat Ini</label>
        <Card className="p-0 overflow-hidden border-none shadow-md h-48">
          {location ? (
            <MapContainer center={[location.lat, location.lng]} zoom={16} className="h-full w-full z-0">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[location.lat, location.lng]} />
              <MapUpdater center={[location.lat, location.lng]} />
            </MapContainer>
          ) : (
            <div className="h-full w-full bg-slate-100 flex items-center justify-center">
              <p className="text-slate-400 font-bold animate-pulse text-xs">Mencari Lokasi...</p>
            </div>
          )}
        </Card>

        <label className="block text-sm font-medium text-gray-700">Foto Bukti Mengajar</label>
        {!photo ? (
          <CameraView onCapture={setPhoto} />
        ) : (
          <div className="relative rounded-2xl overflow-hidden shadow-md">
            <img src={photo} className="w-full aspect-video object-cover" />
            <button 
              onClick={() => setPhoto(null)}
              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <Button onClick={handleSubmit} className="w-full py-4" disabled={loading}>
          {loading ? 'Menyimpan...' : 'Simpan Jurnal'}
        </Button>
      </div>
    </div>
  );
};

const PermissionPage = ({ user }: { user: UserData }) => {
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!reason || !startDate || !endDate) return;
    setLoading(true);
    try {
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          reason,
          start_date: startDate,
          end_date: endDate,
          attachment
        }),
      });
      if (res.ok) {
        alert("Permohonan ijin berhasil dikirim!");
        navigate('/');
      }
    } catch (err) {
      alert("Gagal mengirim permohonan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}><X /></Button>
        <h2 className="text-xl font-bold">Ijin / Sakit</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Alasan</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 h-24 bg-gray-50/50"
            placeholder="Contoh: Sakit demam, Keperluan keluarga..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mulai</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sampai</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Lampiran (Foto/PDF)</label>
          <div className="relative">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-100 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 font-medium">
                {fileName ? fileName : "Klik atau seret file ke sini"}
              </p>
              <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-bold">Maksimal 5MB</p>
            </div>
          </div>
          {attachment && attachment.startsWith('data:application/pdf') && (
            <div className="mt-3 p-3 bg-blue-50 rounded-xl flex items-center gap-3 border border-blue-100">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-blue-900 truncate">{fileName}</p>
                <p className="text-[10px] text-blue-600 uppercase font-bold">PDF Document</p>
              </div>
            </div>
          )}
          {attachment && attachment.startsWith('data:image') && (
            <div className="mt-3 relative rounded-xl overflow-hidden shadow-sm border border-gray-200">
              <img src={attachment} className="w-full h-32 object-cover" />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <p className="text-white text-[10px] font-bold uppercase tracking-widest">Preview Gambar</p>
              </div>
            </div>
          )}
        </div>

        <Button onClick={handleSubmit} className="w-full py-4" disabled={loading}>
          {loading ? 'Mengirim...' : 'Kirim Permohonan'}
        </Button>
      </div>
    </div>
  );
};

const AdminRecap = () => {
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [tab, setTab] = useState<'attendance' | 'permission'>('attendance');

  useEffect(() => {
    fetch('/api/admin/recap/attendance').then(r => r.json()).then(setAttendance);
    fetch('/api/admin/recap/permissions').then(r => r.json()).then(setPermissions);
  }, []);

  const handleExport = () => {
    window.open('/api/admin/export/attendance', '_blank');
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}><X /></Button>
          <h2 className="text-xl font-bold">Rekap Data</h2>
        </div>
        <Button onClick={handleExport} variant="secondary" className="px-3 py-2 text-sm">
          <Download className="w-4 h-4" /> Export Excel
        </Button>
      </div>

      <div className="flex bg-gray-100 p-1 rounded-xl">
        <button 
          onClick={() => setTab('attendance')}
          className={cn('flex-1 py-2 text-sm font-medium rounded-lg transition-all', tab === 'attendance' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500')}
        >
          Absensi
        </button>
        <button 
          onClick={() => setTab('permission')}
          className={cn('flex-1 py-2 text-sm font-medium rounded-lg transition-all', tab === 'permission' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500')}
        >
          Ijin
        </button>
      </div>

      <div className="space-y-3">
        {tab === 'attendance' ? (
          attendance.map((item, idx) => (
            <Card key={idx} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-gray-900">{item.full_name}</p>
                  <p className="text-xs text-gray-500">{format(new Date(item.timestamp), 'dd MMM yyyy, HH:mm')}</p>
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {item.location_tag}
                  </p>
                </div>
                <span className={cn('px-2 py-1 rounded-full text-[10px] font-bold uppercase', item.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                  {item.type === 'in' ? 'Masuk' : 'Keluar'}
                </span>
              </div>
            </Card>
          ))
        ) : (
          permissions.map((item, idx) => (
            <Card key={idx} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-gray-900">{item.full_name}</p>
                  <p className="text-sm text-gray-600">{item.reason}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(item.start_date), 'dd MMM')} - {format(new Date(item.end_date), 'dd MMM yyyy')}
                  </p>
                  {item.attachment && (
                    <button 
                      onClick={() => {
                        if (item.attachment.startsWith('data:application/pdf')) {
                          const link = document.createElement('a');
                          link.href = item.attachment;
                          link.download = `lampiran_${item.full_name}.pdf`;
                          link.click();
                        } else {
                          window.open(item.attachment, '_blank');
                        }
                      }}
                      className="mt-2 flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700"
                    >
                      <Paperclip className="w-3 h-3" /> Lihat Lampiran
                    </button>
                  )}
                </div>
                <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">
                  {item.status}
                </span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', full_name: '', role: 'Guru' });

  const fetchUsers = () => fetch('/api/admin/users').then(r => r.json()).then(setUsers);
  useEffect(() => { fetchUsers(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      setShowAdd(false);
      setFormData({ username: '', password: '', full_name: '', role: 'Guru' });
      fetchUsers();
    } else {
      const data = await res.json();
      alert(data.message);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}><X /></Button>
          <h2 className="text-xl font-bold">Kelola Pengguna</h2>
        </div>
        <Button onClick={() => setShowAdd(true)} variant="primary" className="p-2 rounded-full">
          <Plus />
        </Button>
      </div>

      <div className="space-y-3">
        {users.map((u, idx) => (
          <Card key={idx} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="text-gray-500 w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900">{u.full_name}</p>
                <p className="text-xs text-gray-500">@{u.username} • {u.role}</p>
              </div>
            </div>
            <ChevronRight className="text-gray-300" />
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Tambah Pengguna</h3>
                <button onClick={() => setShowAdd(false)}><X /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <Input placeholder="Nama Lengkap" value={formData.full_name || ''} onChange={e => setFormData({...formData, full_name: e.target.value})} required />
                <Input placeholder="Username" value={formData.username || ''} onChange={e => setFormData({...formData, username: e.target.value})} required />
                <Input placeholder="Password" type="password" value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} required />
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50"
                  value={formData.role || 'Guru'}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  <option value="Guru">Guru</option>
                  <option value="Pegawai">Pegawai</option>
                  <option value="Admin">Admin</option>
                </select>
                <Button type="submit" className="w-full py-4">Simpan Pengguna</Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LocationPicker = ({ lat, lng, onPick }: { lat: number; lng: number; onPick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return <Marker position={[lat, lng]} />;
};

const AdminSettings = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ school_lat: '', school_lng: '', school_radius: '', start_time: '', end_time: '' });
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [newClass, setNewClass] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = () => {
    fetch('/api/settings').then(r => r.json()).then(data => setFormData(prev => ({ ...prev, ...data })));
    fetch('/api/classes').then(r => r.json()).then(setClasses);
    fetch('/api/subjects').then(r => r.json()).then(setSubjects);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (res.ok) alert("Pengaturan berhasil disimpan!");
    setLoading(false);
  };

  const addClass = async () => {
    if (!newClass) return;
    await fetch('/api/admin/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClass }),
    });
    setNewClass('');
    fetchData();
  };

  const addSubject = async () => {
    if (!newSubject) return;
    await fetch('/api/admin/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSubject }),
    });
    setNewSubject('');
    fetchData();
  };

  const deleteItem = async (type: 'classes' | 'subjects', id: number) => {
    await fetch(`/api/admin/${type}/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      setFormData({
        ...formData,
        school_lat: pos.coords.latitude.toString(),
        school_lng: pos.coords.longitude.toString()
      });
    });
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}><X /></Button>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Pengaturan Sekolah</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="p-0 overflow-hidden border-none shadow-xl">
              <div className="h-80 w-full relative">
                <MapContainer center={[parseFloat(formData.school_lat) || -8.5833, parseFloat(formData.school_lng) || 120.4667]} zoom={15} className="h-full w-full z-0">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationPicker 
                    lat={parseFloat(formData.school_lat) || -8.5833} 
                    lng={parseFloat(formData.school_lng) || 120.4667} 
                    onPick={(lat, lng) => setFormData({ ...formData, school_lat: lat.toString(), school_lng: lng.toString() })} 
                  />
                  <Circle 
                    center={[parseFloat(formData.school_lat) || -8.5833, parseFloat(formData.school_lng) || 120.4667]} 
                    radius={parseFloat(formData.school_radius) || 100}
                    pathOptions={{ color: '#e11d48', fillColor: '#e11d48' }}
                  />
                  <MapUpdater center={[parseFloat(formData.school_lat) || -8.5833, parseFloat(formData.school_lng) || 120.4667]} />
                </MapContainer>
                <div className="absolute top-4 right-4 z-10">
                  <Button type="button" variant="secondary" onClick={getCurrentLocation} className="text-xs py-2 px-4 shadow-xl">
                    <MapPin className="w-4 h-4" /> Gunakan Lokasi Saya
                  </Button>
                </div>
                <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/90 backdrop-blur-md p-3 rounded-xl border border-white/20 shadow-lg">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Petunjuk</p>
                  <p className="text-xs text-slate-700">Klik pada peta untuk memindahkan titik lokasi sekolah.</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Latitude</label>
                    <Input value={formData.school_lat || ''} onChange={e => setFormData({...formData, school_lat: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Longitude</label>
                    <Input value={formData.school_lng || ''} onChange={e => setFormData({...formData, school_lng: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Radius Toleransi (Meter)</label>
                  <Input type="number" value={formData.school_radius || ''} onChange={e => setFormData({...formData, school_radius: e.target.value})} />
                </div>
              </div>
            </Card>

            <Card className="space-y-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock className="text-rose-500" /> Jam Operasional
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jam Masuk</label>
                  <Input type="time" value={formData.start_time || ''} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jam Pulang</label>
                  <Input type="time" value={formData.end_time || ''} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                </div>
              </div>
            </Card>

            <Button type="submit" className="w-full py-4" disabled={loading}>Simpan Semua Pengaturan</Button>
          </form>
        </div>

        <div className="space-y-8">
          <Card className="space-y-6">
            <h3 className="font-bold text-slate-800">Kelola Kelas</h3>
            <div className="flex gap-2">
              <Input placeholder="Nama Kelas Baru" value={newClass} onChange={e => setNewClass(e.target.value)} />
              <Button onClick={addClass} variant="secondary">Tambah</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {classes.map(c => (
                <div key={c.id} className="bg-slate-50 border border-slate-100 px-3 py-1 rounded-full flex items-center gap-2 text-sm font-medium">
                  {c.name}
                  <button onClick={() => deleteItem('classes', c.id)} className="text-rose-500 hover:scale-110 transition-transform"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-6">
            <h3 className="font-bold text-slate-800">Kelola Mata Pelajaran</h3>
            <div className="flex gap-2">
              <Input placeholder="Nama Mapel Baru" value={newSubject} onChange={e => setNewSubject(e.target.value)} />
              <Button onClick={addSubject} variant="secondary">Tambah</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => (
                <div key={s.id} className="bg-slate-50 border border-slate-100 px-3 py-1 rounded-full flex items-center gap-2 text-sm font-medium">
                  {s.name}
                  <button onClick={() => deleteItem('subjects', s.id)} className="text-rose-500 hover:scale-110 transition-transform"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<UserData | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData: UserData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row relative">
        {/* Sidebar for Desktop */}
        <aside className="hidden md:flex w-72 bg-slate-900 text-white flex-col sticky top-0 h-screen p-6 z-50">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 p-2 bg-white rounded-xl flex items-center justify-center overflow-hidden">
              <img 
                src={LOGO_URL} 
                alt="Logo" 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/2991/2991148.png";
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-white text-sm leading-none">SMKN 1</span>
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Poco Ranaka</span>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            <Link to="/" className="flex items-center gap-3 p-4 rounded-2xl hover:bg-white/10 transition-all font-bold text-sm">
              <Clock className="w-5 h-5 text-rose-500" /> Dashboard
            </Link>
            <Link to="/journal" className="flex items-center gap-3 p-4 rounded-2xl hover:bg-white/10 transition-all font-bold text-sm">
              <FileText className="w-5 h-5 text-emerald-500" /> Jurnal Harian
            </Link>
            <Link to="/permission" className="flex items-center gap-3 p-4 rounded-2xl hover:bg-white/10 transition-all font-bold text-sm">
              <Calendar className="w-5 h-5 text-amber-500" /> Ijin / Sakit
            </Link>
            
            {user.role === 'Admin' && (
              <div className="pt-6 mt-6 border-t border-white/10 space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">Admin Panel</p>
                <Link to="/admin/users" className="flex items-center gap-3 p-4 rounded-2xl hover:bg-white/10 transition-all font-bold text-sm">
                  <Users className="w-5 h-5 text-purple-500" /> Kelola User
                </Link>
                <Link to="/admin/recap" className="flex items-center gap-3 p-4 rounded-2xl hover:bg-white/10 transition-all font-bold text-sm">
                  <Download className="w-5 h-5 text-blue-500" /> Rekap Data
                </Link>
                <Link to="/admin/settings" className="flex items-center gap-3 p-4 rounded-2xl hover:bg-white/10 transition-all font-bold text-sm">
                  <MapPin className="w-5 h-5 text-orange-500" /> Pengaturan
                </Link>
              </div>
            )}
          </nav>

          <button onClick={handleLogout} className="mt-auto flex items-center gap-3 p-4 rounded-2xl hover:bg-rose-500/10 text-rose-400 hover:text-rose-500 transition-all font-bold text-sm">
            <LogOut className="w-5 h-5" /> Keluar
          </button>
        </aside>

        {/* Mobile Header */}
        <nav className="md:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 p-2 bg-rose-50 rounded-xl flex items-center justify-center overflow-hidden">
              <img 
                src={LOGO_URL} 
                alt="Logo" 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/2991/2991148.png";
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-slate-900 text-sm leading-none">SMKN 1</span>
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Poco Ranaka</span>
            </div>
          </div>
          <button onClick={handleLogout} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all active:scale-90">
            <LogOut className="w-5 h-5" />
          </button>
        </nav>

        <main className="flex-1 max-w-5xl mx-auto w-full p-0 md:p-8 pb-28 md:pb-8">
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/attendance/in" element={<AttendancePage user={user} type="in" />} />
            <Route path="/attendance/out" element={<AttendancePage user={user} type="out" />} />
            <Route path="/journal" element={<JournalPage user={user} />} />
            <Route path="/permission" element={<PermissionPage user={user} />} />
            
            {/* Admin Routes */}
            {user.role === 'Admin' && (
              <>
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/recap" element={<AdminRecap />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
              </>
            )}
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        {/* Mobile Bottom Nav */}
        <footer className="md:hidden fixed bottom-6 left-6 right-6 bg-slate-900/95 backdrop-blur-xl rounded-[2rem] p-3 flex justify-around items-center z-40 bottom-nav-shadow border border-white/10">
          <Link to="/" className="p-4 text-slate-400 hover:text-white transition-all flex flex-col items-center gap-1 group">
            <Clock className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Home</span>
          </Link>
          <Link to="/journal" className="p-4 text-slate-400 hover:text-white transition-all flex flex-col items-center gap-1 group">
            <FileText className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Jurnal</span>
          </Link>
          <Link to="/permission" className="p-4 text-slate-400 hover:text-white transition-all flex flex-col items-center gap-1 group">
            <Calendar className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Ijin</span>
          </Link>
        </footer>
      </div>
    </BrowserRouter>
  );
}
