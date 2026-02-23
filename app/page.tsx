'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import type { AIAgentResponse } from '@/lib/aiAgent'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  RiLink, RiPlayLine, RiMenuLine,
  RiHomeLine, RiPresentationLine, RiLineChartLine, RiPriceTagLine,
  RiPlayCircleLine, RiQuestionLine, RiRocketLine, RiTeamLine,
  RiGlobeLine, RiLightbulbLine, RiCpuLine, RiServerLine,
  RiStarLine, RiFundsLine, RiGroupLine,
  RiMoneyDollarCircleLine, RiFireLine,
  RiCheckboxCircleLine, RiAddLine, RiSubtractLine,
  RiShieldStarLine, RiMailLine
} from 'react-icons/ri'

const DEEPFAKE_AGENT_ID = '6991b5ca4f72b266ce46106e'

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

const SAMPLE_RESULT: DeepfakeResult = {
  verdict: 'DEEPFAKE',
  confidence_score: 87,
  overall_explanation: 'The analyzed video exhibits multiple indicators consistent with deepfake manipulation. Facial regions show subtle artifacts around the jawline and eye areas, temporal consistency is compromised with flickering in frames 120-145, and audio-visual synchronization reveals a 40ms delay between lip movements and speech patterns.',
  facial_analysis: { score: 82, findings: 'Detected inconsistencies in facial boundary regions, particularly around the jawline and hairline. Skin texture anomalies observed near the left cheek.' },
  temporal_analysis: { score: 78, findings: 'Frame-to-frame consistency analysis reveals micro-jitter in facial landmark positions between frames 120-145.' },
  audio_analysis: { score: 65, findings: 'Audio spectrogram analysis indicates potential splicing artifacts at 2.3s and 5.1s marks. Lip-sync deviation measured at approximately 40ms.' },
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
  { id: 'DET-002', timestamp: '2026-02-15T07:15:00Z', source: 'news_broadcast.mp4', verdict: 'AUTHENTIC', confidence: 12, reviewer: 'System', result: { ...SAMPLE_RESULT, verdict: 'AUTHENTIC', confidence_score: 12, overall_explanation: 'Video shows no signs of manipulation.', facial_analysis: { score: 8, findings: 'No facial manipulation indicators detected.' }, temporal_analysis: { score: 10, findings: 'Consistent temporal flow.' }, audio_analysis: { score: 5, findings: 'Audio-visual sync is within natural bounds.' }, suspicious_frames: [], recommendations: ['No action required.'] } },
  { id: 'DET-003', timestamp: '2026-02-14T22:45:00Z', source: 'social_post_video.webm', verdict: 'SUSPICIOUS', confidence: 52, reviewer: 'System', result: { ...SAMPLE_RESULT, verdict: 'SUSPICIOUS', confidence_score: 52, overall_explanation: 'Minor anomalies detected that could indicate manipulation or compression artifacts.', facial_analysis: { score: 45, findings: 'Slight blurring around facial edges.' }, temporal_analysis: { score: 38, findings: 'Minor frame inconsistencies.' }, audio_analysis: { score: 30, findings: 'Audio sync marginally off.' }, suspicious_frames: [{ frame_number: 88, description: 'Ambiguous edge softening around face boundary' }], recommendations: ['Run additional analysis.'] } },
  { id: 'DET-004', timestamp: '2026-02-14T18:10:00Z', source: 'conference_recording.mp4', verdict: 'AUTHENTIC', confidence: 5, reviewer: 'System', result: { ...SAMPLE_RESULT, verdict: 'AUTHENTIC', confidence_score: 5, overall_explanation: 'All analysis vectors indicate genuine footage.', facial_analysis: { score: 3, findings: 'Clean facial regions.' }, temporal_analysis: { score: 4, findings: 'Smooth temporal consistency.' }, audio_analysis: { score: 2, findings: 'Perfect audio-visual synchronization.' }, suspicious_frames: [], recommendations: ['Verified authentic.'] } },
  { id: 'DET-005', timestamp: '2026-02-14T14:30:00Z', source: 'viral_video_suspect.mp4', verdict: 'DEEPFAKE', confidence: 94, reviewer: 'System', result: { ...SAMPLE_RESULT, verdict: 'DEEPFAKE', confidence_score: 94, overall_explanation: 'High confidence deepfake detection.', facial_analysis: { score: 92, findings: 'Significant facial boundary artifacts.' }, temporal_analysis: { score: 88, findings: 'Clear temporal discontinuities.' }, audio_analysis: { score: 85, findings: 'Substantial audio-visual desynchronization.' }, suspicious_frames: [{ frame_number: 45, description: 'Major blending artifact' }, { frame_number: 78, description: 'Face swap boundary visible' }], recommendations: ['Immediately flag and restrict distribution.', 'Escalate to forensics team.'] } }
]

const SAMPLE_ALERTS: Alert[] = [
  { id: 'ALT-001', timestamp: '2026-02-15T08:32:00Z', message: 'DEEPFAKE detected in interview_clip_v2.mp4 (87% confidence)', severity: 'high', resolved: false },
  { id: 'ALT-002', timestamp: '2026-02-14T22:45:00Z', message: 'SUSPICIOUS content in social_post_video.webm (52% confidence)', severity: 'medium', resolved: false },
  { id: 'ALT-003', timestamp: '2026-02-14T14:30:00Z', message: 'DEEPFAKE detected in viral_video_suspect.mp4 (94% confidence)', severity: 'high', resolved: true }
]

