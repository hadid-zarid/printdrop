import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Loader2, Lock, Mail, Printer, Store, MonitorSmartphone } from 'lucide-react'

export function RegisterPage() {
  const navigate = useNavigate()

  const [storeName, setStoreName] = useState('')
  const [deviceName, setDeviceName] = useState('PC Kasir 1')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault()

    if (!storeName || !deviceName || !email || !password) {
      toast.error('Mohon lengkapi semua data')
      return
    }

    setLoading(true)

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) throw signUpError

      if (!signUpData.session) {
        toast.success('Akun berhasil dibuat. Silakan cek email untuk verifikasi, lalu login.', { duration: 6000 })
        navigate('/login')
        return
      }

      // Memasukkan data perangkat pertama setelah daftar
      const { error: deviceError } = await supabase.from('devices').insert({
        name: deviceName,
        location: storeName,
        status: 'online',
        is_accepting_jobs: true,
      })

      if (deviceError) throw deviceError

      toast.success('Pendaftaran berhasil! Selamat datang di PrintDrop.')
      navigate('/dashboard')
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Gagal membuat akun.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 relative z-10 my-8"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-600/30">
            <Printer size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Daftar Akun Baru</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">
            Buat akun untuk toko Anda dan mulai terima cetak dokumen.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Toko</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Store size={16} />
                </div>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white/50 pl-9 pr-3 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white"
                  value={storeName}
                  onChange={(event) => setStoreName(event.target.value)}
                  placeholder="Cth: Print Jaya"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Printer/PC</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MonitorSmartphone size={16} />
                </div>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white/50 pl-9 pr-3 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white"
                  value={deviceName}
                  onChange={(event) => setDeviceName(event.target.value)}
                  placeholder="Cth: PC Kasir 1"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Pendaftaran</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail size={18} />
              </div>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white/50 pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nama@tokoprint.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Buat Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white/50 pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimal 6 karakter"
                minLength={6}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-3 font-medium text-sm transition-all shadow-md shadow-indigo-600/20 disabled:opacity-70 flex justify-center items-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Mendaftar...
              </>
            ) : (
              'Daftar Sekarang'
            )}
          </button>
        </form>

        <p className="text-sm text-slate-500 mt-6 text-center">
          Sudah punya akun?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Masuk di sini
          </Link>
        </p>
      </motion.div>
    </div>
  )
}