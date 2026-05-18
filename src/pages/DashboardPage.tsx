import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Power, Eye, Check, X, LogOut, Printer, RefreshCw, FileText, Copy, MapPin, Trash2, ShieldAlert } from 'lucide-react'

function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime) // A5 note
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1)
    
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch (e) {
    console.error('Audio play failed', e)
  }
}

type Device = {
  id: string
  public_key: string
  name: string
  location: string | null
  status: string
  is_accepting_jobs: boolean
}

type PrintJob = {
  id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  copies: number
  paper_size: string
  color_mode: string
  status: string
  created_at: string
}

export function DashboardPage() {
  const [device, setDevice] = useState<Device | null>(null)
  const [jobs, setJobs] = useState<PrintJob[]>([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(20)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  async function fetchDevice() {
    const { data: deviceData, error: deviceError } = await supabase
      .from('devices')
      .select('*')
      .limit(1)
      .single()

    if (deviceError) {
      console.error(deviceError)
      toast.error('Gagal memuat data perangkat')
      return null
    }

    setDevice(deviceData)
    return deviceData
  }

  async function fetchJobs(deviceId: string, currentLimit: number) {
    const { data: jobData, error: jobError, count } = await supabase
      .from('print_jobs')
      .select('*', { count: 'exact' })
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(currentLimit)

    if (jobError) {
      console.error(jobError)
      toast.error('Gagal memuat antrean')
    } else {
      setJobs(jobData ?? [])
      setHasMore((count ?? 0) > currentLimit)
    }
  }

  async function loadDashboard() {
    setLoading(true)
    const currentDevice = await fetchDevice()
    if (currentDevice) {
      await fetchJobs(currentDevice.id, limit)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!device) return

    const channel = supabase
      .channel('print-jobs-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'print_jobs',
          filter: `device_id=eq.${device.id}`,
        },
        (payload) => {
          // Jika ada file baru masuk, bunyikan suara
          if (payload.eventType === 'INSERT') {
            playNotificationSound()
          }
          // Hanya me-refresh jobs, tidak seluruh dashboard
          fetchJobs(device.id, limit)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device?.id, limit])

  async function handleLoadMore() {
    if (!device) return
    setLoadingMore(true)
    const newLimit = limit + 20
    setLimit(newLimit)
    await fetchJobs(device.id, newLimit)
    setLoadingMore(false)
  }

  async function handleOpenFile(job: PrintJob) {
    // Membuka tab kosong dulu untuk mencegah popup blocker
    const newWindow = window.open('about:blank', '_blank')
    if (!newWindow) {
      toast.error('Tab diblokir oleh browser. Tolong izinkan pop-up.')
      return
    }

    toast.loading('Membuka file...', { id: 'open-file' })

    const { data, error } = await supabase.storage
      .from('print-files')
      .createSignedUrl(job.file_path, 60)

    if (error) {
      newWindow.close()
      toast.error(error.message, { id: 'open-file' })
      return
    }

    toast.success('Berhasil', { id: 'open-file' })
    newWindow.location.href = data.signedUrl
  }

  async function updateJobStatus(jobId: string, status: string) {
    const { error } = await supabase
      .from('print_jobs')
      .update({ status })
      .eq('id', jobId)

    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`Status diubah menjadi ${status}`)
    if (device) fetchJobs(device.id, limit)
  }

  async function deleteJob(job: PrintJob) {
    if (!confirm('Apakah Anda yakin ingin menghapus file antrean ini? File akan dihapus permanen.')) return

    const toastId = toast.loading('Menghapus file...')
    
    // Hapus file dari bucket (storage) terlebih dahulu
    const { error: storageError } = await supabase.storage
      .from('print-files')
      .remove([job.file_path])

    if (storageError) {
      toast.error('Gagal menghapus file dari server: ' + storageError.message, { id: toastId })
      // Tetap lanjutkan untuk hapus dari database jika misal file sudah tidak ada di storage
    }

    // Hapus dari tabel print_jobs
    const { error: dbError } = await supabase
      .from('print_jobs')
      .delete()
      .eq('id', job.id)

    if (dbError) {
      toast.error('Gagal menghapus data antrean: ' + dbError.message, { id: toastId })
      return
    }

    toast.success('File berhasil dihapus', { id: toastId })
    if (device) fetchJobs(device.id, limit)
  }

  async function clearAllJobs() {
    if (!device) return
    if (!confirm('AWAS! Anda akan menghapus SEMUA riwayat antrean dan file fisik hari ini. Lanjutkan?')) return

    const toastId = toast.loading('Mengosongkan antrean...')

    // 1. Dapatkan semua file path dari tabel
    const { data: allJobs } = await supabase
      .from('print_jobs')
      .select('id, file_path')
      .eq('device_id', device.id)

    if (allJobs && allJobs.length > 0) {
      const filePaths = allJobs.map((j) => j.file_path)
      
      // 2. Hapus fisik file di storage
      const { error: storageError } = await supabase.storage.from('print-files').remove(filePaths)
      if (storageError) {
         toast.error('Gagal menghapus file storage: ' + storageError.message, { id: toastId })
         return
      }

      // 3. Hapus data di tabel
      const { error: dbError } = await supabase
        .from('print_jobs')
        .delete()
        .eq('device_id', device.id)

      if (dbError) {
         toast.error('Gagal menghapus data antrean: ' + dbError.message, { id: toastId })
         return
      }
    }

    toast.success('Semua antrean berhasil dibersihkan!', { id: toastId })
    fetchJobs(device.id, limit)
  }

  async function toggleDeviceStatus() {
    if (!device) return
    const newStatus = !device.is_accepting_jobs
    
    const { error } = await supabase
      .from('devices')
      .update({ is_accepting_jobs: newStatus })
      .eq('id', device.id)

    if (error) {
      toast.error(error.message)
      return
    }

    setDevice({ ...device, is_accepting_jobs: newStatus })
    toast.success(newStatus ? 'Printer sekarang Aktif' : 'Printer dinonaktifkan')
  }

  async function logout() {
    await supabase.auth.signOut()
    // Redirect ditangani otomatis oleh ProtectedRoute
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-slate-500 font-medium text-sm animate-pulse">Memuat dashboard...</p>
        </div>
      </div>
    )
  }

  if (!device) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Printer className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Perangkat Belum Tersedia</h2>
        <p className="text-slate-500 max-w-sm mt-2">
          Perangkat belum ditemukan di akun ini. Pastikan Anda sudah menambahkan perangkat di Supabase.
        </p>
      </div>
    )
  }

  const uploadUrl = `${window.location.origin}/send/d/${device.public_key}`

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <Printer size={20} />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">PrintDrop</h1>
                <p className="text-xs text-slate-500 font-medium">Operator Dashboard</p>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors bg-slate-100 hover:bg-red-50 px-3 py-1.5 rounded-lg"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Device Info & Status Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              {device.name}
            </h2>
            {device.location && (
              <p className="text-slate-500 text-sm flex items-center gap-1.5 mt-1">
                <MapPin size={14} /> {device.location}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
            <div className={`w-2.5 h-2.5 rounded-full ${device.is_accepting_jobs ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">
              {device.is_accepting_jobs ? 'Menerima File' : 'Berhenti Menerima'}
            </span>
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <button 
              onClick={toggleDeviceStatus}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition-all ${
                device.is_accepting_jobs 
                  ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              <Power size={12} />
              {device.is_accepting_jobs ? 'Matikan' : 'Nyalakan'}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[340px_1fr] gap-8">
          
          {/* Left Column: QR & Link */}
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 text-center bg-gradient-to-b from-indigo-50/50 to-white">
                <h3 className="font-bold text-slate-900 flex items-center justify-center gap-2 mb-1">
                  QR Code Upload
                </h3>
                <p className="text-xs text-slate-500">Scan untuk mengirim file ke printer ini</p>
              </div>
              
              <div className="p-8 flex flex-col items-center">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 ring-4 ring-slate-50">
                  <QRCodeSVG value={uploadUrl} size={200} />
                </div>
                
                <div className="w-full mt-6">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block px-1">Link Publik</label>
                  <div className="flex gap-2">
                    <input 
                      readOnly 
                      value={uploadUrl} 
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none text-slate-600"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(uploadUrl)
                        toast.success('Link disalin!')
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg transition-colors"
                      title="Salin Link"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Queue */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full min-h-[500px]"
          >
            <div className="px-6 py-5 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Antrean File</h3>
                <p className="text-xs text-slate-500 mt-1">Daftar file yang siap dicetak</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearAllJobs}
                  className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Kosongkan Semua"
                >
                  <ShieldAlert size={14} /> Kosongkan
                </button>
                <div className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold">
                  {jobs.length} File
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium">Informasi File</th>
                    <th className="px-6 py-4 font-medium">Pengaturan</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                    {jobs.map((job) => (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        key={job.id} 
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 text-indigo-500 bg-indigo-50 p-2 rounded-lg">
                              <FileText size={18} />
                            </div>
                            <div className="overflow-hidden">
                              <p className="font-medium text-slate-900 truncate max-w-[200px]" title={job.file_name}>
                                {job.file_name}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {(job.file_size / 1024 / 1024).toFixed(2)} MB • {new Date(job.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 text-xs">
                            <span className="inline-flex font-medium text-slate-700">
                              {job.copies}x Copy
                            </span>
                            <span className="text-slate-500">
                              {job.paper_size} • {job.color_mode === 'color' ? 'Warna' : 'B/W'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            job.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            job.status === 'done' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleOpenFile(job)}
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors tooltip-trigger"
                              title="Buka File"
                            >
                              <Eye size={18} />
                            </button>
                            
                            {job.status !== 'done' && (
                              <button
                                onClick={() => updateJobStatus(job.id, 'done')}
                                className="p-1.5 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Tandai Selesai"
                              >
                                <Check size={18} />
                              </button>
                            )}

                            {job.status !== 'failed' && (
                              <button
                                onClick={() => updateJobStatus(job.id, 'failed')}
                                className="p-1.5 text-slate-600 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                                title="Tandai Gagal"
                              >
                                <X size={18} />
                              </button>
                            )}

                            <div className="w-px h-5 bg-slate-200 mx-1"></div>

                            <button
                              onClick={() => deleteJob(job)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus Permanen"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>

                  {jobs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                          <FileText className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium">Belum ada file dalam antrean.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="p-4 border-t border-slate-100 text-center bg-slate-50/50">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 bg-white border border-indigo-100 hover:border-indigo-200 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50"
                >
                  {loadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}