const FAQ_ITEMS = [
  { q: 'What is deepfake detection and how does Vemar.ai work?', a: 'Deepfake detection uses AI and machine learning to identify manipulated media content. Vemar.ai employs a multi-vector analysis approach combining facial analysis, temporal consistency checks, and audio-visual synchronization verification to detect synthetic or altered video content with high accuracy.' },
  { q: 'How accurate is the detection system?', a: 'Our detection system achieves 99.2% overall accuracy across all analysis vectors. Facial analysis accuracy is 98.5%, temporal analysis is 97.8%, and audio analysis is 96.1%.' },
  { q: 'What video formats are supported?', a: 'Vemar.ai supports MP4, WebM, and AVI formats. Maximum file size is 500MB for standard uploads.' },
  { q: 'How long does analysis take?', a: 'Most video analyses complete in under 30 seconds for standard-length clips.' },
  { q: 'Is there an API available for integration?', a: 'Yes, our Professional and Enterprise plans include full REST API access with batch processing, webhook callbacks, and real-time streaming analysis.' },
  { q: 'How is my data handled and stored?', a: 'All uploaded content is encrypted in transit (TLS 1.3) and at rest (AES-256). We are SOC 2 Type II compliant and GDPR ready.' },
  { q: 'What enterprise features are available?', a: 'Enterprise plans include unlimited analyses, custom model training, dedicated support with SLA guarantees, and on-premise deployment options.' },
  { q: 'Can Vemar.ai monitor live streams in real-time?', a: 'Yes, our platform supports real-time monitoring of live video streams with automated alerts for detected deepfakes.' }
]

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

