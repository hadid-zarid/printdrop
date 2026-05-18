import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Printer, UploadCloud, File, AlertCircle, CheckCircle2, ChevronRight, Hash, X, Files } from 'lucide-react'

type PublicDevice = {
  id: string
  public_key: string
  name: string
  location: string | null
  is_accepting_jobs: boolean
  pin_enabled: boolean
  max_file_size_mb: number
  accepted_mime_types: string[]
  default_paper_size: string
  default_color_mode: string
}

export function SendPage() {
  const { publicKey } = useParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [device, setDevice] = useState<PublicDevice | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [copies, setCopies] = useState(1)
  const [paperSize, setPaperSize] = useState('A4')
  const [colorMode, setColorMode] = useState('bw')
  const [pageRange, setPageRange] = useState('')
  const [note, setNote] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function loadDevice() {
      if (!publicKey) return

      const { data, error } = await supabase.rpc('get_public_device', {
        p_public_key: publicKey,
      })

      if (error) {
        setErrorMessage('Terjadi kesalahan sistem saat memuat data perangkat.')
      } else if (!data || data.length === 0) {
        setErrorMessage('Printer tidak ditemukan atau tautan sudah tidak valid.')
      } else {
        const deviceData = data[0]
        setDevice(deviceData)
        setPaperSize(deviceData.default_paper_size)
        setColorMode(deviceData.default_color_mode)
      }

      setLoading(false)
    }

    loadDevice()
  }, [publicKey])

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault()

    if (!publicKey || !device || files.length === 0) {
      toast.error('Pilih minimal satu file terlebih dahulu.')
      return
    }

    setUploading(true)

    try {
      if (!device.is_accepting_jobs) {
        throw new Error('Printer saat ini sedang tidak menerima file.')
      }

      // Validasi semua file sebelum memulai upload
      for (const file of files) {
        if (file.size > device.max_file_size_mb * 1024 * 1024) {
          throw new Error(`Ukuran file "${file.name}" terlalu besar. Maksimal ${device.max_file_size_mb}MB.`)
        }
        if (!device.accepted_mime_types.includes(file.type)) {
          throw new Error(`Tipe/format file "${file.name}" tidak didukung oleh printer.`)
        }
      }

      const formattedNote = pageRange.trim() ? `[Halaman: ${pageRange}]\n${note}` : note

      // Upload semua file
      const uploadPromises = files.map(async (file) => {
        const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const filePath = `${publicKey}/${crypto.randomUUID()}/${safeFileName}`

        const { error: uploadError } = await supabase.storage
          .from('print-files')
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          })

        if (uploadError) throw uploadError

        const { error: jobError } = await supabase.rpc('create_public_print_job', {
          p_public_key: publicKey,
          p_file_path: filePath,
          p_file_name: file.name,
          p_file_size: file.size,
          p_mime_type: file.type,
          p_copies: copies,
          p_paper_size: paperSize,
          p_color_mode: colorMode,
          p_customer_note: formattedNote.trim() || null,
          p_pin: pin || null,
        })

        if (jobError) throw jobError
      })

      await Promise.all(uploadPromises)

      setSuccess(true)
      toast.success(`${files.length} file berhasil dikirim ke antrean!`)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Upload gagal karena kesalahan tidak dikenal.')
      }
    } finally {
      setUploading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function resetForm() {
    setSuccess(false)
    setFiles([])
    setNote('')
    setPageRange('')
    setCopies(1)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm animate-pulse">Menghubungkan ke Printer...</p>
        </div>
      </div>
    )
  }

  if (errorMessage && !device) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Akses Ditolak</h1>
          <p className="text-slate-500">{errorMessage}</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] shadow-2xl shadow-slate-200/50 relative z-10 overflow-hidden my-8"
      >
        <div className="p-8 sm:p-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 shrink-0">
              <Printer size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">Kirim File</h1>
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                ke <span className="font-semibold text-slate-700">{device?.name}</span>
              </p>
            </div>
          </div>

          {!device?.is_accepting_jobs && (
            <div className="mb-6 rounded-2xl bg-red-50 border border-red-100 p-4 flex gap-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-red-700 font-medium leading-relaxed">
                Maaf, printer ini sedang dimatikan atau tidak menerima antrean baru saat ini.
              </p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Terkirim!</h2>
                <p className="text-slate-500 mb-8 max-w-[260px] mx-auto">
                  Semua file Anda telah masuk ke antrean. Silakan konfirmasi pembayaran ke operator.
                </p>
                <button
                  onClick={resetForm}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-6 rounded-xl transition-colors"
                >
                  Kirim Dokumen Lain
                </button>
              </motion.div>
            ) : (
              <motion.form 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleUpload} 
                className="space-y-6"
              >
                {/* File Upload Area */}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    multiple
                  />
                  
                  <div 
                    onClick={(e) => {
                      if (files.length === 0) fileInputRef.current?.click()
                    }}
                    className={`relative border-2 rounded-3xl p-6 text-center transition-all ${
                      files.length > 0 
                        ? 'border-indigo-100 bg-white/50' 
                        : 'border-dashed border-slate-300 hover:border-indigo-400 hover:bg-slate-50 bg-slate-50/50 cursor-pointer'
                    }`}
                  >
                    {files.length > 0 ? (
                      <div className="w-full text-left">
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
                            <Files size={16} /> File Terpilih ({files.length})
                          </p>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                          {files.map((f, i) => (
                            <div key={i} className="flex items-center justify-between bg-white border border-slate-200 p-2.5 rounded-xl">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                                  <File size={16} />
                                </div>
                                <div className="overflow-hidden">
                                  <p className="text-sm font-medium text-slate-800 truncate" title={f.name}>{f.name}</p>
                                  <p className="text-xs text-slate-500">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                              </div>
                              <button 
                                type="button" 
                                onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                          className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1 w-full bg-indigo-50 px-4 py-3 rounded-xl transition-colors"
                        >
                          + Tambah File Lain
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-4">
                        <div className="w-14 h-14 bg-white shadow-sm border border-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                          <UploadCloud size={28} />
                        </div>
                        <p className="font-medium text-slate-700">Tap untuk memilih file</p>
                        <p className="text-xs text-slate-500 mt-2 max-w-[200px] mx-auto leading-relaxed">
                          Bisa pilih lebih dari 1 file. Maksimal {device?.max_file_size_mb}MB/file.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Print Options Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Jumlah per File</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Hash size={16} />
                      </div>
                      <input
                        className="w-full rounded-xl border border-slate-200 bg-white/50 pl-9 pr-4 py-3 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-indigo-500/50"
                        type="number"
                        min={1}
                        max={99}
                        value={copies}
                        onChange={(event) => setCopies(Number(event.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Kertas</label>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                      value={paperSize}
                      onChange={(event) => setPaperSize(event.target.value)}
                    >
                      <option value="A4">A4</option>
                      <option value="F4">F4</option>
                      <option value="Letter">Letter</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Warna Cetak</label>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                      value={colorMode}
                      onChange={(event) => setColorMode(event.target.value)}
                    >
                      <option value="bw">Hitam Putih</option>
                      <option value="color">Berwarna</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Hal. Dicetak</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/50"
                      value={pageRange}
                      onChange={(event) => setPageRange(event.target.value)}
                      placeholder="Cth: Semua, 1-3"
                    />
                  </div>
                </div>

                {device?.pin_enabled && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">PIN Keamanan</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/50"
                      value={pin}
                      onChange={(event) => setPin(event.target.value)}
                      placeholder="Masukkan PIN dari operator"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Catatan Tambahan (Opsional)</label>
                  <textarea
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/50 resize-none h-20"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Contoh: Tolong jilid spiral..."
                  />
                </div>

                <button
                  disabled={uploading || !device?.is_accepting_jobs || files.length === 0}
                  className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-4 font-bold text-sm transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2 group mt-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Mengirim {files.length} File...
                    </>
                  ) : (
                    <>
                      Kirim ke Printer
                      <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}