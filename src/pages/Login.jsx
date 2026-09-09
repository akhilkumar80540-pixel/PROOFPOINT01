import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Loader2, 
  Sparkles,
  QrCode,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import Logo from '../components/Logo';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      sessionStorage.setItem('justLoggedIn', 'true');
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      sessionStorage.setItem('justLoggedIn', 'true');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#070709] text-slate-100 flex flex-col lg:flex-row items-center justify-between p-6 lg:p-12 xl:p-16 overflow-hidden selection:bg-orange-500 selection:text-white">
      
      {/* Dynamic 3D Glass Orbs in Background */}
      <div className="absolute top-1/4 -left-20 w-[450px] h-[450px] bg-orange-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#f9731608_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* LEFT SECTION: 3D Boy Scanning Visual Stage */}
      <div className="relative hidden lg:flex lg:w-[48%] flex-col justify-between h-full min-h-[640px] z-10">
        
        {/* Top Branding */}
        <div>
          <Logo size="large" />
        </div>

        {/* Character Visual */}
        <div className="my-auto flex flex-col items-center">
          <div className="relative w-88 h-96 flex items-center justify-center">
            
            {/* Holographic Glowing Base Pod */}
            <div className="absolute bottom-4 w-64 h-12 bg-orange-500/25 rounded-[100%] blur-xl" />
            <div className="absolute bottom-6 w-52 h-8 border border-orange-500/50 rounded-[100%] animate-pulse" />
            <div className="absolute bottom-7 w-40 h-5 border-2 border-orange-400/80 rounded-[100%]" />

            {/* 3D Stylized Pixar Avatar SVG */}
            <svg
              className="relative w-76 h-96 drop-shadow-[0_20px_35px_rgba(249,115,22,0.3)]"
              viewBox="0 0 280 340"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#c2410c" />
                </linearGradient>
                <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fed7aa" />
                  <stop offset="100%" stopColor="#fb923c" />
                </linearGradient>
                <linearGradient id="hoodieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#374151" />
                  <stop offset="50%" stopColor="#1f2937" />
                  <stop offset="100%" stopColor="#111827" />
                </linearGradient>
                <linearGradient id="scanBeamGrad" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#ffedd5" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#fb923c" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#ea580c" stopOpacity="0.1" />
                </linearGradient>
              </defs>

              {/* Red/Orange Cap */}
              <ellipse cx="140" cy="46" rx="46" ry="24" fill="url(#capGrad)" />
              <path d="M102 46 C115 28 175 28 188 46 C196 54 186 60 144 60 C106 60 94 54 102 46 Z" fill="#ea580c" />
              <path d="M128 20 Q140 16 152 20" stroke="#ffedd5" strokeWidth="2" strokeLinecap="round" />

              {/* Hair */}
              <path d="M102 52 C96 66 100 78 106 82 C108 72 116 66 122 62 Z" fill="#18181b" />
              <path d="M174 52 C182 66 178 78 172 82 C170 72 164 66 158 62 Z" fill="#18181b" />
              <path d="M116 54 C132 58 148 58 164 54 C168 62 152 64 140 64 C128 64 114 62 116 54 Z" fill="#18181b" />

              {/* Face */}
              <path d="M106 60 C106 95 120 108 140 108 C160 108 174 95 174 60 Z" fill="url(#skinGrad)" />

              {/* Glasses */}
              <rect x="110" y="66" width="24" height="18" rx="6" fill="#09090b" fillOpacity="0.2" stroke="#09090b" strokeWidth="3.5" />
              <rect x="146" y="66" width="24" height="18" rx="6" fill="#09090b" fillOpacity="0.2" stroke="#09090b" strokeWidth="3.5" />
              <line x1="134" y1="74" x2="146" y2="74" stroke="#09090b" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="114" y1="70" x2="122" y2="78" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
              <line x1="150" y1="70" x2="158" y2="78" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />

              {/* Eyes */}
              <ellipse cx="122" cy="75" rx="5" ry="6" fill="#09090b" />
              <circle cx="124" cy="73" r="2" fill="#ffffff" />
              <ellipse cx="158" cy="75" rx="5" ry="6" fill="#09090b" />
              <circle cx="160" cy="73" r="2" fill="#ffffff" />

              {/* Smile */}
              <path d="M133 94 Q140 100 147 94" stroke="#7c2d12" strokeWidth="2.5" strokeLinecap="round" fill="none" />

              {/* Hoodie */}
              <path d="M112 114 C122 108 158 108 168 114 L186 195 C160 205 120 205 94 195 L112 114 Z" fill="url(#hoodieGrad)" stroke="#f97316" strokeWidth="1.2" strokeOpacity="0.4" />
              <line x1="134" y1="116" x2="132" y2="146" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="146" y1="116" x2="148" y2="146" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />

              {/* Proof Badge on Chest */}
              <rect x="150" y="132" width="18" height="10" rx="3" fill="#f97316" />
              <text x="153" y="140" fill="#ffffff" fontSize="7" fontWeight="bold" fontFamily="monospace">PP</text>

              {/* Left Hand */}
              <path d="M106 122 L88 170 L98 184" stroke="#1f2937" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M106 122 L88 170 L98 184" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

              {/* Right Arm with Phone */}
              <path d="M174 122 L206 160 L195 180" stroke="#1f2937" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="195" cy="180" r="8" fill="url(#skinGrad)" />
              <rect x="190" y="156" width="18" height="32" rx="4" fill="#09090b" stroke="#f97316" strokeWidth="1.5" />
              <rect x="193" y="160" width="12" height="24" rx="2" fill="#ffedd5" />

              {/* Holographic Laser Beam */}
              <polygon points="208,168 265,135 268,215" fill="url(#scanBeamGrad)" />
              <line x1="208" y1="172" x2="265" y2="138" stroke="#fb923c" strokeWidth="1.5" strokeDasharray="3 2" />
              <line x1="208" y1="174" x2="268" y2="212" stroke="#fb923c" strokeWidth="1.5" strokeDasharray="3 2" />

              {/* Dynamic QR Target */}
              <g transform="translate(244, 150) rotate(-6)">
                <rect x="0" y="0" width="34" height="34" rx="6" fill="#09090c" stroke="#f97316" strokeWidth="2" className="animate-pulse" />
                <rect x="4" y="4" width="8" height="8" fill="#f97316" />
                <rect x="22" y="4" width="8" height="8" fill="#f97316" />
                <rect x="4" y="22" width="8" height="8" fill="#f97316" />
                <rect x="15" y="6" width="3" height="3" fill="#fb923c" />
                <rect x="15" y="14" width="4" height="4" fill="#fb923c" />
                <rect x="7" y="15" width="3" height="3" fill="#fb923c" />
                <rect x="22" y="16" width="4" height="4" fill="#fb923c" />
                <rect x="16" y="24" width="6" height="3" fill="#fb923c" />
              </g>

              {/* Pants & Shoes */}
              <path d="M112 195 L102 275 L126 275 L136 210 L146 275 L170 275 L164 195 Z" fill="#111827" stroke="#1f2937" strokeWidth="2" />
              <path d="M96 275 L126 275 L130 286 L90 286 Z" fill="#f97316" />
              <path d="M90 286 L130 286 L130 290 L90 290 Z" fill="#ffffff" />
              <path d="M146 275 L176 275 L180 286 L140 286 Z" fill="#f97316" />
              <path d="M140 286 L180 286 L180 290 L140 290 Z" fill="#ffffff" />
            </svg>

            {/* Live QR Tag */}
            <div className="absolute top-6 right-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/40 backdrop-blur-md flex items-center gap-2 shadow-lg shadow-orange-500/20">
              <QrCode className="w-3.5 h-3.5 text-orange-400 animate-spin" />
              <span className="text-[11px] font-mono font-bold text-orange-300 uppercase tracking-wide">Live QR Authenticated</span>
            </div>
          </div>

          {/* Punchy Tagline */}
          <div className="mt-8 text-center max-w-sm">
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              “Are  You  There. <span className="text-orange-500">Prove It.</span>”
            </h1>
            <p className="mt-2 text-xs text-slate-400 font-medium tracking-wide">
              Next-Gen Aryptographic Attendance &amp; verification.
            </p>
          </div>
        </div>

        {/* Cleaned-up Minimal Bottom Bar */}
        <div className="flex items-center justify-between pt-6 border-t border-white/5 text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-2 text-orange-400">
            <CheckCircle2 className="w-4 h-4" /> Zero Spoofing Guaranteed
          </span>
          <span className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-500/70" /> Decentralized &amp; Encrypted
          </span>
        </div>
      </div>

      {/* RIGHT SECTION: Expanded Width Glassmorphism Card */}
      <div className="w-full lg:w-[490px] z-10 flex items-center justify-center">
        <div className="w-full relative rounded-3xl bg-white/[0.035] backdrop-blur-2xl border border-white/10 p-8 sm:p-11 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] transition-all">
          
          {/* Subtle Orange Light Flare Inside Card */}
          <div className="absolute top-0 right-1/4 w-36 h-36 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header with Interesting Emoji */}
          <div className="mb-7 relative z-10">
            <div className="lg:hidden mb-6">
              <Logo size="default" />
            </div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {isLogin ? 'Welcome Back' : 'Get Started'}
              </h2>
              <span className="text-2xl animate-bounce">
                {isLogin ? '👋' : '🚀'}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              {isLogin 
                ? 'Create, verify, and prove attendance with confidence' 
                : 'Create your credentials to launch verifiable events.'}
            </p>
          </div>

          {/* Glass Tab Switcher */}
          <div className="grid grid-cols-2 p-1.5 bg-black/40 rounded-2xl border border-white/10 mb-6 relative z-10">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`py-2.5 text-xs font-semibold rounded-xl transition-all ${
                isLogin 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`py-2.5 text-xs font-semibold rounded-xl transition-all ${
                !isLogin 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Google One-Tap Glass Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full relative z-10 flex items-center justify-center gap-3 py-3 px-4 bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.99] border border-white/10 rounded-2xl text-xs font-medium text-slate-200 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <span className="relative px-3 bg-[#0d0d12]/90 backdrop-blur-md text-[10px] uppercase font-mono tracking-wider text-slate-500">
              or credentials
            </span>
          </div>

          {/* Form with Glow Input Focus */}
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-orange-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 z-10" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="organizer@proofpoint.io"
                  className="w-full pl-10 pr-4 py-3 bg-white/[0.04] text-slate-100 placeholder-slate-500 border border-white/10 rounded-2xl text-xs transition-all duration-300 outline-none focus:bg-white/[0.08] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 focus:shadow-[0_0_25px_-5px_rgba(249,115,22,0.4)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative group">
                <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-orange-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 z-10" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-white/[0.04] text-slate-100 placeholder-slate-500 border border-white/10 rounded-2xl text-xs transition-all duration-300 outline-none focus:bg-white/[0.08] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 focus:shadow-[0_0_25px_-5px_rgba(249,115,22,0.4)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-400 transition-colors z-10"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.99] text-white text-xs font-semibold rounded-2xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Enter Console' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Footnote */}
          <div className="mt-8 text-center relative z-10">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
              <Sparkles className="w-3 h-3 text-orange-400" />
              Protected by ProofPoint Protocol
            </span>
          </div>

        </div>
      </div>

    </div>
  );
}