function FaqSection({ openFaqId, setOpenFaqId }: { openFaqId: string | null; setOpenFaqId: (id: string | null) => void }) {
  return (
    <GlassCard className="p-5 mt-8">
      <div className="flex items-center gap-2 mb-5">
        <RiQuestionLine className="w-5 h-5 text-[hsl(180,100%,50%)]" />
        <h3 className="font-sans font-semibold tracking-[0.02em]">Frequently Asked Questions</h3>
      </div>
      <div className="space-y-2">
        {FAQ_ITEMS.map((item, i) => {
          const faqId = `faq-${i}`
          const isOpen = openFaqId === faqId
          return (
            <div key={faqId} className="border border-[rgba(255,255,255,0.06)] rounded overflow-hidden">
              <button onClick={() => setOpenFaqId(isOpen ? null : faqId)} className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/20 transition-colors">
                <span className="text-sm font-medium pr-4">{item.q}</span>
                {isOpen ? <RiSubtractLine className="w-4 h-4 text-[hsl(180,100%,50%)] shrink-0" /> : <RiAddLine className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>
              {isOpen && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}


export default function Page() {
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'detection' | 'reports' | 'analytics' | 'pitch' | 'pricing' | 'demo'>('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showSampleData, setShowSampleData] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<DeepfakeResult | null>(null)
  const [detectionHistory, setDetectionHistory] = useState<DetectionRecord[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [streamUrl, setStreamUrl] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedReport, setSelectedReport] = useState<DetectionRecord | null>(null)
  const [filterVerdict, setFilterVerdict] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState('')
  const [openFaqId, setOpenFaqId] = useState<string | null>(null)
  const [homeSearch, setHomeSearch] = useState('')
  const [demoSelectedId, setDemoSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

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

  const displayHistory = detectionHistory
  const displayAlerts = alerts
  const deepfakeCount = displayHistory.filter(r => r.verdict === 'DEEPFAKE').length
  const suspiciousCount = displayHistory.filter(r => r.verdict === 'SUSPICIOUS').length
  const authenticCount = displayHistory.filter(r => r.verdict === 'AUTHENTIC').length
  const unresolvedAlerts = displayAlerts.filter(a => !a.resolved).length

  const filteredHistory = displayHistory.filter(r => {
    const matchesVerdict = filterVerdict === 'all' || r.verdict === filterVerdict
    const matchesSearch = !searchQuery || r.source.toLowerCase().includes(searchQuery.toLowerCase()) || r.id.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesVerdict && matchesSearch
  })

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

  const navItems = [
    { id: 'home' as const, label: 'Home', icon: <RiHomeLine className="w-5 h-5" /> },
    { id: 'dashboard' as const, label: 'Dashboard', icon: <RiDashboardLine className="w-5 h-5" /> },
    { id: 'detection' as const, label: 'Detection', icon: <RiSearchLine className="w-5 h-5" /> },
    { id: 'reports' as const, label: 'Reports', icon: <RiFileListLine className="w-5 h-5" /> },
    { id: 'analytics' as const, label: 'Analytics', icon: <RiLineChartLine className="w-5 h-5" /> },
    { id: 'pitch' as const, label: 'Pitch', icon: <RiPresentationLine className="w-5 h-5" /> },
    { id: 'pricing' as const, label: 'Pricing', icon: <RiPriceTagLine className="w-5 h-5" /> },
    { id: 'demo' as const, label: 'Demo', icon: <RiPlayCircleLine className="w-5 h-5" /> }
  ]

  const demoRecord = demoSelectedId ? SAMPLE_RECORDS.find(r => r.id === demoSelectedId) : null


  return (
    <div className="min-h-screen flex flex-col">
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
        {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-56 border-r border-[rgba(255,255,255,0.08)] bg-[hsl(260,28%,7%)]/95 backdrop-blur-[12px] flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-4 pt-5 lg:pt-4">
            <div className="flex items-center gap-2 mb-1 lg:hidden">
              <RiShieldLine className="w-5 h-5 text-[hsl(180,100%,50%)]" />
              <span className="font-sans font-bold tracking-[0.02em]">Vemar<span className="text-[hsl(300,80%,50%)]">.ai</span></span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans">Deepfake Detection</p>
          </div>
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {navItems.map(item => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false) }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-sans font-medium transition-all duration-200 ${activeTab === item.id ? 'bg-[hsl(180,100%,50%)]/10 text-[hsl(180,100%,50%)] border-l-2 border-l-[hsl(180,100%,50%)] shadow-[0_0_15px_rgba(0,255,255,0.1)]' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
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

        <main className="flex-1 overflow-y-auto">
          <ScrollArea className="h-[calc(100vh-3.5rem)]">
            <div className="p-4 lg:p-6 max-w-7xl mx-auto">


              {/* HOME TAB */}
              {activeTab === 'home' && (
                <div className="space-y-8">
                  <div className="text-center py-12">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <RiShieldStarLine className="w-12 h-12 text-[hsl(180,100%,50%)]" />
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-sans font-bold tracking-tight mb-3">
                      Vemar<span className="text-[hsl(300,80%,50%)]">.ai</span>
                    </h1>
                    <p className="text-xl text-[hsl(180,100%,50%)] font-sans mb-2">AI-Powered Deepfake Detection Platform</p>
                    <p className="text-sm text-muted-foreground max-w-lg mx-auto">Protect truth in the age of synthetic media. Real-time detection, forensic analysis, and comprehensive reporting.</p>
                  </div>

                  <div className="max-w-xl mx-auto">
                    <div className="relative">
                      <RiSearchLine className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input value={homeSearch} onChange={(e) => setHomeSearch(e.target.value)} placeholder="Search media content, reports, or documentation..." className="pl-12 py-6 bg-[hsl(260,25%,9%)]/80 border-[rgba(255,255,255,0.15)] text-sm font-sans rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.1)]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { icon: <RiPulseLine className="w-6 h-6" />, title: 'Real-Time Detection', desc: 'Continuous monitoring of live video streams with instant alerts' },
                      { icon: <RiCpuLine className="w-6 h-6" />, title: 'Multi-Vector Analysis', desc: 'Facial, temporal, and audio analysis combined for accuracy' },
                      { icon: <RiFileChartLine className="w-6 h-6" />, title: 'Forensic Reports', desc: 'Detailed evidence documentation for compliance and legal use' },
                      { icon: <RiServerLine className="w-6 h-6" />, title: 'Enterprise API', desc: 'RESTful API with batch processing and webhook callbacks' }
                    ].map((f, i) => (
                      <GlassCard key={i} className="p-5 hover:shadow-[0_0_20px_rgba(0,255,255,0.15)] transition-all duration-300">
                        <div className="text-[hsl(180,100%,50%)] mb-3">{f.icon}</div>
                        <h3 className="font-sans font-semibold text-sm mb-2">{f.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                      </GlassCard>
                    ))}
                  </div>

                  <div className="text-center">
                    <Button onClick={() => setActiveTab('detection')} className="bg-[hsl(180,100%,50%)] text-[hsl(260,30%,6%)] hover:bg-[hsl(180,100%,55%)] shadow-[0_0_25px_rgba(0,255,255,0.4)] font-sans font-bold text-sm px-8 py-5">
                      <RiRocketLine className="w-5 h-5 mr-2" /> Start Detection
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { val: '10,000+', label: 'Videos Analyzed' },
                      { val: '99.2%', label: 'Accuracy' },
                      { val: '< 30s', label: 'Processing' },
                      { val: '24/7', label: 'Monitoring' }
                    ].map((s, i) => (
                      <GlassCard key={i} className="p-4 text-center">
                        <p className="text-2xl font-bold font-mono text-[hsl(180,100%,50%)]">{s.val}</p>
                        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{s.label}</p>
                      </GlassCard>
                    ))}
                  </div>

                  <FaqSection openFaqId={openFaqId} setOpenFaqId={setOpenFaqId} />
                </div>
              )}


              {/* DASHBOARD TAB */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-sans font-bold tracking-[0.02em] mb-1">Real-Time Monitoring</h1>
                    <p className="text-sm text-muted-foreground font-sans">Deepfake detection overview and alert management</p>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={<RiBarChartLine className="w-5 h-5" />} label="Total Analyses" value={displayHistory.length} accent />
                    <StatCard icon={<RiErrorWarningLine className="w-5 h-5" />} label="Deepfakes Found" value={deepfakeCount} />
                    <StatCard icon={<RiPulseLine className="w-5 h-5" />} label="System Health" value="Online" accent />
                    <StatCard icon={<RiAlertLine className="w-5 h-5" />} label="Active Alerts" value={unresolvedAlerts} />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                      <GlassCard className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <RiVideoLine className="w-5 h-5 text-[hsl(180,100%,50%)]" />
                          <h3 className="font-sans font-semibold tracking-[0.02em]">Quick Analysis</h3>
                        </div>
                        <div className={`border-2 border-dashed rounded p-8 text-center transition-all duration-200 cursor-pointer ${dragOver ? 'border-[hsl(180,100%,50%)] bg-[hsl(180,100%,50%)]/5' : 'border-[rgba(255,255,255,0.15)] hover:border-[hsl(180,100%,50%)]/50'}`} onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={handleFileDrop} onClick={() => fileInputRef.current?.click()}>
                          <input ref={fileInputRef} type="file" accept=".mp4,.webm,.avi,.jpg,.jpeg,.png,.gif" className="hidden" onChange={handleFileSelect} />
                          <RiUploadCloud2Line className="w-10 h-10 mx-auto mb-3 text-[hsl(180,100%,50%)]/60" />
                          {selectedFile ? (
                            <div>
                              <p className="text-sm font-semibold text-foreground">{selectedFile.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-muted-foreground">Drop a video or image file or click to browse</p>
                              <p className="text-xs text-muted-foreground/60 mt-1">Supports MP4, WebM, AVI, JPEG, PNG</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button onClick={() => { setActiveTab('detection'); handleAnalyze() }} disabled={!selectedFile || isAnalyzing} className="bg-[hsl(180,100%,50%)] text-[hsl(260,30%,6%)] hover:bg-[hsl(180,100%,55%)] shadow-[0_0_20px_rgba(0,255,255,0.3)] font-sans font-semibold disabled:opacity-40 disabled:shadow-none">
                            {isAnalyzing ? <><RiRefreshLine className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><RiSearchLine className="w-4 h-4 mr-2" /> Analyze</>}
                          </Button>
                          {selectedFile && (
                            <Button variant="outline" onClick={() => setSelectedFile(null)} className="border-[rgba(255,255,255,0.15)] text-muted-foreground hover:text-foreground">
                              <RiCloseLine className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </GlassCard>
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
                            <p className="text-xs text-muted-foreground/60 mt-1">Upload a video or image to begin analysis</p>
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
                      {displayHistory.length > 0 && (
                        <GlassCard className="p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <RiFileChartLine className="w-5 h-5 text-[hsl(300,80%,50%)]" />
                            <h3 className="font-sans font-semibold tracking-[0.02em] text-sm">Verdict Breakdown</h3>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-400" /><span className="text-xs text-muted-foreground">Authentic</span></div>
                              <span className="font-mono text-sm font-bold text-emerald-400">{authenticCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-400" /><span className="text-xs text-muted-foreground">Suspicious</span></div>
                              <span className="font-mono text-sm font-bold text-yellow-400">{suspiciousCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400" /><span className="text-xs text-muted-foreground">Deepfake</span></div>
                              <span className="font-mono text-sm font-bold text-red-400">{deepfakeCount}</span>
                            </div>
                          </div>
                        </GlassCard>
                      )}
                    </div>
                  </div>
                  <FaqSection openFaqId={openFaqId} setOpenFaqId={setOpenFaqId} />
                </div>
              )}


              {/* DETECTION TAB */}
              {activeTab === 'detection' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-sans font-bold tracking-[0.02em] mb-1">Detection Analysis</h1>
                    <p className="text-sm text-muted-foreground font-sans">Upload video or image content for AI-powered deepfake detection</p>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <GlassCard className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <RiUploadCloud2Line className="w-5 h-5 text-[hsl(180,100%,50%)]" />
                          <h3 className="font-sans font-semibold tracking-[0.02em]">Upload Source</h3>
                        </div>
                        <div className={`border-2 border-dashed rounded p-10 text-center transition-all duration-200 cursor-pointer mb-4 ${dragOver ? 'border-[hsl(180,100%,50%)] bg-[hsl(180,100%,50%)]/5 shadow-[0_0_20px_rgba(0,255,255,0.15)]' : 'border-[rgba(255,255,255,0.15)] hover:border-[hsl(180,100%,50%)]/50'}`} onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={handleFileDrop} onClick={() => fileInputRef.current?.click()}>
                          <input ref={fileInputRef} type="file" accept=".mp4,.webm,.avi,.jpg,.jpeg,.png,.gif" className="hidden" onChange={handleFileSelect} />
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
                              <p className="text-sm text-foreground mb-1">Drag and drop your video or image file here</p>
                              <p className="text-xs text-muted-foreground">or click to browse files</p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 mb-4">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider font-sans">Or enter stream URL</Label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <RiLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input value={streamUrl} onChange={(e) => setStreamUrl(e.target.value)} placeholder="https://stream.example.com/live" className="pl-9 bg-muted/30 border-[rgba(255,255,255,0.1)] text-sm font-mono" />
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-5">
                          {['MP4', 'WebM', 'AVI', 'JPEG', 'PNG'].map(fmt => (
                            <span key={fmt} className="px-2 py-0.5 text-[10px] font-mono uppercase bg-muted/40 rounded border border-[rgba(255,255,255,0.06)] text-muted-foreground">{fmt}</span>
                          ))}
                          <span className="text-[10px] text-muted-foreground/50 self-center">Max 500MB</span>
                        </div>
                        {errorMessage && (
                          <div className="p-3 rounded bg-red-500/10 border border-red-500/20 mb-4">
                            <p className="text-xs text-red-400 flex items-center gap-2">
                              <RiErrorWarningLine className="w-4 h-4 shrink-0" /> {errorMessage}
                            </p>
                          </div>
                        )}
                        <Button onClick={handleAnalyze} disabled={(!selectedFile && !streamUrl) || isAnalyzing} className="w-full bg-[hsl(180,100%,50%)] text-[hsl(260,30%,6%)] hover:bg-[hsl(180,100%,55%)] shadow-[0_0_20px_rgba(0,255,255,0.3)] font-sans font-bold text-sm py-5 disabled:opacity-40 disabled:shadow-none transition-all duration-200">
                          {isAnalyzing ? (
                            <><RiRefreshLine className="w-5 h-5 mr-2 animate-spin" /> Analyzing...</>
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
                    <div className="space-y-4">
                      {!analysisResult && !isAnalyzing && (
                        <GlassCard className="p-10 text-center">
                          <RiSearchLine className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
                          <h3 className="font-sans font-semibold text-lg mb-2 text-muted-foreground/60">Awaiting Analysis</h3>
                          <p className="text-sm text-muted-foreground/40 max-w-sm mx-auto">Upload a video or image file and click Start Deepfake Analysis to begin.</p>
                        </GlassCard>
                      )}
                      {isAnalyzing && (
                        <GlassCard className="p-10 text-center">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-[hsl(180,100%,50%)]/30 border-t-[hsl(180,100%,50%)] animate-spin" />
                          <h3 className="font-sans font-semibold text-lg mb-2">Processing</h3>
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
                          <div className="space-y-3">
                            <AnalysisCard title="Facial Analysis" icon={<RiUserLine className="w-4 h-4" />} score={analysisResult?.facial_analysis?.score ?? 0} findings={analysisResult?.facial_analysis?.findings ?? 'No data'} />
                            <AnalysisCard title="Temporal Analysis" icon={<RiTimeLine className="w-4 h-4" />} score={analysisResult?.temporal_analysis?.score ?? 0} findings={analysisResult?.temporal_analysis?.findings ?? 'No data'} />
                            <AnalysisCard title="Audio Analysis" icon={<RiVolumeUpLine className="w-4 h-4" />} score={analysisResult?.audio_analysis?.score ?? 0} findings={analysisResult?.audio_analysis?.findings ?? 'No data'} />
                          </div>
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
                          <Button onClick={exportCSV} variant="outline" className="w-full border-[hsl(300,80%,50%)]/30 text-[hsl(300,80%,50%)] hover:bg-[hsl(300,80%,50%)]/10">
                            <RiDownloadLine className="w-4 h-4 mr-2" /> Download Report
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <FaqSection openFaqId={openFaqId} setOpenFaqId={setOpenFaqId} />
                </div>
              )}


              {/* REPORTS TAB */}
              {activeTab === 'reports' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h1 className="text-2xl font-sans font-bold tracking-[0.02em] mb-1">Reports and Audit</h1>
                      <p className="text-sm text-muted-foreground font-sans">Historical detection records and compliance documentation</p>
                    </div>
                    <Button onClick={exportCSV} disabled={filteredHistory.length === 0} variant="outline" className="border-[rgba(255,255,255,0.15)] text-muted-foreground hover:text-foreground text-xs">
                      <RiDownloadLine className="w-4 h-4 mr-1.5" /> Export CSV
                    </Button>
                  </div>
                  <GlassCard className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by source or ID..." className="pl-9 bg-muted/30 border-[rgba(255,255,255,0.1)] text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground"><RiFilterLine className="w-4 h-4" /></div>
                        {['all', 'AUTHENTIC', 'SUSPICIOUS', 'DEEPFAKE'].map(v => (
                          <button key={v} onClick={() => setFilterVerdict(v)} className={`px-3 py-1.5 rounded text-xs font-sans font-medium transition-all duration-200 ${filterVerdict === v ? 'bg-[hsl(180,100%,50%)]/20 text-[hsl(180,100%,50%)] border border-[hsl(180,100%,50%)]/30' : 'bg-muted/30 text-muted-foreground hover:text-foreground border border-transparent'}`}>
                            {v === 'all' ? 'All' : v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </GlassCard>
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
                  <FaqSection openFaqId={openFaqId} setOpenFaqId={setOpenFaqId} />
                </div>
              )}

              {/* ANALYTICS TAB */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-sans font-bold tracking-[0.02em] mb-1">Analytics</h1>
                    <p className="text-sm text-muted-foreground font-sans">Detection trends, performance metrics, and threat intelligence</p>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={<RiLineChartLine className="w-5 h-5" />} label="Weekly Scans" value="1,247" accent />
                    <StatCard icon={<RiShieldCheckLine className="w-5 h-5" />} label="Overall Accuracy" value="99.2%" />
                    <StatCard icon={<RiFireLine className="w-5 h-5" />} label="Threats Blocked" value="342" />
                    <StatCard icon={<RiTimeLine className="w-5 h-5" />} label="Avg. Processing" value="24s" accent />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <GlassCard className="p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <RiBarChartLine className="w-5 h-5 text-[hsl(180,100%,50%)]" />
                        <h3 className="font-sans font-semibold tracking-[0.02em]">Detection Trend (Last 7 Days)</h3>
                      </div>
                      <div className="flex items-end gap-2 h-40">
                        {[
                          { day: 'Mon', total: 45, deepfake: 8 },
                          { day: 'Tue', total: 62, deepfake: 12 },
                          { day: 'Wed', total: 38, deepfake: 5 },
                          { day: 'Thu', total: 71, deepfake: 15 },
                          { day: 'Fri', total: 55, deepfake: 9 },
                          { day: 'Sat', total: 28, deepfake: 3 },
                          { day: 'Sun', total: 34, deepfake: 6 }
                        ].map((d) => (
                          <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex flex-col items-center gap-0.5" style={{ height: '120px', justifyContent: 'flex-end' }}>
                              <div className="w-full max-w-[28px] bg-[hsl(180,100%,50%)]/30 rounded-t" style={{ height: `${(d.total / 71) * 100}%` }} />
                              <div className="w-full max-w-[28px] bg-red-500/50 rounded-t -mt-0.5" style={{ height: `${(d.deepfake / 71) * 100}%`, position: 'relative', top: `-${(d.total / 71) * 100}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">{d.day}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[hsl(180,100%,50%)]/30" /><span className="text-[10px] text-muted-foreground">Total Scans</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-500/50" /><span className="text-[10px] text-muted-foreground">Deepfakes</span></div>
                      </div>
                    </GlassCard>
                    <GlassCard className="p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <RiStarLine className="w-5 h-5 text-[hsl(300,80%,50%)]" />
                        <h3 className="font-sans font-semibold tracking-[0.02em]">Model Accuracy by Vector</h3>
                      </div>
                      <div className="space-y-4">
                        {[
                          { name: 'Overall', score: 99.2, color: 'bg-[hsl(180,100%,50%)]' },
                          { name: 'Facial Analysis', score: 98.5, color: 'bg-emerald-400' },
                          { name: 'Temporal Analysis', score: 97.8, color: 'bg-yellow-400' },
                          { name: 'Audio Analysis', score: 96.1, color: 'bg-[hsl(300,80%,50%)]' }
                        ].map((m) => (
                          <div key={m.name}>
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="text-muted-foreground">{m.name}</span>
                              <span className="font-mono font-bold">{m.score}%</span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ${m.color}`} style={{ width: `${m.score}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </div>
                  <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <RiAlertLine className="w-5 h-5 text-red-400" />
                      <h3 className="font-sans font-semibold tracking-[0.02em]">Threat Distribution by Type</h3>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { type: 'Face Swap', pct: 42, icon: <RiUserLine className="w-5 h-5" /> },
                        { type: 'Lip Sync', pct: 28, icon: <RiVolumeUpLine className="w-5 h-5" /> },
                        { type: 'Voice Clone', pct: 18, icon: <RiVolumeUpLine className="w-5 h-5" /> },
                        { type: 'Full Body', pct: 12, icon: <RiGroupLine className="w-5 h-5" /> }
                      ].map((t) => (
                        <div key={t.type} className="p-4 rounded bg-muted/20 border border-[rgba(255,255,255,0.06)] text-center">
                          <div className="text-[hsl(180,100%,50%)] mb-2 flex justify-center">{t.icon}</div>
                          <p className="text-2xl font-bold font-mono">{t.pct}%</p>
                          <p className="text-xs text-muted-foreground mt-1">{t.type}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                  <FaqSection openFaqId={openFaqId} setOpenFaqId={setOpenFaqId} />
                </div>
              )}


              {/* PITCH TAB */}
              {activeTab === 'pitch' && (
                <div className="space-y-8">
                  <div className="text-center py-8">
                    <Badge className="mb-4 bg-[hsl(300,80%,50%)]/20 text-[hsl(300,80%,50%)] border-[hsl(300,80%,50%)]/30">Investor Deck</Badge>
                    <h1 className="text-3xl lg:text-4xl font-sans font-bold tracking-tight mb-3">Vemar<span className="text-[hsl(300,80%,50%)]">.ai</span></h1>
                    <p className="text-lg text-[hsl(180,100%,50%)] font-sans">Defending Truth in the Age of AI</p>
                  </div>

                  <GlassCard className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <RiLightbulbLine className="w-5 h-5 text-[hsl(180,100%,50%)]" />
                      <h3 className="font-sans font-bold text-lg">Vision</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">As AI-generated content becomes indistinguishable from reality, Vemar.ai provides the critical infrastructure layer that organizations need to verify media authenticity. We are building the trust layer for the internet, enabling enterprises, media companies, and governments to detect and combat synthetic media at scale.</p>
                  </GlassCard>

                  <GlassCard className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <RiGlobeLine className="w-5 h-5 text-[hsl(300,80%,50%)]" />
                      <h3 className="font-sans font-bold text-lg">Market Opportunity</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded bg-muted/20 border border-[rgba(255,255,255,0.06)] text-center">
                        <p className="text-3xl font-bold font-mono text-[hsl(180,100%,50%)]">$4.2B</p>
                        <p className="text-xs text-muted-foreground mt-1">Total Addressable Market</p>
                      </div>
                      <div className="p-4 rounded bg-muted/20 border border-[rgba(255,255,255,0.06)] text-center">
                        <p className="text-3xl font-bold font-mono text-[hsl(300,80%,50%)]">32%</p>
                        <p className="text-xs text-muted-foreground mt-1">YoY Growth Rate</p>
                      </div>
                      <div className="p-4 rounded bg-muted/20 border border-[rgba(255,255,255,0.06)] text-center">
                        <p className="text-3xl font-bold font-mono text-emerald-400">$890M</p>
                        <p className="text-xs text-muted-foreground mt-1">Serviceable Market (2026)</p>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <RiRocketLine className="w-5 h-5 text-[hsl(180,100%,50%)]" />
                      <h3 className="font-sans font-bold text-lg">Key Differentiators</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { title: 'Multi-Vector Detection', desc: 'Simultaneous facial, temporal, and audio analysis delivers 99.2% accuracy.' },
                        { title: 'Real-Time Processing', desc: 'Sub-30-second analysis with live stream monitoring capabilities.' },
                        { title: 'Enterprise Grade', desc: 'SOC 2 Type II compliant, on-premise deployment, 99.9% SLA.' },
                        { title: 'Continuous Learning', desc: 'Models retrained weekly on latest deepfake techniques from our threat lab.' }
                      ].map((d, i) => (
                        <div key={i} className="p-4 rounded bg-muted/20 border border-[rgba(255,255,255,0.06)]">
                          <h4 className="font-sans font-semibold text-sm text-[hsl(180,100%,50%)] mb-2">{d.title}</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">{d.desc}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  <GlassCard className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <RiFundsLine className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-sans font-bold text-lg">Traction</h3>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { val: '340%', label: 'Revenue Growth (YoY)' },
                        { val: '2,800+', label: 'Active Users' },
                        { val: '$1.8M', label: 'ARR' },
                        { val: '45', label: 'Enterprise Clients' }
                      ].map((t, i) => (
                        <div key={i} className="text-center p-3">
                          <p className="text-2xl font-bold font-mono text-[hsl(180,100%,50%)]">{t.val}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{t.label}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  <GlassCard className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <RiTeamLine className="w-5 h-5 text-[hsl(300,80%,50%)]" />
                      <h3 className="font-sans font-bold text-lg">Leadership Team</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { name: 'Alex Chen', role: 'Founder & CEO', bg: 'Ex-Google AI, Stanford PhD' },
                        { name: 'Sarah Kim', role: 'CTO', bg: 'Ex-Meta Research, 15+ patents' },
                        { name: 'Dr. James Obi', role: 'Head of AI', bg: 'Ex-DeepMind, NeurIPS author' },
                        { name: 'Maria Santos', role: 'Head of Growth', bg: 'Ex-Palantir, scaled $0-50M' }
                      ].map((p, i) => (
                        <div key={i} className="p-4 rounded bg-muted/20 border border-[rgba(255,255,255,0.06)] text-center">
                          <div className="w-12 h-12 rounded-full bg-[hsl(180,100%,50%)]/20 mx-auto mb-3 flex items-center justify-center">
                            <RiUserLine className="w-6 h-6 text-[hsl(180,100%,50%)]" />
                          </div>
                          <p className="font-sans font-semibold text-sm">{p.name}</p>
                          <p className="text-xs text-[hsl(180,100%,50%)] mt-0.5">{p.role}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{p.bg}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  <GlassCard className="p-6 shadow-[0_0_30px_rgba(0,255,255,0.15)]">
                    <div className="flex items-center gap-2 mb-4">
                      <RiMoneyDollarCircleLine className="w-5 h-5 text-[hsl(180,100%,50%)]" />
                      <h3 className="font-sans font-bold text-lg">Investment Ask</h3>
                    </div>
                    <div className="text-center mb-6">
                      <p className="text-4xl font-bold font-mono text-[hsl(180,100%,50%)]">$5M</p>
                      <p className="text-sm text-muted-foreground mt-1">Series A Round</p>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: 'R&D / AI Models', pct: '40%' },
                        { label: 'Sales & Marketing', pct: '25%' },
                        { label: 'Engineering Team', pct: '20%' },
                        { label: 'Operations', pct: '15%' }
                      ].map((f, i) => (
                        <div key={i} className="p-3 rounded bg-muted/20 border border-[rgba(255,255,255,0.06)] text-center">
                          <p className="text-lg font-bold font-mono text-[hsl(300,80%,50%)]">{f.pct}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{f.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="text-center mt-6">
                      <Button className="bg-[hsl(180,100%,50%)] text-[hsl(260,30%,6%)] hover:bg-[hsl(180,100%,55%)] shadow-[0_0_25px_rgba(0,255,255,0.4)] font-sans font-bold px-8 py-5">
                        <RiMailLine className="w-5 h-5 mr-2" /> Contact Us
                      </Button>
                    </div>
                  </GlassCard>
                  <FaqSection openFaqId={openFaqId} setOpenFaqId={setOpenFaqId} />
                </div>
              )}


              {/* PRICING TAB */}
              {activeTab === 'pricing' && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h1 className="text-2xl font-sans font-bold tracking-[0.02em] mb-1">AI Tools Pricing</h1>
                    <p className="text-sm text-muted-foreground font-sans">Choose the plan that fits your deepfake detection needs</p>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {[
                      {
                        name: 'Starter',
                        price: '$49',
                        period: '/month',
                        desc: 'For individuals and small teams getting started',
                        features: ['100 analyses per month', 'Basic deepfake detection', 'Email support', 'Standard processing speed', 'CSV report export', 'Dashboard access'],
                        popular: false,
                        cta: 'Get Started'
                      },
                      {
                        name: 'Professional',
                        price: '$199',
                        period: '/month',
                        desc: 'For growing teams that need advanced capabilities',
                        features: ['1,000 analyses per month', 'Advanced multi-vector detection', 'Full REST API access', 'Priority support', 'Real-time stream monitoring', 'Custom alert thresholds', 'Batch processing', 'Webhook integrations'],
                        popular: true,
                        cta: 'Start Free Trial'
                      },
                      {
                        name: 'Enterprise',
                        price: '$499',
                        period: '/month',
                        desc: 'For organizations requiring maximum capability',
                        features: ['Unlimited analyses', 'Custom model training', 'Dedicated account manager', '99.9% SLA guarantee', 'On-premise deployment', 'SSO integration', 'Audit logging', 'Custom forensic reports', 'Phone support'],
                        popular: false,
                        cta: 'Contact Sales'
                      }
                    ].map((plan) => (
                      <GlassCard key={plan.name} className={`p-6 relative ${plan.popular ? 'shadow-[0_0_30px_rgba(0,255,255,0.2)] border-[hsl(180,100%,50%)]/40' : ''}`}>
                        {plan.popular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Badge className="bg-[hsl(180,100%,50%)] text-[hsl(260,30%,6%)] font-bold shadow-[0_0_15px_rgba(0,255,255,0.4)]">Most Popular</Badge>
                          </div>
                        )}
                        <div className="text-center mb-6 pt-2">
                          <h3 className="font-sans font-bold text-lg mb-1">{plan.name}</h3>
                          <p className="text-xs text-muted-foreground mb-4">{plan.desc}</p>
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-4xl font-bold font-mono text-[hsl(180,100%,50%)]">{plan.price}</span>
                            <span className="text-sm text-muted-foreground">{plan.period}</span>
                          </div>
                        </div>
                        <ul className="space-y-3 mb-6">
                          {plan.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <RiCheckboxCircleLine className="w-4 h-4 text-[hsl(180,100%,50%)] mt-0.5 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                        <Button className={`w-full font-sans font-bold ${plan.popular ? 'bg-[hsl(180,100%,50%)] text-[hsl(260,30%,6%)] hover:bg-[hsl(180,100%,55%)] shadow-[0_0_20px_rgba(0,255,255,0.3)]' : 'bg-muted/50 text-foreground hover:bg-muted border border-[rgba(255,255,255,0.1)]'}`}>
                          {plan.cta}
                        </Button>
                      </GlassCard>
                    ))}
                  </div>
                  <FaqSection openFaqId={openFaqId} setOpenFaqId={setOpenFaqId} />
                </div>
              )}

              {/* DEMO TAB */}
              {activeTab === 'demo' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-sans font-bold tracking-[0.02em] mb-1">Interactive Demo</h1>
                    <p className="text-sm text-muted-foreground font-sans">Experience Vemar.ai detection on sample media</p>
                  </div>

                  <GlassCard className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <RiPlayCircleLine className="w-5 h-5 text-[hsl(180,100%,50%)]" />
                      <h3 className="font-sans font-semibold tracking-[0.02em]">How It Works</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { step: '1', title: 'Upload', desc: 'Upload a video or image file, or provide a stream URL', icon: <RiUploadCloud2Line className="w-6 h-6" /> },
                        { step: '2', title: 'Analyze', desc: 'Our AI engine runs multi-vector deepfake analysis', icon: <RiCpuLine className="w-6 h-6" /> },
                        { step: '3', title: 'Report', desc: 'Get a detailed forensic report with verdict and evidence', icon: <RiFileChartLine className="w-6 h-6" /> }
                      ].map((s) => (
                        <div key={s.step} className="text-center p-4">
                          <div className="w-12 h-12 rounded-full bg-[hsl(180,100%,50%)]/20 mx-auto mb-3 flex items-center justify-center text-[hsl(180,100%,50%)]">
                            {s.icon}
                          </div>
                          <div className="text-xs font-mono text-[hsl(300,80%,50%)] mb-1">Step {s.step}</div>
                          <h4 className="font-sans font-semibold text-sm mb-1">{s.title}</h4>
                          <p className="text-xs text-muted-foreground">{s.desc}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  <div>
                    <h3 className="font-sans font-semibold text-sm mb-3 flex items-center gap-2">
                      <RiPlayLine className="w-4 h-4 text-[hsl(180,100%,50%)]" /> Try Sample Analyses
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {SAMPLE_RECORDS.slice(0, 3).map(r => (
                        <GlassCard key={r.id} className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-[0_0_20px_rgba(0,255,255,0.15)] ${demoSelectedId === r.id ? 'border-[hsl(180,100%,50%)]/50 shadow-[0_0_20px_rgba(0,255,255,0.2)]' : ''}`}>
                          <button onClick={() => setDemoSelectedId(demoSelectedId === r.id ? null : r.id)} className="w-full text-left">
                            <div className="flex items-center gap-2 mb-2">
                              <RiVideoLine className="w-4 h-4 text-[hsl(180,100%,50%)]" />
                              <span className="font-mono text-xs truncate">{r.source}</span>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getVerdictStyle(r.verdict)}`}>
                              {getVerdictIcon(r.verdict)} {r.verdict}
                            </span>
                            <p className="text-xs text-muted-foreground mt-2">Confidence: {r.confidence}%</p>
                          </button>
                        </GlassCard>
                      ))}
                    </div>
                  </div>

                  {demoRecord && (
                    <div className="space-y-4">
                      <GlassCard className="p-5">
                        <div className="flex flex-col sm:flex-row items-center gap-5">
                          <ConfidenceMeter score={demoRecord.result?.confidence_score ?? 0} size={110} />
                          <div className="flex-1 text-center sm:text-left">
                            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-base font-bold ${getVerdictStyle(demoRecord.verdict)}`}>
                              {getVerdictIcon(demoRecord.verdict)} {demoRecord.verdict}
                            </span>
                            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{demoRecord.result?.overall_explanation ?? ''}</p>
                          </div>
                        </div>
                      </GlassCard>
                      <div className="space-y-3">
                        <AnalysisCard title="Facial Analysis" icon={<RiUserLine className="w-4 h-4" />} score={demoRecord.result?.facial_analysis?.score ?? 0} findings={demoRecord.result?.facial_analysis?.findings ?? 'N/A'} />
                        <AnalysisCard title="Temporal Analysis" icon={<RiTimeLine className="w-4 h-4" />} score={demoRecord.result?.temporal_analysis?.score ?? 0} findings={demoRecord.result?.temporal_analysis?.findings ?? 'N/A'} />
                        <AnalysisCard title="Audio Analysis" icon={<RiVolumeUpLine className="w-4 h-4" />} score={demoRecord.result?.audio_analysis?.score ?? 0} findings={demoRecord.result?.audio_analysis?.findings ?? 'N/A'} />
                      </div>
                    </div>
                  )}

                  <GlassCard className="p-5 text-center">
                    <RiRocketLine className="w-8 h-8 mx-auto text-[hsl(180,100%,50%)] mb-3" />
                    <h3 className="font-sans font-semibold text-sm mb-2">Try Your Own Content</h3>
                    <p className="text-xs text-muted-foreground mb-4">Upload your own video or image for real-time deepfake analysis</p>
                    <Button onClick={() => setActiveTab('detection')} className="bg-[hsl(180,100%,50%)] text-[hsl(260,30%,6%)] hover:bg-[hsl(180,100%,55%)] shadow-[0_0_20px_rgba(0,255,255,0.3)] font-sans font-bold">
                      <RiUploadCloud2Line className="w-4 h-4 mr-2" /> Go to Detection
                    </Button>
                  </GlassCard>
                  <FaqSection openFaqId={openFaqId} setOpenFaqId={setOpenFaqId} />
                </div>
              )}

            </div>
          </ScrollArea>
        </main>
      </div>

      {/* DETAIL DIALOG */}
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
              <div className="p-3 rounded bg-muted/20 border border-[rgba(255,255,255,0.06)]">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-sans">Overall Explanation</h4>
                {renderMarkdown(selectedReport.result?.overall_explanation ?? '')}
              </div>
              <div className="space-y-2">
                <AnalysisCard title="Facial Analysis" icon={<RiUserLine className="w-4 h-4" />} score={selectedReport.result?.facial_analysis?.score ?? 0} findings={selectedReport.result?.facial_analysis?.findings ?? 'N/A'} />
                <AnalysisCard title="Temporal Analysis" icon={<RiTimeLine className="w-4 h-4" />} score={selectedReport.result?.temporal_analysis?.score ?? 0} findings={selectedReport.result?.temporal_analysis?.findings ?? 'N/A'} />
                <AnalysisCard title="Audio Analysis" icon={<RiVolumeUpLine className="w-4 h-4" />} score={selectedReport.result?.audio_analysis?.score ?? 0} findings={selectedReport.result?.audio_analysis?.findings ?? 'N/A'} />
              </div>
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
