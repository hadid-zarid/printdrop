import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Printer, CloudLightning, QrCode, ShieldCheck, Files, ChevronRight } from 'lucide-react'

export function LandingPage() {
  const features = [
    {
      icon: <CloudLightning size={24} />,
      title: 'Sinkronisasi Realtime',
      description: 'Antrean masuk secara instan ke dashboard tanpa perlu refresh halaman.',
    },
    {
      icon: <QrCode size={24} />,
      title: 'QR Code Otomatis',
      description: 'Dapatkan link dan QR khusus pelanggan untuk setiap printer Anda.',
    },
    {
      icon: <Files size={24} />,
      title: 'Multi-file Upload',
      description: 'Pelanggan bisa mengirim puluhan dokumen sekaligus dengan 1x klik.',
    },
    {
      icon: <ShieldCheck size={24} />,
      title: 'Aman & Terkendali',
      description: 'Matikan penerimaan file kapan saja, dan lindungi printer Anda dengan PIN.',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      {/* Background Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-600/20">
            <Printer size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">PrintDrop</span>
        </div>
        <div>
          <Link to="/login" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors px-5 py-2.5 rounded-xl hover:bg-indigo-50">
            Masuk / Login
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block py-1.5 px-4 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold tracking-wide uppercase mb-6 border border-indigo-200">
              Sistem Fotocopy Modern 2.0
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-8">
              Manajemen Antrean Cetak <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">Berbasis Cloud</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              PrintDrop mempermudah pelanggan Anda mengirim file dokumen dari HP mereka, dan mempermudah Anda mengelolanya dari satu Dashboard cerdas.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 group">
              Mulai Sekarang
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* Features Section */}
        <div className="mt-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Kenapa Memilih PrintDrop?</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Dirancang khusus untuk mempercepat alur kerja di tempat percetakan dan fotocopy.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-white/80 backdrop-blur-lg border border-slate-200 rounded-3xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-white/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 sm:mb-0">
            <Printer size={20} className="text-indigo-600" />
            <span className="font-bold text-slate-900">PrintDrop</span>
          </div>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} PrintDrop. Dibuat dengan 💙 untuk UMKM.
          </p>
        </div>
      </footer>
    </div>
  )
}
