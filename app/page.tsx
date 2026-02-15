'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import type { AIAgentResponse } from '@/lib/aiAgent'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  RiDashboardLine, RiShieldLine, RiFileListLine, RiUploadCloud2Line,
  RiAlertLine, RiCheckLine, RiCloseLine, RiSearchLine,
  RiVideoLine, RiTimeLine, RiUserLine, RiVolumeUpLine,
  RiDownloadLine, RiFilterLine, RiRefreshLine, RiArrowRightLine,
  RiEyeLine, RiErrorWarningLine, RiShieldCheckLine,
  RiPulseLine, RiBarChartLine, RiFileChartLine,
  RiLinkLine, RiPlayLine, RiMenuLine
} from 'react-icons/ri'

// ─── CONSTANTS ──────────────────────────────────────────────────────────────────

const DEEPFAKE_AGENT_ID = '6991b5ca4f72b266ce46106e'

// ─── TYPES ──────────────────────────────────────────────────────────────────────

interface FacialAnalysis { score: number; findings: string }
interface TemporalAnalysis { score: number; findings: string }
interface AudioAnalysis { score: number; findings: string }
interface SuspiciousFrame { frame_number: number; description: string }

interface DeepfakeResult {
  verdict: string
  confidence_score: number
  overall_explanation: string
  facial_analysis: FacialAnalysis
  temporal_analysis: TemporalAnalysis
  audio_analysis: AudioAnalysis
  suspicious_frames: SuspiciousFrame[]
  recommendations: string[]
}

interface DetectionRecord {
  id: string
  timestamp: string
  source: string
  verdict: string
  confidence: number
  reviewer: string
  result: DeepfakeResult
}

interface Alert {
  id: string
  timestamp: string
  message: string
  severity: 'high' | 'medium' | 'low'
  resolved: boolean
}

// ─── SAMPLE DATA ────────────────────────────────────────────────────────────────

const SAMPLE_RESULT: DeepfakeResult = {
  verdict: 'DEEPFAKE',
  confidence_score: 87,
  overall_explanation: 'The analyzed video exhibits multiple indicators consistent with deepfake manipulation. Facial regions show subtle artifacts around the jawline and eye areas, temporal consistency is compromised with flickering in frames 120-145, and audio-visual synchronization reveals a 40ms delay between lip movements and speech patterns. The combination of these signals strongly suggests AI-generated facial replacement technology was used.',
  facial_analysis: { score: 82, findings: 'Detected inconsistencies in facial boundary regions, particularly around the jawline and hairline. Skin texture anomalies observed near the left cheek. Eye reflection patterns do not match environmental lighting conditions. Blending artifacts visible at 4x zoom around facial perimeter.' },
  temporal_analysis: { score: 78, findings: 'Frame-to-frame consistency analysis reveals micro-jitter in facial landmark positions between frames 120-145. Head pose estimation shows unnatural rotation patterns at timestamps 0:04-0:06. Background-foreground boundary exhibits temporal aliasing not consistent with camera motion.' },
  audio_analysis: { score: 65, findings: 'Audio spectrogram analysis indicates potential splicing artifacts at 2.3s and 5.1s marks. Lip-sync deviation measured at approximately 40ms, exceeding natural speech patterns. Voice formant analysis shows minor anomalies in F2 and F3 frequency bands suggesting possible voice synthesis components.' },
  suspicious_frames: [
    { frame_number: 120, description: 'Facial boundary distortion with visible blending seam along right jawline' },
    { frame_number: 133, description: 'Eye reflection anomaly - light source position inconsistent with scene' },
    { frame_number: 145, description: 'Temporal glitch causing micro-frame duplication in facial region' },
    { frame_number: 201, description: 'Skin texture discontinuity near left ear boundary' }
  ],
  recommendations: [
    'Flag this content for manual expert review before any distribution or publication',
    'Cross-reference the source video with original content databases for provenance verification',
    'Apply secondary forensic analysis using frequency domain methods for additional confirmation',
    'Document chain of custody for this media asset for potential legal proceedings',
    'Consider running the analysis again with higher resolution source material if available'
  ]
}

const SAMPLE_RECORDS: DetectionRecord[] = [
  { id: 'DET-001', timestamp: '2026-02-15T08:32:00Z', source: 'interview_clip_v2.mp4', verdict: 'DEEPFAKE', confidence: 87, reviewer: 'System', result: SAMPLE_RESULT },
  { id: 'DET-002', timestamp: '2026-02-15T07:15:00Z', source: 'news_broadcast.mp4', verdict: 'AUTHENTIC', confidence: 12, reviewer: 'System', result: { ...SAMPLE_RESULT, verdict: 'AUTHENTIC', confidence_score: 12, overall_explanation: 'Video shows no signs of manipulation. All facial markers, temporal patterns, and audio synchronization are within normal parameters.', facial_analysis: { score: 8, findings: 'No facial manipulation indicators detected.' }, temporal_analysis: { score: 10, findings: 'Consistent temporal flow with no anomalies.' }, audio_analysis: { score: 5, findings: 'Audio-visual sync is within natural bounds.' }, suspicious_frames: [], recommendations: ['No action required. Video appears authentic.'] } },
  { id: 'DET-003', timestamp: '2026-02-14T22:45:00Z', source: 'social_post_video.webm', verdict: 'SUSPICIOUS', confidence: 52, reviewer: 'System', result: { ...SAMPLE_RESULT, verdict: 'SUSPICIOUS', confidence_score: 52, overall_explanation: 'Minor anomalies detected that could indicate manipulation or compression artifacts. Further review recommended.', facial_analysis: { score: 45, findings: 'Slight blurring around facial edges, possibly compression-related.' }, temporal_analysis: { score: 38, findings: 'Minor frame inconsistencies detected but within ambiguous range.' }, audio_analysis: { score: 30, findings: 'Audio sync marginally off but could be encoding artifact.' }, suspicious_frames: [{ frame_number: 88, description: 'Ambiguous edge softening around face boundary' }], recommendations: ['Run additional analysis with enhanced forensic tools.', 'Request higher quality source material.'] } },
  { id: 'DET-004', timestamp: '2026-02-14T18:10:00Z', source: 'conference_recording.mp4', verdict: 'AUTHENTIC', confidence: 5, reviewer: 'System', result: { ...SAMPLE_RESULT, verdict: 'AUTHENTIC', confidence_score: 5, overall_explanation: 'All analysis vectors indicate genuine footage with no manipulation.', facial_analysis: { score: 3, findings: 'Clean facial regions with natural texture.' }, temporal_analysis: { score: 4, findings: 'Smooth temporal consistency.' }, audio_analysis: { score: 2, findings: 'Perfect audio-visual synchronization.' }, suspicious_frames: [], recommendations: ['Verified authentic. No further action needed.'] } },
  { id: 'DET-005', timestamp: '2026-02-14T14:30:00Z', source: 'viral_video_suspect.mp4', verdict: 'DEEPFAKE', confidence: 94, reviewer: 'System', result: { ...SAMPLE_RESULT, verdict: 'DEEPFAKE', confidence_score: 94, overall_explanation: 'High confidence deepfake detection. Multiple strong indicators across all analysis vectors.', facial_analysis: { score: 92, findings: 'Significant facial boundary artifacts and texture inconsistencies.' }, temporal_analysis: { score: 88, findings: 'Clear temporal discontinuities and unnatural motion patterns.' }, audio_analysis: { score: 85, findings: 'Substantial audio-visual desynchronization and voice synthesis markers.' }, suspicious_frames: [{ frame_number: 45, description: 'Major blending artifact' }, { frame_number: 78, description: 'Face swap boundary visible' }, { frame_number: 112, description: 'Lighting mismatch' }], recommendations: ['Immediately flag and restrict distribution.', 'Escalate to forensics team.', 'Preserve evidence chain.'] } }
]

const SAMPLE_ALERTS: Alert[] = [
  { id: 'ALT-001', timestamp: '2026-02-15T08:32:00Z', message: 'DEEPFAKE detected in interview_clip_v2.mp4 (87% confidence)', severity: 'high', resolved: false },
  { id: 'ALT-002', timestamp: '2026-02-14T22:45:00Z', message: 'SUSPICIOUS content in social_post_video.webm (52% confidence)', severity: 'medium', resolved: false },
  { id: 'ALT-003', timestamp: '2026-02-14T14:30:00Z', message: 'DEEPFAKE detected in viral_video_suspect.mp4 (94% confidence)', severity: 'high', resolved: true }
]

// ─── HELPERS ────────────────────────────────────────────────────────────────────

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part)
}

function formatTimestamp(ts: string): string {
  if (!ts) return '--'
  try {
    const d = new Date(ts)
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ts
  }
}

function getVerdictStyle(verdict: string): string {
  const v = (verdict ?? '').toUpperCase()
  if (v === 'AUTHENTIC') return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(0,255,100,0.2)]'
  if (v === 'DEEPFAKE') return 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(255,0,0,0.3)]'
  if (v === 'SUSPICIOUS') return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 shadow-[0_0_15px_rgba(255,255,0,0.2)]'
  return 'bg-muted text-muted-foreground border border-border'
}

function getVerdictIcon(verdict: string) {
  const v = (verdict ?? '').toUpperCase()
  if (v === 'AUTHENTIC') return <RiShieldCheckLine className="w-4 h-4" />
  if (v === 'DEEPFAKE') return <RiErrorWarningLine className="w-4 h-4" />
  if (v === 'SUSPICIOUS') return <RiAlertLine className="w-4 h-4" />
  return <RiSearchLine className="w-4 h-4" />
}

function getSeverityStyle(severity: string): string {
  if (severity === 'high') return 'border-l-4 border-l-red-500 bg-red-500/10'
  if (severity === 'medium') return 'border-l-4 border-l-yellow-500 bg-yellow-500/10'
  return 'border-l-4 border-l-blue-500 bg-blue-500/10'
}

// ─── INLINE COMPONENTS ──────────────────────────────────────────────────────────

function ConfidenceMeter({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 70 ? 'hsl(0,100%,55%)' : score >= 30 ? 'hsl(60,100%,50%)' : 'hsl(120,100%,50%)'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(260,20%,15%)" strokeWidth="8" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth="8" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold font-mono" style={{ color }}>{score}%</span>
        <span className="text-xs text-muted-foreground">confidence</span>
      </div>
    </div>
  )
}

function AnalysisCard({ title, icon, score, findings }: { title: string; icon: React.ReactNode; score: number; findings: string }) {
  const barColor = score >= 70 ? 'bg-red-500' : score >= 30 ? 'bg-yellow-500' : 'bg-emerald-500'
  const barGlow = score >= 70 ? 'shadow-[0_0_10px_rgba(255,0,0,0.4)]' : score >= 30 ? 'shadow-[0_0_10px_rgba(255,255,0,0.3)]' : 'shadow-[0_0_10px_rgba(0,255,100,0.3)]'

  return (
    <div className="bg-[hsl(260,25%,9%)]/80 backdrop-blur-[12px] border border-[rgba(255,255,255,0.1)] rounded p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[hsl(180,100%,50%)]">{icon}</span>
          <h4 className="font-sans font-semibold text-sm tracking-[0.02em]">{title}</h4>
        </div>
        <span className="font-mono text-sm font-bold" style={{ color: score >= 70 ? 'hsl(0,100%,55%)' : score >= 30 ? 'hsl(60,100%,50%)' : 'hsl(120,100%,50%)' }}>{score}/100</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor} ${barGlow}`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{findings}</p>
    </div>
  )
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[hsl(260,25%,9%)]/80 backdrop-blur-[12px] border border-[rgba(255,255,255,0.1)] rounded ${className}`}>
      {children}
    </div>
  )
}

function StatCard({ icon, label, value, accent = false }: { icon: React.ReactNode; label: string; value: string | number; accent?: boolean }) {
  return (
    <GlassCard className={`p-4 ${accent ? 'shadow-[0_0_20px_rgba(0,255,255,0.15)]' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-sans mb-1">{label}</p>
          <p className="text-2xl font-bold font-mono tracking-[0.02em]">{value}</p>
        </div>
        <div className={`p-2 rounded ${accent ? 'bg-[hsl(180,100%,50%)]/20 text-[hsl(180,100%,50%)]' : 'bg-muted text-muted-foreground'}`}>
          {icon}
        </div>
      </div>
    </GlassCard>
  )
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────────

export default function Page() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'detection' | 'reports'>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Sample data toggle
  const [showSampleData, setShowSampleData] = useState(false)

  // Detection state
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<DeepfakeResult | null>(null)
  const [detectionHistory, setDetectionHistory] = useState<DetectionRecord[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [streamUrl, setStreamUrl] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reports state
  const [selectedReport, setSelectedReport] = useState<DetectionRecord | null>(null)
  const [filterVerdict, setFilterVerdict] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)

  // Active agent tracking
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Current time
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  // Sample data effect
  useEffect(() => {
    if (showSampleData) {
      setDetectionHistory(SAMPLE_RECORDS)
      setAlerts(SAMPLE_ALERTS)
      setAnalysisResult(SAMPLE_RESULT)
    } else {
      setDetectionHistory([])
      setAlerts([])
      setAnalysisResult(null)
    }
  }, [showSampleData])

  // Computed values
  const displayHistory = detectionHistory
  const displayAlerts = alerts

  const deepfakeCount = displayHistory.filter(r => r.verdict === 'DEEPFAKE').length
  const suspiciousCount = displayHistory.filter(r => r.verdict === 'SUSPICIOUS').length
  const authenticCount = displayHistory.filter(r => r.verdict === 'AUTHENTIC').length
  const unresolvedAlerts = displayAlerts.filter(a => !a.resolved).length

  // Filtered reports
  const filteredHistory = displayHistory.filter(r => {
    const matchesVerdict = filterVerdict === 'all' || r.verdict === filterVerdict
    const matchesSearch = !searchQuery || r.source.toLowerCase().includes(searchQuery.toLowerCase()) || r.id.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesVerdict && matchesSearch
  })

  // File handling
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      const validTypes = ['video/mp4', 'video/webm', 'video/avi', 'video/x-msvideo']
      if (validTypes.includes(file.type) || file.name.match(/\.(mp4|webm|avi)$/i)) {
        setSelectedFile(file)
        setErrorMessage('')
      } else {
        setErrorMessage('Unsupported file format. Please use MP4, WebM, or AVI.')
      }
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
      setErrorMessage('')
    }
  }, [])

  const analyzeVideo = async (fileName: string, fileDetails: string) => {
    setIsAnalyzing(true)
    setAnalysisResult(null)
    setErrorMessage('')
    setActiveAgentId(DEEPFAKE_AGENT_ID)

    const message = `Analyze this video for deepfake detection: File: ${fileName}. Details: ${fileDetails}. Provide comprehensive analysis with verdict, confidence score, facial analysis, temporal analysis, audio analysis, suspicious frames, and recommendations.`

    try {
      const result: AIAgentResponse = await callAIAgent(message, DEEPFAKE_AGENT_ID)

      if (result.success && result.response?.result) {
        let parsed: DeepfakeResult
        const raw = result.response.result

        if (typeof raw === 'string') {
          try { parsed = JSON.parse(raw) } catch { parsed = raw as unknown as DeepfakeResult }
        } else {
          parsed = raw as DeepfakeResult
        }

        if (!Array.isArray(parsed?.suspicious_frames)) parsed.suspicious_frames = []
        if (!Array.isArray(parsed?.recommendations)) parsed.recommendations = []

        setAnalysisResult(parsed)

        const record: DetectionRecord = {
          id: `DET-${Date.now()}`,
          timestamp: new Date().toISOString(),
          source: fileName,
          verdict: parsed.verdict ?? 'UNKNOWN',
          confidence: parsed.confidence_score ?? 0,
          reviewer: 'System',
          result: parsed
        }
        setDetectionHistory(prev => [record, ...prev])

        if (parsed.verdict === 'DEEPFAKE' || parsed.verdict === 'SUSPICIOUS') {
          setAlerts(prev => [{
            id: `ALT-${Date.now()}`,
            timestamp: new Date().toISOString(),
            message: `${parsed.verdict} detected in ${fileName} (${parsed.confidence_score ?? 0}% confidence)`,
            severity: parsed.verdict === 'DEEPFAKE' ? 'high' : 'medium',
            resolved: false
          }, ...prev])
        }
      } else {
        setErrorMessage(result.error ?? result.response?.message ?? 'Analysis failed. Please try again.')
      }
    } catch (err) {
      console.error('Analysis failed:', err)
      setErrorMessage('Network error. Please check your connection and try again.')
    } finally {
      setIsAnalyzing(false)
      setActiveAgentId(null)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedFile && !streamUrl) return
    const source = selectedFile ? selectedFile.name : streamUrl
    const details = selectedFile
      ? `Type: ${selectedFile.type}, Size: ${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB`
      : `Stream URL: ${streamUrl}`
    await analyzeVideo(source, details)
  }

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a))
  }

  const exportCSV = () => {
    const headers = 'ID,Timestamp,Source,Verdict,Confidence,Reviewer\n'
    const rows = filteredHistory.map(r => `${r.id},${r.timestamp},${r.source},${r.verdict},${r.confidence},${r.reviewer}`).join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'vemar_detection_report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── NAV ITEMS ────────────────────────────────────────────────────────────────

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: <RiDashboardLine className="w-5 h-5" /> },
    { id: 'detection' as const, label: 'Detection', icon: <RiSearchLine className="w-5 h-5" /> },
    { id: 'reports' as const, label: 'Reports', icon: <RiFileListLine className="w-5 h-5" /> }
  ]

  // ─── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── HEADER ─────────────────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-[rgba(255,255,255,0.08)] bg-[hsl(260,28%,7%)]/90 backdrop-blur-[12px] flex items-center justify-between px-4 lg:px-6 z-30 relative">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-1.5 rounded hover:bg-muted transition-colors text-[hsl(180,100%,50%)]">
            <RiMenuLine className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <RiShieldLine className="w-6 h-6 text-[hsl(180,100%,50%)]" />
            <span className="font-sans font-bold text-lg tracking-[0.02em] text-foreground">Vemar<span className="text-[hsl(300,80%,50%)]">.ai</span></span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono">System Online</span>
          </div>
          {unresolvedAlerts > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30 shadow-[0_0_12px_rgba(255,0,0,0.2)]">
              <RiAlertLine className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-mono font-bold text-red-400">{unresolvedAlerts}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">Sample Data</Label>
            <Switch id="sample-toggle" checked={showSampleData} onCheckedChange={setShowSampleData} />
          </div>
          <span className="hidden md:inline font-mono text-xs text-muted-foreground">{currentTime}</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── SIDEBAR ──────────────────────────────────────────────────────────── */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-56 border-r border-[rgba(255,255,255,0.08)] bg-[hsl(260,28%,7%)]/95 backdrop-blur-[12px] flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-4 pt-5 lg:pt-4">
            <div className="flex items-center gap-2 mb-1 lg:hidden">
              <RiShieldLine className="w-5 h-5 text-[hsl(180,100%,50%)]" />
              <span className="font-sans font-bold tracking-[0.02em]">Vemar<span className="text-[hsl(300,80%,50%)]">.ai</span></span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans">Deepfake Detection</p>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {navItems.map(item => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false) }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-sans font-medium transition-all duration-200 ${activeTab === item.id ? 'bg-[hsl(180,100%,50%)]/10 text-[hsl(180,100%,50%)] border-l-2 border-l-[hsl(180,100%,50%)] shadow-[0_0_15px_rgba(0,255,255,0.1)]' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Agent Info */}
          <div className="p-3 m-3 rounded bg-muted/30 border border-[rgba(255,255,255,0.06)]">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2 font-sans">Agent Status</p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${activeAgentId ? 'bg-[hsl(180,100%,50%)] animate-pulse shadow-[0_0_8px_rgba(0,255,255,0.6)]' : 'bg-emerald-400'}`} />
              <span className="text-xs font-sans text-muted-foreground">{activeAgentId ? 'Analyzing...' : 'Ready'}</span>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground mt-1.5 truncate">Deepfake Analysis Agent</p>
            <p className="text-[10px] font-mono text-muted-foreground/50 truncate">{DEEPFAKE_AGENT_ID}</p>
          </div>
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          <ScrollArea className="h-[calc(100vh-3.5rem)]">
            <div className="p-4 lg:p-6 max-w-7xl mx-auto">

              {/* ── DASHBOARD ────────────────────────────────────────────────────── */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-sans font-bold tracking-[0.02em] mb-1">Real-Time Monitoring</h1>
                    <p className="text-sm text-muted-foreground font-sans">Deepfake detection overview and alert management</p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={<RiBarChartLine className="w-5 h-5" />} label="Total Analyses" value={displayHistory.length} accent />
                    <StatCard icon={<RiErrorWarningLine className="w-5 h-5" />} label="Deepfakes Found" value={deepfakeCount} />
                    <StatCard icon={<RiPulseLine className="w-5 h-5" />} label="System Health" value="Online" accent />
                    <StatCard icon={<RiAlertLine className="w-5 h-5" />} label="Active Alerts" value={unresolvedAlerts} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Quick Analysis Panel */}
                    <div className="lg:col-span-2 space-y-4">
                      <GlassCard className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <RiVideoLine className="w-5 h-5 text-[hsl(180,100%,50%)]" />
                          <h3 className="font-sans font-semibold tracking-[0.02em]">Quick Analysis</h3>
                        </div>
                        <div className={`border-2 border-dashed rounded p-8 text-center transition-all duration-200 cursor-pointer ${dragOver ? 'border-[hsl(180,100%,50%)] bg-[hsl(180,100%,50%)]/5' : 'border-[rgba(255,255,255,0.15)] hover:border-[hsl(180,100%,50%)]/50'}`} onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={handleFileDrop} onClick={() => fileInputRef.current?.click()}>
                          <input ref={fileInputRef} type="file" accept=".mp4,.webm,.avi" className="hidden" onChange={handleFileSelect} />
                          <RiUploadCloud2Line className="w-10 h-10 mx-auto mb-3 text-[hsl(180,100%,50%)]/60" />
                          {selectedFile ? (
                            <div>
                              <p className="text-sm font-semibold text-foreground">{selectedFile.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-muted-foreground">Drop a video file or click to browse</p>
                              <p className="text-xs text-muted-foreground/60 mt-1">Supports MP4, WebM, AVI</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button onClick={() => { setActiveTab('detection'); handleAnalyze() }} disabled={!selectedFile || isAnalyzing} className="bg-[hsl(180,100%,50%)] text-[hsl(260,30%,6%)] hover:bg-[hsl(180,100%,55%)] shadow-[0_0_20px_rgba(0,255,255,0.3)] font-sans font-semibold disabled:opacity-40 disabled:shadow-none">
                            {isAnalyzing ? <><RiRefreshLine className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><RiSearchLine className="w-4 h-4 mr-2" /> Analyze Video</>}
                          </Button>
                          {selectedFile && (
                            <Button variant="outline" onClick={() => setSelectedFile(null)} className="border-[rgba(255,255,255,0.15)] text-muted-foreground hover:text-foreground">
                              <RiCloseLine className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </GlassCard>

                      {/* Recent Detections */}
                      <GlassCard className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <RiTimeLine className="w-5 h-5 text-[hsl(180,100%,50%)]" />
                            <h3 className="font-sans font-semibold tracking-[0.02em]">Recent Detections</h3>
                          </div>
                          {displayHistory.length > 0 && (
                            <button onClick={() => setActiveTab('reports')} className="text-xs text-[hsl(180,100%,50%)] hover:underline flex items-center gap-1 font-sans">
                              View All <RiArrowRightLine className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {displayHistory.length === 0 ? (
                          <div className="text-center py-10">
                            <RiShieldCheckLine className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground">No detections yet</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Upload a video to begin analysis</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-[rgba(255,255,255,0.06)]">
                                  <th className="text-left py-2 px-2 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider">Source</th>
                                  <th className="text-left py-2 px-2 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider">Verdict</th>
                                  <th className="text-left py-2 px-2 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider">Conf.</th>
                                  <th className="text-left py-2 px-2 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider hidden sm:table-cell">Time</th>
                                </tr>
                              </thead>
                              <tbody>
                                {displayHistory.slice(0, 10).map(r => (
                                  <tr key={r.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => { setSelectedReport(r); setDetailOpen(true) }}>
                                    <td className="py-2.5 px-2 font-mono text-xs truncate max-w-[160px]">{r.source}</td>
                                    <td className="py-2.5 px-2">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getVerdictStyle(r.verdict)}`}>
                                        {getVerdictIcon(r.verdict)} {r.verdict}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-2 font-mono text-xs">{r.confidence}%</td>
                                    <td className="py-2.5 px-2 text-xs text-muted-foreground hidden sm:table-cell">{formatTimestamp(r.timestamp)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </GlassCard>
                    </div>

                    {/* Alert Feed */}
                    <div className="space-y-4">
                      <GlassCard className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <RiAlertLine className="w-5 h-5 text-red-400" />
                          <h3 className="font-sans font-semibold tracking-[0.02em]">Alert Feed</h3>
                        </div>
                        {displayAlerts.length === 0 ? (
                          <div className="text-center py-8">
                            <RiCheckLine className="w-8 h-8 mx-auto text-emerald-400/40 mb-2" />
                            <p className="text-sm text-muted-foreground">No alerts</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">All clear</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                            {displayAlerts.map(alert => (
                              <div key={alert.id} className={`p-3 rounded transition-all duration-200 ${alert.resolved ? 'opacity-40' : ''} ${getSeverityStyle(alert.severity)}`}>
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-xs leading-relaxed flex-1">{alert.message}</p>
                                  {!alert.resolved && (
                                    <button onClick={() => dismissAlert(alert.id)} className="p-1 rounded hover:bg-white/10 transition-colors shrink-0">
                                      <RiCloseLine className="w-3.5 h-3.5 text-muted-foreground" />
                                    </button>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">{formatTimestamp(alert.timestamp)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </GlassCard>

                      {/* Verdict Breakdown */}
                      {displayHistory.length > 0 && (
                        <GlassCard className="p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <RiFileChartLine className="w-5 h-5 text-[hsl(300,80%,50%)]" />
                            <h3 className="font-sans font-semibold tracking-[0.02em] text-sm">Verdict Breakdown</h3>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                                <span className="text-xs text-muted-foreground">Authentic</span>
                              </div>
                              <span className="font-mono text-sm font-bold text-emerald-400">{authenticCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                <span className="text-xs text-muted-foreground">Suspicious</span>
                              </div>
                              <span className="font-mono text-sm font-bold text-yellow-400">{suspiciousCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <span className="text-xs text-muted-foreground">Deepfake</span>
                              </div>
                              <span className="font-mono text-sm font-bold text-red-400">{deepfakeCount}</span>
                            </div>
                          </div>
                        </GlassCard>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── DETECTION ────────────────────────────────────────────────────── */}
              {activeTab === 'detection' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-sans font-bold tracking-[0.02em] mb-1">Detection Analysis</h1>
                    <p className="text-sm text-muted-foreground font-sans">Upload video content for AI-powered deepfake detection</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Input Panel */}
                    <div className="space-y-4">
                      <GlassCard className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <RiUploadCloud2Line className="w-5 h-5 text-[hsl(180,100%,50%)]" />
                          <h3 className="font-sans font-semibold tracking-[0.02em]">Upload Source</h3>
                        </div>

                        {/* Drag & Drop Zone */}
                        <div className={`border-2 border-dashed rounded p-10 text-center transition-all duration-200 cursor-pointer mb-4 ${dragOver ? 'border-[hsl(180,100%,50%)] bg-[hsl(180,100%,50%)]/5 shadow-[0_0_20px_rgba(0,255,255,0.15)]' : 'border-[rgba(255,255,255,0.15)] hover:border-[hsl(180,100%,50%)]/50'}`} onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={handleFileDrop} onClick={() => fileInputRef.current?.click()}>
                          <input ref={fileInputRef} type="file" accept=".mp4,.webm,.avi" className="hidden" onChange={handleFileSelect} />
                          <RiUploadCloud2Line className="w-12 h-12 mx-auto mb-4 text-[hsl(180,100%,50%)]/50" />
                          {selectedFile ? (
                            <div>
                              <div className="flex items-center justify-center gap-2 mb-2">
                                <RiVideoLine className="w-5 h-5 text-[hsl(180,100%,50%)]" />
                                <p className="text-sm font-semibold text-foreground">{selectedFile.name}</p>
                              </div>
                              <p className="text-xs text-muted-foreground">{selectedFile.type} -- {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-foreground mb-1">Drag & drop your video file here</p>
                              <p className="text-xs text-muted-foreground">or click to browse files</p>
                            </div>
                          )}
                        </div>

                        {/* Stream URL */}
                        <div className="space-y-2 mb-4">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider font-sans">Or enter stream URL</Label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <RiLinkLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input value={streamUrl} onChange={(e) => setStreamUrl(e.target.value)} placeholder="https://stream.example.com/live" className="pl-9 bg-muted/30 border-[rgba(255,255,255,0.1)] text-sm font-mono" />
                            </div>
                          </div>
                        </div>

                        {/* Supported formats */}
                        <div className="flex flex-wrap gap-2 mb-5">
                          {['MP4', 'WebM', 'AVI'].map(fmt => (
                            <span key={fmt} className="px-2 py-0.5 text-[10px] font-mono uppercase bg-muted/40 rounded border border-[rgba(255,255,255,0.06)] text-muted-foreground">{fmt}</span>
                          ))}
                          <span className="text-[10px] text-muted-foreground/50 self-center">Max 500MB</span>
                        </div>

                        {/* Error message */}
                        {errorMessage && (
                          <div className="p-3 rounded bg-red-500/10 border border-red-500/20 mb-4">
                            <p className="text-xs text-red-400 flex items-center gap-2">
                              <RiErrorWarningLine className="w-4 h-4 shrink-0" /> {errorMessage}
                            </p>
                          </div>
                        )}

                        {/* Analyze Button */}
                        <Button onClick={handleAnalyze} disabled={(!selectedFile && !streamUrl) || isAnalyzing} className="w-full bg-[hsl(180,100%,50%)] text-[hsl(260,30%,6%)] hover:bg-[hsl(180,100%,55%)] shadow-[0_0_20px_rgba(0,255,255,0.3)] font-sans font-bold text-sm py-5 disabled:opacity-40 disabled:shadow-none transition-all duration-200">
                          {isAnalyzing ? (
                            <><RiRefreshLine className="w-5 h-5 mr-2 animate-spin" /> Analyzing Video...</>
                          ) : (
                            <><RiPlayLine className="w-5 h-5 mr-2" /> Start Deepfake Analysis</>
                          )}
                        </Button>

                        {isAnalyzing && (
                          <div className="mt-4 space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Processing...</span>
                              <span className="font-mono">AI Engine Active</span>
                            </div>
                            <Progress value={undefined} className="h-1.5 bg-muted" />
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-[hsl(180,100%,50%)] rounded-full animate-pulse" style={{ width: '60%' }} />
                            </div>
                          </div>
                        )}

                        {selectedFile && !isAnalyzing && (
                          <Button variant="outline" onClick={() => { setSelectedFile(null); setStreamUrl('') }} className="w-full mt-2 border-[rgba(255,255,255,0.1)] text-muted-foreground hover:text-foreground">
                            <RiCloseLine className="w-4 h-4 mr-2" /> Clear Selection
                          </Button>
                        )}
                      </GlassCard>
                    </div>

                    {/* Right: Results Panel */}
                    <div className="space-y-4">
                      {!analysisResult && !isAnalyzing && (
                        <GlassCard className="p-10 text-center">
                          <RiSearchLine className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
                          <h3 className="font-sans font-semibold text-lg mb-2 text-muted-foreground/60">Awaiting Analysis</h3>
                          <p className="text-sm text-muted-foreground/40 max-w-sm mx-auto">Upload a video file or enter a stream URL and click "Start Deepfake Analysis" to begin.</p>
                        </GlassCard>
                      )}

                      {isAnalyzing && (
                        <GlassCard className="p-10 text-center">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-[hsl(180,100%,50%)]/30 border-t-[hsl(180,100%,50%)] animate-spin" />
                          <h3 className="font-sans font-semibold text-lg mb-2">Processing Video</h3>
                          <p className="text-sm text-muted-foreground">Running multi-vector deepfake analysis...</p>
                          <div className="flex justify-center gap-6 mt-6 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><RiUserLine className="w-3.5 h-3.5" /> Facial</span>
                            <span className="flex items-center gap-1"><RiTimeLine className="w-3.5 h-3.5" /> Temporal</span>
                            <span className="flex items-center gap-1"><RiVolumeUpLine className="w-3.5 h-3.5" /> Audio</span>
                          </div>
                        </GlassCard>
                      )}

                      {analysisResult && !isAnalyzing && (
                        <div className="space-y-4">
                          {/* Verdict Header */}
                          <GlassCard className="p-5">
                            <div className="flex flex-col sm:flex-row items-center gap-5">
                              <ConfidenceMeter score={analysisResult?.confidence_score ?? 0} size={130} />
                              <div className="flex-1 text-center sm:text-left">
                                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-base font-bold ${getVerdictStyle(analysisResult?.verdict ?? '')}`}>
                                  {getVerdictIcon(analysisResult?.verdict ?? '')}
                                  {analysisResult?.verdict ?? 'UNKNOWN'}
                                </span>
                                <div className="mt-3">
                                  {renderMarkdown(analysisResult?.overall_explanation ?? '')}
                                </div>
                              </div>
                            </div>
                          </GlassCard>

                          {/* Analysis Breakdown */}
                          <div className="space-y-3">
                            <AnalysisCard title="Facial Analysis" icon={<RiUserLine className="w-4 h-4" />} score={analysisResult?.facial_analysis?.score ?? 0} findings={analysisResult?.facial_analysis?.findings ?? 'No data available'} />
                            <AnalysisCard title="Temporal Analysis" icon={<RiTimeLine className="w-4 h-4" />} score={analysisResult?.temporal_analysis?.score ?? 0} findings={analysisResult?.temporal_analysis?.findings ?? 'No data available'} />
                            <AnalysisCard title="Audio Analysis" icon={<RiVolumeUpLine className="w-4 h-4" />} score={analysisResult?.audio_analysis?.score ?? 0} findings={analysisResult?.audio_analysis?.findings ?? 'No data available'} />
                          </div>

                          {/* Suspicious Frames */}
                          {Array.isArray(analysisResult?.suspicious_frames) && analysisResult.suspicious_frames.length > 0 && (
                            <GlassCard className="p-5">
                              <div className="flex items-center gap-2 mb-3">
                                <RiEyeLine className="w-5 h-5 text-red-400" />
                                <h3 className="font-sans font-semibold tracking-[0.02em] text-sm">Suspicious Frames</h3>
                                <Badge variant="outline" className="ml-auto text-[10px] border-red-500/30 text-red-400">{analysisResult.suspicious_frames.length} flagged</Badge>
                              </div>
                              <div className="space-y-2">
                                {analysisResult.suspicious_frames.map((frame, i) => (
                                  <div key={i} className="flex items-start gap-3 p-2.5 rounded bg-red-500/5 border border-red-500/10">
                                    <span className="font-mono text-xs font-bold text-red-400 bg-red-500/20 px-2 py-1 rounded shrink-0">F#{frame?.frame_number ?? '?'}</span>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{frame?.description ?? 'No description'}</p>
                                  </div>
                                ))}
                              </div>
                            </GlassCard>
                          )}

                          {/* Recommendations */}
                          {Array.isArray(analysisResult?.recommendations) && analysisResult.recommendations.length > 0 && (
                            <GlassCard className="p-5">
                              <div className="flex items-center gap-2 mb-3">
                                <RiShieldCheckLine className="w-5 h-5 text-[hsl(180,100%,50%)]" />
                                <h3 className="font-sans font-semibold tracking-[0.02em] text-sm">Recommendations</h3>
                              </div>
                              <ul className="space-y-2">
                                {analysisResult.recommendations.map((rec, i) => (
                                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                                    <RiArrowRightLine className="w-4 h-4 text-[hsl(180,100%,50%)]/60 mt-0.5 shrink-0" />
                                    <span className="leading-relaxed">{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </GlassCard>
                          )}

                          {/* Export Button */}
                          <Button onClick={exportCSV} variant="outline" className="w-full border-[hsl(300,80%,50%)]/30 text-[hsl(300,80%,50%)] hover:bg-[hsl(300,80%,50%)]/10 hover:shadow-[0_0_15px_rgba(255,0,255,0.15)]">
                            <RiDownloadLine className="w-4 h-4 mr-2" /> Download Report
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── REPORTS ──────────────────────────────────────────────────────── */}
              {activeTab === 'reports' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h1 className="text-2xl font-sans font-bold tracking-[0.02em] mb-1">Reports & Audit</h1>
                      <p className="text-sm text-muted-foreground font-sans">Historical detection records and compliance documentation</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={exportCSV} disabled={filteredHistory.length === 0} variant="outline" className="border-[rgba(255,255,255,0.15)] text-muted-foreground hover:text-foreground text-xs">
                        <RiDownloadLine className="w-4 h-4 mr-1.5" /> Export CSV
                      </Button>
                    </div>
                  </div>

                  {/* Filter Bar */}
                  <GlassCard className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by source or ID..." className="pl-9 bg-muted/30 border-[rgba(255,255,255,0.1)] text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <RiFilterLine className="w-4 h-4" />
                        </div>
                        {['all', 'AUTHENTIC', 'SUSPICIOUS', 'DEEPFAKE'].map(v => (
                          <button key={v} onClick={() => setFilterVerdict(v)} className={`px-3 py-1.5 rounded text-xs font-sans font-medium transition-all duration-200 ${filterVerdict === v ? 'bg-[hsl(180,100%,50%)]/20 text-[hsl(180,100%,50%)] border border-[hsl(180,100%,50%)]/30' : 'bg-muted/30 text-muted-foreground hover:text-foreground border border-transparent'}`}>
                            {v === 'all' ? 'All' : v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </GlassCard>

                  {/* Results Table */}
                  <GlassCard className="overflow-hidden">
                    {filteredHistory.length === 0 ? (
                      <div className="text-center py-16">
                        <RiFileListLine className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                        <p className="text-sm text-muted-foreground">No detection records found</p>
                        <p className="text-xs text-muted-foreground/50 mt-1">{displayHistory.length === 0 ? 'Run your first analysis to see records here' : 'Try adjusting your filters'}</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[rgba(255,255,255,0.08)] bg-muted/20">
                              <th className="text-left py-3 px-4 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider">ID</th>
                              <th className="text-left py-3 px-4 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider">Timestamp</th>
                              <th className="text-left py-3 px-4 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider">Source</th>
                              <th className="text-left py-3 px-4 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider">Verdict</th>
                              <th className="text-left py-3 px-4 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider">Confidence</th>
                              <th className="text-left py-3 px-4 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider hidden md:table-cell">Reviewer</th>
                              <th className="text-right py-3 px-4 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredHistory.map(r => (
                              <tr key={r.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-muted/15 transition-colors">
                                <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{r.id}</td>
                                <td className="py-3 px-4 text-xs text-muted-foreground">{formatTimestamp(r.timestamp)}</td>
                                <td className="py-3 px-4 font-mono text-xs truncate max-w-[200px]">{r.source}</td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getVerdictStyle(r.verdict)}`}>
                                    {getVerdictIcon(r.verdict)} {r.verdict}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${r.confidence >= 70 ? 'bg-red-500' : r.confidence >= 30 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${r.confidence}%` }} />
                                    </div>
                                    <span className="font-mono text-xs">{r.confidence}%</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-xs text-muted-foreground hidden md:table-cell">{r.reviewer}</td>
                                <td className="py-3 px-4 text-right">
                                  <Button variant="ghost" size="sm" onClick={() => { setSelectedReport(r); setDetailOpen(true) }} className="text-[hsl(180,100%,50%)] hover:bg-[hsl(180,100%,50%)]/10 text-xs h-7 px-2">
                                    <RiEyeLine className="w-3.5 h-3.5 mr-1" /> View
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </GlassCard>
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>

      {/* ── DETAIL DIALOG ──────────────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-[hsl(260,25%,9%)] border-[rgba(255,255,255,0.1)]">
          <DialogHeader>
            <DialogTitle className="font-sans font-bold tracking-[0.02em] flex items-center gap-2">
              <RiFileChartLine className="w-5 h-5 text-[hsl(180,100%,50%)]" />
              Detection Report
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs font-mono">
              {selectedReport?.id ?? ''} -- {selectedReport?.source ?? ''}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 mt-2">
              {/* Verdict + Confidence */}
              <div className="flex items-center gap-4">
                <ConfidenceMeter score={selectedReport.result?.confidence_score ?? selectedReport.confidence ?? 0} size={100} />
                <div>
                  <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${getVerdictStyle(selectedReport.verdict)}`}>
                    {getVerdictIcon(selectedReport.verdict)} {selectedReport.verdict}
                  </span>
                  <p className="text-xs text-muted-foreground mt-2 font-mono">{formatTimestamp(selectedReport.timestamp)}</p>
                  <p className="text-xs text-muted-foreground">Reviewer: {selectedReport.reviewer}</p>
                </div>
              </div>

              {/* Explanation */}
              <div className="p-3 rounded bg-muted/20 border border-[rgba(255,255,255,0.06)]">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-sans">Overall Explanation</h4>
                {renderMarkdown(selectedReport.result?.overall_explanation ?? '')}
              </div>

              {/* Analysis Scores */}
              <div className="space-y-2">
                <AnalysisCard title="Facial Analysis" icon={<RiUserLine className="w-4 h-4" />} score={selectedReport.result?.facial_analysis?.score ?? 0} findings={selectedReport.result?.facial_analysis?.findings ?? 'N/A'} />
                <AnalysisCard title="Temporal Analysis" icon={<RiTimeLine className="w-4 h-4" />} score={selectedReport.result?.temporal_analysis?.score ?? 0} findings={selectedReport.result?.temporal_analysis?.findings ?? 'N/A'} />
                <AnalysisCard title="Audio Analysis" icon={<RiVolumeUpLine className="w-4 h-4" />} score={selectedReport.result?.audio_analysis?.score ?? 0} findings={selectedReport.result?.audio_analysis?.findings ?? 'N/A'} />
              </div>

              {/* Suspicious Frames */}
              {Array.isArray(selectedReport.result?.suspicious_frames) && selectedReport.result.suspicious_frames.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-sans flex items-center gap-1.5">
                    <RiEyeLine className="w-3.5 h-3.5 text-red-400" /> Suspicious Frames ({selectedReport.result.suspicious_frames.length})
                  </h4>
                  <div className="space-y-1.5">
                    {selectedReport.result.suspicious_frames.map((frame, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded bg-red-500/5 border border-red-500/10 text-xs">
                        <span className="font-mono font-bold text-red-400 shrink-0">F#{frame?.frame_number ?? '?'}</span>
                        <span className="text-muted-foreground">{frame?.description ?? ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {Array.isArray(selectedReport.result?.recommendations) && selectedReport.result.recommendations.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-sans flex items-center gap-1.5">
                    <RiShieldCheckLine className="w-3.5 h-3.5 text-[hsl(180,100%,50%)]" /> Recommendations
                  </h4>
                  <ul className="space-y-1.5">
                    {selectedReport.result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <RiArrowRightLine className="w-3.5 h-3.5 text-[hsl(180,100%,50%)]/50 mt-0.5 shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
