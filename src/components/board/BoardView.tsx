'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Plus, Loader2, X, MoreHorizontal,
  ChevronDown, Filter, Share2, Users, Lock,
  Globe, Building2, Eye, Pencil, Copy, Link,
  Check, Search, Trash2, LayoutGrid, Table as TableIcon,
  Calendar as CalendarIcon, Clock, BarChart3, Map as MapIcon
} from 'lucide-react'
import { boardsAPI, listsAPI } from '@/lib/kanban-api'
import { Board } from './Board'
import { TaskDetailModal } from './TaskDetailModal'
import { CalendarView as CalendarViewComponent } from './CalendarView'
import { BoardSkeleton, BoardLoadingIndicator } from './BoardSkeleton'
import { useAuth } from '@/lib/auth-context'
import { usePrefetchStore } from '@/lib/store/prefetch-store'
import { useSocket } from '@/hooks/useSocket'

/* ─────────────────────────── Design tokens (CADBURY PURPLE THEME) ── */
const DS = {
  boardBg:     '#F8F9FA',
  listBg:      '#EBE8F0',
  listBorder:  '#D4CCE2',
  inputBg:     '#FFFFFF',
  inputBorder: '#D1D5DB',
  // Base surfaces — light theme
  bg0:        '#F8F9FA', // main background (light grey)
  bg1:        '#FFFFFF', // card / panel surface (white)
  bg2:        '#F3F4F6', // hover row (light grey)
  bg3:        '#E5E7EB', // border / divider (light border)
  // Text
  textPrimary:'#111827', // body text (dark)
  textMuted:  '#6B7280', // secondary / labels (grey)
  textWhite:  '#FFFFFF',
  // Accent (Cadbury Purple)
  accent:     '#4A1F6F',
  accentHover:'#6B2D8E',
  accentDark: '#2D0F47',
  // Gold accent
  gold:       '#D9A441',
  // Danger
  danger:     '#EF4444',
  // Header — white surface
  headerBg:   '#FFFFFF',
  headerBorder:'#E5E7EB',
}

/* ─────────────────────────── Types ─────────────────────────── */
interface BoardObj { id:string; name:string; description?:string; project_id:string; position:number; created_at:string; background_image?: string | null; background_color?: string | null }
interface List  { id:string; public_id:string; name:string; position:number; color:string; board_id:string }
interface Task  {
  id:string; public_id:string; title:string; description?:string; list_id:string
  assigned_to?:string; due_date?:string; priority:'low'|'medium'|'high'|'urgent'
  status:string; completion_percentage:number; position:number; cover_color?:string
  labels?:Array<{colorId:string;name?:string}>; checklist_stats?:{completed:number;total:number}
  comment_count?:number; attachment_count?:number
  assigned_user?:{id:string;name:string;email:string}
}
interface BoardData { board:BoardObj; lists:List[]; tasks:Task[]; labels:any[]; members:any[] }
interface BoardViewProps { projectId?:string; autoLoadFirstProject?:boolean; initialBoardId?:string; onBack?:()=>void }

/* ─────────────────── Avatar ───────────────────────────────── */
const PALETTE = ['#4A1F6F','#6B2D8E','#2D0F47','#8B3DB5','#D9A441','#5E2780','#7C3AA7','#3A1660']
function initials(u:any){ return ((u?.name||u?.email||'?').charAt(0)).toUpperCase() }
function Avatar({ user, idx=0, size='md', overlap=false }:{ user:any; idx?:number; size?:'sm'|'md'; overlap?:boolean }){
  const s  = size==='sm' ? 28 : 32
  const fs = size==='sm' ? 11 : 12
  const bg = PALETTE[idx % PALETTE.length]
  return (
    <div style={{
      width:s, height:s, borderRadius:'50%', background:bg,
      color:'#FFFFFF', display:'flex', alignItems:'center', justifyContent:'center',
      fontWeight:700, fontSize:fs, flexShrink:0, cursor:'pointer',
      border:`2px solid ${DS.bg1}`,
      marginLeft: overlap ? -8 : 0,
      transition:'transform .15s',
    }}
    onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.12)')}
    onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}
    title={user?.name||user?.email}
    >
      {initials(user)}
    </div>
  )
}

/* ─────────────────── Dropdown ─────────────────────────────── */
function Dropdown({ trigger, panel, align='left' }:{ trigger:React.ReactNode; panel:(close:()=>void)=>React.ReactNode; align?:'left'|'right' }){
  const [open,setOpen] = useState(false)
  const close = ()=>setOpen(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(()=>{
    const h=(e:MouseEvent)=>{ if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown',h)
    return ()=>setOpen(false)
  },[])
  return (
    <div style={{position:'relative', zIndex: open ? 1000 : 'auto'}} ref={ref}>
      <div onClick={()=>setOpen(v=>!v)}>{trigger}</div>
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', zIndex:1001,
          [align==='right'?'right':'left']:0,
        }} onClick={e=>e.stopPropagation()}>
          {panel(close)}
        </div>
      )}
    </div>
  )
}

/* ─────────────────── Panel shell ──────────────────────────── */
function Panel({ children, width=280 }:{ children:React.ReactNode; width?:number }){
  return (
    <div style={{
      width, background:DS.bg1, border:`1px solid ${DS.bg3}`,
      borderRadius:8, boxShadow:'0 8px 32px rgba(0,0,0,0.55)',
      color:DS.textPrimary, fontSize:13,
      backdropFilter:'blur(16px)',
      position: 'relative',
      zIndex: 1002,
    }}>
      {children}
    </div>
  )
}
function PanelHeader({ title, onClose }:{ title:string; onClose:()=>void }){
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'10px 14px', borderBottom:`1px solid ${DS.bg3}` }}>
      <span style={{ fontWeight:600, color:DS.textWhite, fontSize:13 }}>{title}</span>
      <button onClick={onClose} style={iconBtn}><X size={14}/></button>
    </div>
  )
}
function PanelSection({ label }:{ label:string }){
  return <p style={{ padding:'8px 14px 4px', fontSize:11, fontWeight:700,
    textTransform:'uppercase', letterSpacing:'.06em', color:DS.textMuted }}>{label}</p>
}
function PanelDivider(){ return <div style={{ borderTop:`1px solid ${DS.bg3}`, margin:'4px 0' }}/> }
function PanelRow({ icon, label, danger, onClick }:{ icon?:React.ReactNode; label:string; danger?:boolean; onClick?:()=>void }){
  const [hov,setHov]=useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ width:'100%', display:'flex', alignItems:'center', gap:10,
        padding:'7px 14px', background:hov?DS.bg2:'transparent', border:'none',
        color:danger?DS.danger:DS.textPrimary, cursor:'pointer', textAlign:'left', fontSize:13,
        transition:'background .12s' }}>
      {icon && <span style={{ opacity:.8 }}>{icon}</span>}
      {label}
    </button>
  )
}

/* ─────────────────── Shared styles ────────────────────────── */
const iconBtn:React.CSSProperties = {
  background:'transparent', border:'none', cursor:'pointer',
  color:DS.textMuted, display:'flex', alignItems:'center', padding:4, borderRadius:4,
  transition:'color .12s, background .12s',
}
const iconBtnHover:React.CSSProperties = {
  ...iconBtn,
  background: DS.bg2,
}
const headerBtn = (hov:boolean):React.CSSProperties => ({
  display:'flex', alignItems:'center', gap:6,
  padding:'5px 10px', borderRadius:4, border:'none', cursor:'pointer',
  background: hov ? DS.bg2 : 'transparent',
  color: DS.textPrimary, fontSize:13, fontWeight:500,
  transition:'background .12s',
})
const inputStyle:React.CSSProperties = {
  width:'100%', background:DS.bg0, border:`1px solid ${DS.bg3}`,
  borderRadius:4, padding:'6px 10px', color:DS.textWhite, fontSize:13,
  outline:'none', transition:'border-color .15s',
  boxSizing:'border-box',
}

/* ══════════════════════ VIEW COMPONENTS ═══════════════════════ */

// Table View
function TableView({ boardData, onTaskClick }:{ boardData:BoardData; onTaskClick:(t:Task) => void }){
  return (
    <div style={{ height:'100%', overflow:'auto', padding:'16px' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr style={{ borderBottom:`2px solid ${DS.bg3}` }}>
            {['Task','List','Assigned','Priority','Due Date','Status'].map(h=>(
              <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:DS.textMuted, fontWeight:600, fontSize:11, textTransform:'uppercase', letterSpacing:'.06em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {boardData.tasks.map((task,i)=>{
            const list = boardData.lists.find(l=>l.id===task.list_id)
            return (
              <tr key={task.id} onClick={()=>onTaskClick(task)}
                style={{ borderBottom:`1px solid ${DS.bg3}`, cursor:'pointer', transition:'background .12s' }}
                onMouseEnter={e=>(e.currentTarget.style.background=DS.bg2)}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                <td style={{ padding:'12px', color:DS.textPrimary, fontWeight:500 }}>{task.title}</td>
                <td style={{ padding:'12px', color:DS.textMuted }}>{list?.name||'-'}</td>
                <td style={{ padding:'12px' }}>
                  {task.assigned_user
                    ?<div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <Avatar user={task.assigned_user} size="sm" idx={i}/>
                      <span style={{ color:DS.textPrimary, fontSize:12 }}>{task.assigned_user.name}</span>
                    </div>
                    :<span style={{ color:DS.textMuted }}>-</span>
                  }
                </td>
                <td style={{ padding:'12px' }}>
                  <span style={{ padding:'4px 8px', borderRadius:3, fontSize:11, fontWeight:600,
                    background: task.priority==='urgent'?'#F87168':task.priority==='high'?'#FEA362':task.priority==='medium'?'#E2B203':'#94C748',
                    color:'#1D2125' }}>{task.priority.toUpperCase()}</span>
                </td>
                <td style={{ padding:'12px', color:DS.textMuted, fontSize:12 }}>
                  {task.due_date?new Date(task.due_date).toLocaleDateString():'-'}
                </td>
                <td style={{ padding:'12px' }}>
                  <span style={{ padding:'4px 8px', borderRadius:3, fontSize:11, fontWeight:600,
                    background:DS.bg2, color:DS.textPrimary }}>{task.status.replace('_',' ').toUpperCase()}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Timeline View  
function TimelineView({ boardData, onTaskClick }:{ boardData:BoardData; onTaskClick:(t:Task)=>void }){
  const tasksWithDates = boardData.tasks.filter(t=>t.due_date).sort((a,b)=>new Date(a.due_date!).getTime()-new Date(b.due_date!).getTime())
  return (
    <div style={{ height:'100%', overflow:'auto', padding:'24px' }}>
      <div style={{ maxWidth:900, margin:'0 auto' }}>
        <h3 style={{ color:DS.textPrimary, fontSize:16, fontWeight:600, marginBottom:24 }}>Task Timeline</h3>
        <div style={{ position:'relative', paddingLeft:40 }}>
          <div style={{ position:'absolute', left:15, top:0, bottom:0, width:2, background:DS.bg3 }}/>
          {tasksWithDates.map((task,i)=>(
            <div key={task.id} style={{ marginBottom:24, position:'relative' }}>
              <div style={{ position:'absolute', left:-25, top:8, width:12, height:12, borderRadius:'50%',
                background:DS.accent, border:`3px solid ${DS.bg0}` }}/>
              <div onClick={()=>onTaskClick(task)} style={{
                background:DS.bg1, border:`1px solid ${DS.bg3}`, borderRadius:8, padding:16,
                cursor:'pointer', transition:'border-color .15s' }}
                onMouseEnter={e=>(e.currentTarget.style.borderColor=DS.accent)}
                onMouseLeave={e=>(e.currentTarget.style.borderColor=DS.bg3)}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ color:DS.textPrimary, fontWeight:600, fontSize:14 }}>{task.title}</span>
                  <span style={{ color:DS.textMuted, fontSize:11 }}>
                    {new Date(task.due_date!).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                  </span>
                </div>
                <p style={{ color:DS.textMuted, fontSize:12, margin:'0 0 8px' }}>
                  {task.description?.slice(0,120)||(task.description?'...':'')}
                </p>
                {task.assigned_user&&(
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <Avatar user={task.assigned_user} size="sm" idx={i}/>
                    <span style={{ color:DS.textPrimary, fontSize:12 }}>{task.assigned_user.name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Dashboard View
function DashboardView({ boardData, onTaskClick }:{ boardData:BoardData; onTaskClick:(t:Task)=>void }){
  const stats = {
    total: boardData.tasks.length,
    completed: boardData.tasks.filter(t=>t.status==='done').length,
    inProgress: boardData.tasks.filter(t=>t.status==='in_progress').length,
    todo: boardData.tasks.filter(t=>t.status==='todo').length,
    overdue: boardData.tasks.filter(t=>t.due_date&&new Date(t.due_date)<new Date()&&t.status!=='done').length,
  }
  const byPriority = {
    urgent: boardData.tasks.filter(t=>t.priority==='urgent').length,
    high: boardData.tasks.filter(t=>t.priority==='high').length,
    medium: boardData.tasks.filter(t=>t.priority==='medium').length,
    low: boardData.tasks.filter(t=>t.priority==='low').length,
  }
  const completion = stats.total>0?Math.round((stats.completed/stats.total)*100):0
  
  return (
    <div style={{ height:'100%', overflow:'auto', padding:'20px' }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <h3 style={{ color:DS.textPrimary, fontSize:20, fontWeight:700, marginBottom:24 }}>Project Dashboard</h3>
        
        {/* Stats Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:16, marginBottom:24 }}>
          {[
            {label:'Total Tasks',value:stats.total,color:DS.accent},
            {label:'Completed',value:stats.completed,color:'#94C748'},
            {label:'In Progress',value:stats.inProgress,color:'#E2B203'},
            {label:'Overdue',value:stats.overdue,color:'#F87168'},
          ].map(s=>(
            <div key={s.label} style={{ background:DS.bg1, border:`1px solid ${DS.bg3}`, borderRadius:10, padding:20 }}>
              <p style={{ color:DS.textMuted, fontSize:11, textTransform:'uppercase', letterSpacing:'.06em', margin:'0 0 8px' }}>{s.label}</p>
              <p style={{ color:s.color, fontSize:32, fontWeight:700, margin:0 }}>{s.value}</p>
            </div>
          ))}
        </div>
        
        {/* Progress */}
        <div style={{ background:DS.bg1, border:`1px solid ${DS.bg3}`, borderRadius:10, padding:20, marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <span style={{ color:DS.textWhite, fontSize:14, fontWeight:600 }}>Overall Completion</span>
            <span style={{ color:DS.accent, fontSize:18, fontWeight:700 }}>{completion}%</span>
          </div>
          <div style={{ height:12, background:DS.bg0, borderRadius:6, overflow:'hidden' }}>
            <div style={{ height:'100%', background:`linear-gradient(90deg, ${DS.accent} 0%, ${DS.accentHover} 100%)`,
              width:`${completion}%`, transition:'width .3s' }}/>
          </div>
        </div>
        
        {/* Priority Breakdown */}
        <div style={{ background:DS.bg1, border:`1px solid ${DS.bg3}`, borderRadius:10, padding:20, marginBottom:24 }}>
          <p style={{ color:DS.textWhite, fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Tasks by Priority</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {[
              {label:'Urgent',value:byPriority.urgent,color:'#F87168'},
              {label:'High',value:byPriority.high,color:'#FEA362'},
              {label:'Medium',value:byPriority.medium,color:'#E2B203'},
              {label:'Low',value:byPriority.low,color:'#94C748'},
            ].map(p=>(
              <div key={p.label} style={{ textAlign:'center' }}>
                <div style={{ width:60, height:60, margin:'0 auto 8px', borderRadius:'50%',
                   background:p.color+'22', border:`3px solid ${p.color}`,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ color:p.color, fontSize:20, fontWeight:700 }}>{p.value}</span>
                </div>
                <span style={{ color:DS.textMuted, fontSize:11 }}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Recent Tasks */}
        <div style={{ background:DS.bg1, border:`1px solid ${DS.bg3}`, borderRadius:10, padding:20 }}>
          <p style={{ color:DS.textWhite, fontSize:14, fontWeight:600, margin:'0 0 12px' }}>Recent Tasks</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {boardData.tasks.slice(0,5).map((t,i)=>(
              <div key={t.id} onClick={()=>onTaskClick(t)}
                style={{ padding:12, background:DS.bg2, borderRadius:6, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'space-between', transition:'background .12s' }}
                onMouseEnter={e=>(e.currentTarget.style.background=DS.bg2)}
                onMouseLeave={e=>(e.currentTarget.style.background=DS.bg2)}>
                <span style={{ color:DS.textPrimary, fontSize:13 }}>{t.title}</span>
                <span style={{ padding:'3px 8px', borderRadius:3, fontSize:10, fontWeight:600,
                  background:t.priority==='urgent'?'#F87168':t.priority==='high'?'#FEA362':t.priority==='medium'?'#E2B203':'#94C748',
                  color:'#1D2125' }}>{t.priority.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Map View (placeholder)
function MapView({ boardData, onTaskClick }:{ boardData:BoardData; onTaskClick:(t:Task)=>void }){
  return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', maxWidth:400 }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={DS.textMuted} style={{ margin:'0 auto 16px' }}>
          <path d="M1 6 L5 4 L12 7 L19 4 L23 6 L23 18 L19 20 L12 17 L5 20 L1 18 Z" strokeWidth="2"/>
        </svg>
        <h3 style={{ color:DS.textWhite, margin:'0 0 8px', fontSize:18 }}>Map View</h3>
        <p style={{ color:DS.textMuted, margin:0, fontSize:13 }}>
          Map view requires location data for tasks.<br/>
          This feature is coming soon!
        </p>
      </div>
    </div>
  )
}

/* ════════════════════════ MAIN COMPONENT ════════════════════ */
export function BoardView({ projectId, autoLoadFirstProject=true, initialBoardId, onBack }:BoardViewProps){
  const { user } = useAuth()
  const role = user?.role
  const { socket } = useSocket()

  const storeProjects = usePrefetchStore((state) => state.projects)
  const boardDetailsCache = usePrefetchStore((state) => state.boardDetailsCache)

  const [boards,setBoards]         = useState<BoardObj[]>(() => storeProjects || [])
  const [selectedBoard,setSelectedBoard] = useState<BoardObj|null>(() => {
    if (storeProjects && storeProjects.length > 0) {
      if (initialBoardId) {
        return storeProjects.find((b: BoardObj) => b.id === initialBoardId) || storeProjects[0]
      }
      return storeProjects[0]
    }
    return null
  })
  const [loading,setLoading]       = useState(() => {
    if (storeProjects && storeProjects.length > 0) {
      const targetId = initialBoardId || storeProjects[0]?.id
      if (targetId && boardDetailsCache[targetId]) {
        return false
      }
    }
    return true
  })
  const [teamLeaders, setTeamLeaders] = useState<any[]>([])
  
  // Compute canManageBoard permission
  const canManageBoard = useMemo(() => {
    if (!selectedBoard || !user) return false
    if (user.role === 'admin') return true
    if (user.role === 'team leader' && (selectedBoard as any).team_leader_id === user.id) return true
    return false
  }, [selectedBoard, user])
  
  // Board creation state
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [newBoardDesc, setNewBoardDesc] = useState('')
  const [creatingBoard, setCreatingBoard] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleCreateBoard = async () => {
    if (!newBoardName.trim() || !currentProjectId) return
    setCreatingBoard(true)
    setErrorMsg('')
    
    // OPTIMISTIC UPDATE - Add board to UI immediately
    const optimisticId = `temp-${Date.now()}`
    const optimisticBoard = {
      id: optimisticId,
      name: newBoardName.trim(),
      description: newBoardDesc.trim() || undefined,
      project_id: currentProjectId,
      position: boards.length,
      created_at: new Date().toISOString()
    }
    
    // Add to UI and select it
    setBoards(prev => [...prev, optimisticBoard])
    setSelectedBoard(optimisticBoard)
    setShowCreateBoardModal(false)
    const savedName = newBoardName
    const savedDesc = newBoardDesc
    setNewBoardName('')
    setNewBoardDesc('')
    
    try {
      const r = await boardsAPI.createBoard({
        project_id: currentProjectId,
        name: savedName.trim(),
        description: savedDesc.trim() || undefined
      })
      
      if (r.success && r.data) {
        const board = (r.data as any).board || r.data
        // Replace optimistic board with real one
        setBoards(prev => prev.map(b => b.id === optimisticId ? board : b))
        setSelectedBoard(board)
      } else {
        // Rollback on error
        setBoards(prev => prev.filter(b => b.id !== optimisticId))
        setSelectedBoard(boards[0] || null)
        setErrorMsg(r.error || 'Failed to create board')
        setShowCreateBoardModal(true)
        setNewBoardName(savedName)
        setNewBoardDesc(savedDesc)
      }
    } catch (err: any) {
      // Rollback on error
      setBoards(prev => prev.filter(b => b.id !== optimisticId))
      setSelectedBoard(boards[0] || null)
      setErrorMsg(err.message || 'Error creating board')
      setShowCreateBoardModal(true)
      setNewBoardName(savedName)
      setNewBoardDesc(savedDesc)
    } finally {
      setCreatingBoard(false)
    }
  }
  const [boardData,setBoardData]   = useState<BoardData|null>(() => {
    if (storeProjects && storeProjects.length > 0) {
      const targetId = initialBoardId || storeProjects[0]?.id
      if (targetId && boardDetailsCache[targetId]) {
        return boardDetailsCache[targetId]
      }
    }
    return null
  })
  const [showCreateList,setShowCreateList] = useState(false)
  const [newListName,setNewListName] = useState('')
  const [creating,setCreating]     = useState(false)
  const [currentProjectId]         = useState<string|null>(projectId||null)
  const [error,setError]           = useState<string|null>(null)
  const [selectedTask,setSelectedTask] = useState<any|null>(null)
  const [editingName,setEditingName] = useState(false)
  const [nameInput,setNameInput]   = useState('')
  const [linkCopied,setLinkCopied] = useState(false)
  const [memberSearch,setMemberSearch] = useState('')
  const [inviteEmail,setInviteEmail] = useState('')
  const [currentView,setCurrentView] = useState<'board'|'table'|'timeline'|'calendar'|'dashboard'|'map'>('board')
  const [filterMembers, setFilterMembers] = useState<Set<string>>(new Set())
  const [filterLabels, setFilterLabels] = useState<Set<string>>(new Set())
  const [filterDueDate, setFilterDueDate] = useState<Set<string>>(new Set())
  const [boardLabels, setBoardLabels] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([]) // persistent user list — never gets reset
  const [boardBgColor, setBoardBgColor] = useState<string>('#F8F9FA')
  const [boardBgImage, setBoardBgImage] = useState<string>('')
  const [bgImageInput, setBgImageInput] = useState<string>('')

  useEffect(() => {
    if (selectedBoard) {
      // 1. Check if DB has values
      const dbColor = selectedBoard.background_color
      const dbImage = selectedBoard.background_image

      if (dbColor !== undefined && dbColor !== null) {
        setBoardBgColor(dbColor)
      } else if (user?.id) {
        const savedColor = localStorage.getItem(`board-bg-${user.id}-${selectedBoard.id}`)
        setBoardBgColor(savedColor || '#F8F9FA')
      } else {
        setBoardBgColor('#F8F9FA')
      }

      if (dbImage !== undefined && dbImage !== null) {
        setBoardBgImage(dbImage)
        setBgImageInput(dbImage)
      } else if (user?.id) {
        const savedImage = localStorage.getItem(`board-bg-img-${user.id}-${selectedBoard.id}`)
        setBoardBgImage(savedImage || '')
        setBgImageInput(savedImage || '')
      } else {
        setBoardBgImage('')
        setBgImageInput('')
      }
    }
  }, [selectedBoard, user?.id])

  // Real-time board events (Socket.IO room joining and background updates)
  useEffect(() => {
    if (!socket || !selectedBoard?.id) return

    const boardId = selectedBoard.id
    socket.emit('board:join', boardId)

    const handleBgChanged = (data: {
      boardId: string
      backgroundImage: string | null
      backgroundColor: string | null
    }) => {
      if (data.boardId === boardId) {
        setBoardBgImage(data.backgroundImage || '')
        setBoardBgColor(data.backgroundColor || '#F8F9FA')
        setSelectedBoard(prev => prev ? { ...prev, background_image: data.backgroundImage, background_color: data.backgroundColor } : null)
        setBoards(prev => prev.map(b => b.id === data.boardId ? { ...b, background_image: data.backgroundImage, background_color: data.backgroundColor } : b))
      }
    }

    socket.on('board:background_changed', handleBgChanged)

    return () => {
      socket.off('board:background_changed', handleBgChanged)
      socket.emit('board:leave', boardId)
    }
  }, [socket, selectedBoard?.id])

  /* hover states for header buttons */
  const [hov,setHov] = useState<Record<string,boolean>>({})
  const H = (k:string) => ({ onMouseEnter:()=>setHov(p=>({...p,[k]:true})), onMouseLeave:()=>setHov(p=>({...p,[k]:false})) })

  /* ── init ── */
  useEffect(() => {
    if (currentProjectId) fetchBoards()
    // Fetch all users once on mount — persists across board changes
    fetchAllUsers()
    // Fetch team leaders for board management
    if (user?.role === 'admin') fetchTeamLeaders()
  }, [currentProjectId]);

  const fetchTeamLeaders = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const res = await fetch(`${BACKEND_URL}/api/v1/users`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const u = await res.json()
        const tls = (u.data?.users || []).filter((user: any) => user.role === 'team leader')
        setTeamLeaders(tls)
      }
    } catch (err) {
      console.warn('Failed to fetch team leaders:', err)
    }
  }

  const fetchAllUsers = async () => {
    // Check if we already have users cached globally
    const cachedUsers = usePrefetchStore.getState().allUsers
    if (cachedUsers && cachedUsers.length > 0) {
      setAllUsers(cachedUsers)
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const res = await fetch(`${BACKEND_URL}/api/v1/users`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const u = await res.json()
        const users = u.data?.users || []
        if (users.length > 0) {
          setAllUsers(users)
          usePrefetchStore.setState({ allUsers: users })
          console.log(`✓ Loaded ${users.length} users for board members display`)
        }
      }
    } catch (err) {
      console.warn('Failed to fetch all users:', err)
    }
  }

// Poll board details every 10 minutes (reduced frequency to avoid rate limits and optimize background queries)
useEffect(() => {
  if (!selectedBoard) return;
  const poll = setInterval(() => {
    boardsAPI.getBoardDetails(selectedBoard.id).then(r => {
      if (r.success && r.data) {
        const data = r.data as BoardData
        // Always use allUsers to ensure all employees appear in header
        data.members = allUsers.length > 0 ? allUsers : data.members
        setBoardData(data)
      }
    }).catch(() => {
      // Silently ignore polling errors to prevent disruption
    });
  }, 600_000);
  return () => clearInterval(poll);
}, [selectedBoard?.id, allUsers]);

  const fetchBoards = async ()=>{
    if(!currentProjectId){ setError('No project ID'); setLoading(false); return }
    
    // First, try loading boards from cached store projects
    const cachedProjects = usePrefetchStore.getState().projects
    if (cachedProjects && cachedProjects.length > 0) {
      setBoards(cachedProjects)
      const target = initialBoardId ? cachedProjects.find((b:BoardObj)=>b.id===initialBoardId) : null
      const nextBoard = target || cachedProjects[0]
      setSelectedBoard(nextBoard)
      
      const hasCachedDetails = usePrefetchStore.getState().boardDetailsCache[nextBoard.id]
      if (hasCachedDetails) {
        setLoading(false)
      }
    }
    
    try{
      const r = await boardsAPI.getProjectBoards(currentProjectId)
      if(r.success&&r.data){
        const list = Array.isArray(r.data)?r.data:((r.data as any).boards||[])
        setBoards(list)
        usePrefetchStore.setState({ projects: list })
        
        if(list.length>0){
          const target = initialBoardId ? list.find((b:BoardObj)=>b.id===initialBoardId) : null
          const nextBoard = target || list[0]
          setSelectedBoard(nextBoard)
          
          const hasCachedDetails = usePrefetchStore.getState().boardDetailsCache[nextBoard.id]
          if (hasCachedDetails) {
            setLoading(false)
          }
        } else {
          if (!cachedProjects || cachedProjects.length === 0) {
            setError('No boards found. Create one first.')
            setLoading(false)
          }
        }
      } else {
        if (!cachedProjects || cachedProjects.length === 0) {
          setError(r.error||'Failed to fetch boards')
          setLoading(false)
        }
      }
    } catch {
      if (!cachedProjects || cachedProjects.length === 0) {
        setError('Error fetching boards')
        setLoading(false)
      }
    }
  }

  const fetchBoardData = async (boardId:string)=>{
    // Try to load from Zustand cache first (SWR pattern)
    const cachedData = usePrefetchStore.getState().boardDetailsCache[boardId]
    if (cachedData) {
      setBoardData(cachedData)
      setNameInput(cachedData.board.name)
      if (cachedData.board.background_color !== undefined && cachedData.board.background_color !== null) {
        setBoardBgColor(cachedData.board.background_color)
      }
      if (cachedData.board.background_image !== undefined && cachedData.board.background_image !== null) {
        setBoardBgImage(cachedData.board.background_image)
        setBgImageInput(cachedData.board.background_image)
      } else {
        setBoardBgImage('')
        setBgImageInput('')
      }
      setLoading(false)
    } else {
      setLoading(true)
    }
    
    try{
      const token = localStorage.getItem('authToken')
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const cachedGlobalUsers = usePrefetchStore.getState().allUsers
      
      const [boardDetailsRes, usersRes, labelsRes] = await Promise.allSettled([
        boardsAPI.getBoardDetails(boardId),
        cachedGlobalUsers && cachedGlobalUsers.length > 0 
          ? Promise.resolve({ success: true, data: { users: cachedGlobalUsers } })
          : fetch(`${BACKEND_URL}/api/v1/users`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json().catch(() => ({}))),
        fetch(`${BACKEND_URL}/api/v1/labels/boards/${boardId}`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json().catch(() => ({})))
      ])
      
      let success = false
      let freshData: BoardData | null = null
      
      if (boardDetailsRes.status === 'fulfilled' && boardDetailsRes.value.success && boardDetailsRes.value.data) {
        success = true
        freshData = boardDetailsRes.value.data as BoardData
        
        let finalUsers = cachedGlobalUsers || []
        if (usersRes.status === 'fulfilled') {
          const uVal = usersRes.value as any
          const users = uVal.data?.users || uVal.users || []
          if (users.length > 0) {
            finalUsers = users
            setAllUsers(users)
            usePrefetchStore.setState({ allUsers: users })
          }
        }
        
        if (finalUsers.length > 0) {
          freshData.members = finalUsers
        }
        
        if (labelsRes.status === 'fulfilled') {
          const lVal = labelsRes.value as any
          const labelsList = lVal.data?.labels || lVal.labels || []
          setBoardLabels(labelsList)
        }
        
        setBoardData(freshData)
        setNameInput(freshData.board.name)
        if (freshData.board.background_color !== undefined && freshData.board.background_color !== null) {
          setBoardBgColor(freshData.board.background_color)
        }
        if (freshData.board.background_image !== undefined && freshData.board.background_image !== null) {
          setBoardBgImage(freshData.board.background_image)
          setBgImageInput(freshData.board.background_image)
        } else {
          setBoardBgImage('')
          setBgImageInput('')
        }
        usePrefetchStore.getState().updateBoardDetailsCache(boardId, freshData)
        setLoading(false)
      }
      
      if (!success && !cachedData) {
        setError('Failed to load board data')
        setLoading(false)
      }
    } catch {
      if (!cachedData) {
        setError('Error loading board')
        setLoading(false)
      }
    }
  }

  useEffect(()=>{ if(selectedBoard) fetchBoardData(selectedBoard.id) },[selectedBoard])

  const createList = async (name?: string)=>{
    const listName = name || newListName
    if(!listName.trim()||!selectedBoard||!currentProjectId) return
    
    // Show loading state
    setCreating(true)
    
    // OPTIMISTIC UPDATE - Add list to UI immediately
    const optimisticId = `temp-${Date.now()}`
    const optimisticList = {
      id: optimisticId,
      public_id: optimisticId,
      name: listName.trim(),
      position: boardData?.lists.length || 0,
      color: '#FFFFFF',
      board_id: selectedBoard.id
    }
    
    // Add to UI immediately
    setBoardData(p => p ? { ...p, lists: [...p.lists, optimisticList] } : null)
    setShowCreateList(false)
    setNewListName('')
    
    try{
      const r = await listsAPI.createList({ 
        project_id: currentProjectId, 
        board_id: selectedBoard.id, 
        name: listName.trim(), 
        position: boardData?.lists.length || 0 
      })
      
      if(r.success && r.data){
        // Replace optimistic list with real one
        const realList = (r.data as any).list || r.data
        setBoardData(p => p ? {
          ...p,
          lists: p.lists.map(l => l.id === optimisticId ? realList : l)
        } : null)
      } else {
        // Rollback on error
        setBoardData(p => p ? {
          ...p,
          lists: p.lists.filter(l => l.id !== optimisticId)
        } : null)
        setShowCreateList(true)
        setNewListName(listName)
      }
    } catch(error) {
      // Rollback on error
      setBoardData(p => p ? {
        ...p,
        lists: p.lists.filter(l => l.id !== optimisticId)
      } : null)
      setShowCreateList(true)
      setNewListName(listName)
    } finally { 
      setCreating(false) 
    }
  }

  const saveRename = async ()=>{
    if(!nameInput.trim()||!selectedBoard||!canManageBoard){ setEditingName(false); return }
    try{
      const token=localStorage.getItem('authToken')
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      await fetch(`${BACKEND_URL}/api/v1/boards/${selectedBoard.id}`,{
        method:'PUT', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({name:nameInput})
      })
      setSelectedBoard(p=>p?{...p,name:nameInput}:null)
      setBoards(p=>p.map(b=>b.id===selectedBoard.id?{...b,name:nameInput}:b))
    } finally { setEditingName(false) }
  }

  const copyLink = ()=>{
    navigator.clipboard.writeText(`${window.location.origin}/board/${selectedBoard?.id}`)
    setLinkCopied(true); setTimeout(()=>setLinkCopied(false),2000)
  }

  const filtered = (allUsers.length > 0 ? allUsers : (boardData?.members||[])).filter((m:any)=>{
    const u=m.user||m, q=memberSearch.toLowerCase()
    return (u.name||'').toLowerCase().includes(q)||(u.email||'').toLowerCase().includes(q)
  })

  const filteredTasks = boardData?.tasks.filter(task => {
    if (task.id.startsWith('temp-')) return true
    
    let matchesMember = filterMembers.size === 0
    if (!matchesMember && task.assigned_user) {
      matchesMember = filterMembers.has(task.assigned_user.id) || filterMembers.has(task.assigned_user.email)
    }

    let matchesLabel = filterLabels.size === 0
    if (!matchesLabel) {
      const taskLabelIds = task.labels?.map(l => l.colorId) || []
      matchesLabel = taskLabelIds.some(id => filterLabels.has(id))
    }

    let matchesDue = filterDueDate.size === 0
    if (!matchesDue) {
      if (!task.due_date && filterDueDate.has('No due date')) matchesDue = true
      else if (task.due_date) {
        const due = new Date(task.due_date)
        const now = new Date()
        if (filterDueDate.has('Overdue') && due < now && task.status !== 'done') matchesDue = true
        
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        if (filterDueDate.has('Due next day') && due.toDateString() === tomorrow.toDateString()) matchesDue = true
        
        const nextWeek = new Date(now)
        nextWeek.setDate(nextWeek.getDate() + 7)
        if (filterDueDate.has('Due next week') && due <= nextWeek && due >= now) matchesDue = true
      }
    }

    return matchesMember && matchesLabel && matchesDue
  }) || []

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%',
      background:DS.bg0,
      fontFamily:'var(--font-inter), sans-serif' }}>

      {/* ════════════ SIMPLIFIED HEADER ════════════ */}
      <div style={{
        flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'12px 20px', gap:16,
        background:'#FFFFFF',
        borderBottom:`1px solid ${DS.headerBorder}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        position: 'relative',
        zIndex: 30,
      }}>

        {/* LEFT - Back Button + Board Name */}
        <div style={{ display:'flex', alignItems:'center', gap:12, flex: 1, minWidth: 0 }}>
          
          {/* Back Button */}
          <button 
            onClick={() => onBack ? onBack() : window.history.back()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 6,
              background: 'transparent', border: `1px solid ${DS.bg3}`,
              color: DS.textPrimary, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', transition: 'all .15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = DS.bg2
              e.currentTarget.style.borderColor = DS.textMuted
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = DS.bg3
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </button>

          {/* Board Name with Dropdown Selector */}
          <Dropdown
            align="left"
            trigger={
              <button style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', borderRadius: 6,
                background: 'transparent',
                border: `1px solid ${DS.bg3}`,
                color: '#111827', fontSize: 16, fontWeight: 700,
                cursor: 'pointer', transition: 'all .15s',
                maxWidth: 300,
                fontFamily: 'var(--font-plus-jakarta), sans-serif',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = DS.bg2
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
              }}>
                <span style={{ 
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' 
                }}>
                  {selectedBoard?.name || 'Untitled Board'}
                </span>
                <ChevronDown size={16} />
              </button>
            }
            panel={close => (
              <Panel width={250}>
                <div style={{ padding: '8px' }}>
                  <p style={{ 
                    fontSize: 11, fontWeight: 700, color: DS.textMuted, 
                    textTransform: 'uppercase', letterSpacing: '.5px', 
                    padding: '8px 8px 4px', margin: 0 
                  }}>
                    Select Board
                  </p>
                  {boards.map(board => (
                    <button
                      key={board.id}
                      onClick={() => {
                        setSelectedBoard(board)
                        close()
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: board.id === selectedBoard?.id ? 'rgba(74,31,111,0.08)' : 'transparent',
                        border: 'none',
                        borderRadius: 6,
                        color: board.id === selectedBoard?.id ? '#4A1F6F' : DS.textPrimary,
                        fontSize: 13,
                        fontWeight: board.id === selectedBoard?.id ? 600 : 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all .12s',
                      }}
                      onMouseEnter={e => {
                        if (board.id !== selectedBoard?.id) {
                          e.currentTarget.style.background = DS.bg2
                        }
                      }}
                      onMouseLeave={e => {
                        if (board.id !== selectedBoard?.id) {
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >
                      <span style={{ 
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' 
                      }}>
                        {board.name}
                      </span>
                      {board.id === selectedBoard?.id && (
                        <Check size={14} style={{ flexShrink: 0 }} />
                      )}
                    </button>
                  ))}
                </div>
              </Panel>
            )}
          />
        </div>

        {/* RIGHT - Members + Actions */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink: 0 }}>

          {/* Avatars — show ALL employees */}
          <div style={{ display:'flex', alignItems:'center' }}>
            {(allUsers.length > 0 ? allUsers : (boardData?.members||[])).slice(0,5).map((m:any,i:number)=>(
              <div
                key={i}
                title={(m.user||m)?.name || (m.user||m)?.email}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: ['#4A1F6F','#6B2D8E','#2D0F47','#D9A441','#8B3DB5'][i % 5],
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 12, flexShrink: 0, cursor: 'pointer',
                  border: '2px solid #FFFFFF',
                  marginLeft: i > 0 ? -8 : 0,
                  transition: 'transform .15s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {((m.user||m)?.name || (m.user||m)?.email || '?').charAt(0).toUpperCase()}
              </div>
            ))}
            {(allUsers.length > 0 ? allUsers : (boardData?.members||[])).length > 5 && (
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6',
                color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, border: '2px solid #FFFFFF', marginLeft: -8,
                cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }} title={`${(allUsers.length > 0 ? allUsers : (boardData?.members||[])).length - 5} more members`}>
                +{(allUsers.length > 0 ? allUsers : (boardData?.members||[])).length - 5}
              </div>
            )}
          </div>

          {/* Invite Members */}
          <Dropdown
            align="right"
            trigger={
              <button {...H('inv')} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 6,
                background: hov['inv'] ? DS.bg2 : 'transparent',
                border: `1px solid ${DS.bg3}`,
                color: DS.textPrimary, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', transition: 'all .15s',
              }}>
                <Users size={14}/> Members
              </button>
            }
            panel={close=>(
              <Panel width={300}>
                <PanelHeader title="Board Members" onClose={close}/>
                <div style={{ padding:'12px 14px' }}>
                  <p style={{ fontSize:12, color:DS.textMuted, margin:'0 0 8px', fontWeight:600 }}>
                    All Members ({boardData?.members?.length||0})
                  </p>
                  <div style={{ position:'relative', marginBottom:10 }}>
                    <Search size={12} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:DS.textMuted, pointerEvents:'none' }}/>
                    <input placeholder="Search members…" value={memberSearch}
                      onChange={e=>setMemberSearch(e.target.value)}
                      style={{ ...inputStyle, paddingLeft:26 }}
                      onFocus={e=>(e.target.style.borderColor='#111827')}
                      onBlur={e=>(e.target.style.borderColor=DS.bg3)}/>
                  </div>
                  <div style={{ maxHeight:220, overflowY:'auto' }}>
                    {filtered.length===0
                      ? <p style={{ color:DS.textMuted, textAlign:'center', padding:'16px 0', fontSize:12 }}>No members found</p>
                      : filtered.map((m:any,i:number)=>{
                          const u=m.user||m
                          const colors = ['#4A1F6F','#6B2D8E','#2D0F47','#D9A441','#8B3DB5','#5E2780','#7C3AA7','#3A1660']
                          return (
                            <div key={u.id||i} style={{ display:'flex', alignItems:'center', gap:10,
                              padding:'7px 4px', borderRadius:6, cursor:'default', transition:'background .12s' }}
                              onMouseEnter={e=>(e.currentTarget.style.background='#F3F4F6')}
                              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                              <div style={{
                                width:32, height:32, borderRadius:'50%',
                                background: colors[i % colors.length],
                                color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                                fontWeight:700, fontSize:12, flexShrink:0,
                              }}>
                                {(u.name||u.email||'?').charAt(0).toUpperCase()}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <p style={{ margin:0, color:'#111827', fontWeight:600, fontSize:13,
                                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name}</p>
                                <p style={{ margin:0, color:DS.textMuted, fontSize:11,
                                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</p>
                              </div>
                              <span style={{ fontSize:10, color:'#6B7280', background:'#F3F4F6', padding:'2px 6px', borderRadius:4, flexShrink:0 }}>
                                {u.role || 'member'}
                              </span>
                            </div>
                          )
                        })
                    }
                  </div>
                </div>
              </Panel>
            )}
          />

          {/* Filter */}
          <Dropdown
            align="right"
            trigger={
              <button {...H('fil')} style={headerBtn(hov['fil']||false)}>
                <Filter size={13}/> <span>Filter</span>
              </button>
            }
            panel={close=>(
              <Panel width={280}>
                <PanelHeader title="Filter" onClose={close}/>
                <div style={{ padding:'8px 0' }}>
                  <PanelSection label="Members"/>
                  {(boardData?.members||[]).slice(0,5).map((m:any,i:number)=>{
                    const u=m.user||m
                    const isChecked = filterMembers.has(u.id) || filterMembers.has(u.email)
                    return (
                      <label key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 14px',
                        cursor:'pointer', transition:'background .12s', borderRadius: 4 }}
                        onMouseEnter={e=>(e.currentTarget.style.background='#F3F4F6')}
                        onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                        <input type="checkbox" style={{ accentColor:'#4A1F6F' }}
                          checked={isChecked}
                          onChange={(e)=>{
                            const newSet = new Set(filterMembers)
                            if (e.target.checked) newSet.add(u.id || u.email)
                            else newSet.delete(u.id || u.email)
                            setFilterMembers(newSet)
                          }}/>
                        <div style={{
                          width: 26, height: 26, borderRadius: '50%',
                          background: ['#4A1F6F','#6B2D8E','#2D0F47','#D9A441','#8B3DB5'][i % 5],
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 11, flexShrink: 0,
                        }}>
                          {(u.name||u.email||'?').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize:13, color:'#111827', fontWeight: 500 }}>{u.name||u.email}</span>
                      </label>
                    )
                  })}
                  <PanelDivider/>
                  <PanelSection label="Labels"/>
                  {boardLabels.length === 0 ? (
                    <div style={{ padding:'8px 14px', fontSize:12, color:DS.textMuted, fontStyle:'italic' }}>
                      No labels yet
                    </div>
                  ) : (
                    boardLabels.map(label=>(
                      <label key={label.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 14px',
                        cursor:'pointer', transition:'background .12s', borderRadius: 4 }}
                        onMouseEnter={e=>(e.currentTarget.style.background='#F3F4F6')}
                        onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                        <input type="checkbox" style={{ accentColor:'#4A1F6F' }}
                          checked={filterLabels.has(label.id)}
                          onChange={(e)=>{
                            const newSet = new Set(filterLabels)
                            if (e.target.checked) newSet.add(label.id)
                            else newSet.delete(label.id)
                            setFilterLabels(newSet)
                          }}/>
                        <span style={{ 
                          padding:'4px 10px', borderRadius:4, fontSize:11, fontWeight:700,
                          textTransform:'uppercase', letterSpacing:'.3px',
                          background:label.color||'#E2B203', color:'#FFFFFF'
                        }}>
                          {label.name||'Unnamed'}
                        </span>
                      </label>
                    ))
                  )}
                  <PanelDivider/>
                  <PanelSection label="Due Date"/>
                  {['Overdue','Due next day','Due next week','No due date'].map(d=>(
                    <label key={d} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 14px',
                      cursor:'pointer', transition:'background .12s', borderRadius: 4 }}
                      onMouseEnter={e=>(e.currentTarget.style.background='#F3F4F6')}
                      onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      <input type="checkbox" style={{ accentColor:'#4A1F6F' }}
                        checked={filterDueDate.has(d)}
                        onChange={(e)=>{
                          const newSet = new Set(filterDueDate)
                          if (e.target.checked) newSet.add(d)
                          else newSet.delete(d)
                          setFilterDueDate(newSet)
                        }}/>
                      <span style={{ fontSize:13, color:'#111827' }}>{d}</span>
                    </label>
                  ))}
                </div>
              </Panel>
            )}
          />

          {/* Share */}
          <Dropdown
            align="right"
            trigger={
              <button {...H('sh')} style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'6px 14px', borderRadius:6, border:'none', cursor:'pointer',
                background: hov['sh'] ? '#2D0F47' : '#4A1F6F',
                color: '#FFFFFF', fontSize:13, fontWeight:600,
                transition:'background .15s',
                boxShadow: '0 2px 8px rgba(74,31,111,0.35)',
              }}>
                <Share2 size={14}/> Share
              </button>
            }
            panel={close=>(
              <Panel width={320}>
                <PanelHeader title="Share board" onClose={close}/>
                <div style={{ padding:'12px 14px' }}>
                  <p style={{ fontSize:12, color:DS.textMuted, margin:'0 0 6px' }}>Invite by email</p>
                  <div style={{ display:'flex', gap:6, marginBottom:14 }}>
                    <input 
                      type="email" 
                      placeholder="email@example.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      style={{ ...inputStyle, flex:1 }}
                      onFocus={e=>(e.target.style.borderColor=DS.accent)}
                      onBlur={e=>(e.target.style.borderColor=DS.bg3)}/>
                    <button 
                      onClick={async () => {
                        if (!inviteEmail.trim()) return
                        // Add your invite logic here
                        alert(`Invitation sent to ${inviteEmail}`)
                        setInviteEmail('')
                      }}
                      style={{ padding:'6px 12px', background:DS.accentDark, color:'#fff',
                        border:'none', borderRadius:4, cursor:'pointer', fontSize:13, fontWeight:600 }}>
                      Send
                    </button>
                  </div>
                  <PanelDivider/>
                  <p style={{ fontSize:12, color:DS.textMuted, margin:'10px 0 6px' }}>Board link</p>
                  <div style={{ display:'flex', gap:6 }}>
                    <input readOnly value={`${typeof window!=='undefined'?window.location.origin:''}/board/${selectedBoard?.id}`}
                      style={{ ...inputStyle, flex:1, fontSize:11, color:DS.textMuted }}/>
                    <button onClick={copyLink} style={{ display:'flex', alignItems:'center', gap:5,
                      padding:'6px 12px', background:DS.bg2, color:DS.textPrimary,
                      border:`1px solid ${DS.bg3}`, borderRadius:4, cursor:'pointer', fontSize:13,
                      transition:'background .12s', whiteSpace:'nowrap' }}>
                      {linkCopied?<Check size={13} style={{ color:'#61BD4F' }}/>:<Copy size={13}/>}
                      {linkCopied?'Copied':'Copy'}
                    </button>
                  </div>
                </div>
              </Panel>
            )}
          />

          {/* More */}
          <Dropdown
            align="right"
            trigger={
              <button {...H('more')} style={{ ...iconBtn,
                background:hov['more']?DS.bg2:'transparent',
                padding:'5px 6px', borderRadius:4, color:DS.textPrimary }}>
                <MoreHorizontal size={17}/>
              </button>
            }
            panel={close=>(
              <Panel width={220}>
                <PanelSection label="Board actions"/>
                {canManageBoard && (
                  <PanelRow icon={<Plus size={13}/>}   label="Add list"     onClick={()=>{ setShowCreateList(true); close() }}/>
                )}
                {role === 'admin' && (
                  <PanelRow icon={<Pencil size={13}/>} label="Rename board" onClick={()=>{ 
                    setNameInput(selectedBoard?.name||''); 
                    setEditingName(true); 
                    close() 
                  }}/>
                )}
                <PanelDivider/>
                <PanelSection label="Personalize Color"/>
                <div style={{ padding: '4px 14px 10px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                  {[
                    { id: 'blue', color: '#EFF6FF' },
                    { id: 'green', color: '#ECFDF5' },
                    { id: 'orange', color: '#FFF7ED' },
                    { id: 'purple', color: '#F5F3FF' },
                    { id: 'red', color: '#FEF2F2' },
                    { id: 'pink', color: '#FDF2F8' },
                    { id: 'lime', color: '#F0FDF4' },
                    { id: 'sky', color: '#E0F2FE' },
                    { id: 'grey', color: '#F9FAFB' },
                    { id: 'white', color: '#FFFFFF' },
                  ].map(bg => (
                    <button
                      key={bg.id}
                      onClick={() => {
                        if (selectedBoard && user?.id) {
                          localStorage.setItem(`board-bg-${user.id}-${selectedBoard.id}`, bg.color)
                          setBoardBgColor(bg.color)
                          socket?.emit('board:update_background', {
                            boardId: selectedBoard.id,
                            backgroundColor: bg.color
                          })
                        }
                      }}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        background: bg.color,
                        border: boardBgColor === bg.color ? '2px solid #4A1F6F' : '1px solid #D1D5DB',
                        cursor: 'pointer',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                        display: 'block'
                      }}
                      title={`Set background to ${bg.id}`}
                    />
                  ))}
                </div>
                <PanelDivider/>
                <PanelSection label="Background Image"/>
                <div style={{ padding: '4px 14px 12px' }}>
                  {/* Device Upload Button */}
                  <label style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '9px 12px', background: boardBgImage ? '#F5F3FF' : '#4A1F6F',
                    color: boardBgImage ? '#4A1F6F' : '#fff',
                    border: boardBgImage ? '1px dashed #7C3ACE' : 'none',
                    borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    marginBottom: 8, transition: 'all .15s',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    {boardBgImage ? 'Change Image' : 'Upload from Device'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (!file || !selectedBoard || !user?.id) return
                        const reader = new FileReader()
                        reader.onload = (ev) => {
                          const img = new Image()
                          img.onload = () => {
                            // Compress to max 1280px wide, quality 0.75
                            const maxW = 1280
                            const scale = img.width > maxW ? maxW / img.width : 1
                            const canvas = document.createElement('canvas')
                            canvas.width = img.width * scale
                            canvas.height = img.height * scale
                            const ctx = canvas.getContext('2d')!
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                            const compressed = canvas.toDataURL('image/jpeg', 0.75)
                            try {
                              localStorage.setItem(`board-bg-img-${user.id}-${selectedBoard.id}`, compressed)
                              setBoardBgImage(compressed)
                              setBgImageInput('')
                              socket?.emit('board:update_background', {
                                boardId: selectedBoard.id,
                                backgroundImage: compressed
                              })
                            } catch {
                              alert('Image too large for local storage. Please use a smaller image or a URL instead.')
                            }
                          }
                          img.src = ev.target?.result as string
                        }
                        reader.readAsDataURL(file)
                        e.target.value = ''
                      }}
                    />
                  </label>

                  {/* URL Fallback */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                    <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, whiteSpace: 'nowrap' }}>OR USE URL</span>
                    <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input
                      type="text"
                      placeholder="Paste image URL..."
                      value={bgImageInput}
                      onChange={e => setBgImageInput(e.target.value)}
                      style={{
                        flex: 1, background: '#F9FAFB', border: '1px solid #D1D5DB',
                        borderRadius: 5, padding: '6px 8px', color: '#111827',
                        fontSize: 12, outline: 'none', boxSizing: 'border-box' as any
                      }}
                      onFocus={e => (e.target.style.borderColor = '#4A1F6F')}
                      onBlur={e => (e.target.style.borderColor = '#D1D5DB')}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && selectedBoard && user?.id) {
                          localStorage.setItem(`board-bg-img-${user.id}-${selectedBoard.id}`, bgImageInput)
                          setBoardBgImage(bgImageInput)
                          socket?.emit('board:update_background', {
                            boardId: selectedBoard.id,
                            backgroundImage: bgImageInput
                          })
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (selectedBoard && user?.id && bgImageInput.trim()) {
                          localStorage.setItem(`board-bg-img-${user.id}-${selectedBoard.id}`, bgImageInput)
                          setBoardBgImage(bgImageInput)
                          socket?.emit('board:update_background', {
                            boardId: selectedBoard.id,
                            backgroundImage: bgImageInput
                          })
                        }
                      }}
                      style={{
                        padding: '6px 10px', background: '#4A1F6F', color: '#fff',
                        border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 600
                      }}
                    >
                      Set
                    </button>
                  </div>

                  {/* Preview + Remove */}
                  {boardBgImage && (
                    <div style={{ marginTop: 10, position: 'relative' }}>
                      <div style={{
                        height: 56, borderRadius: 8, overflow: 'hidden',
                        backgroundImage: `url(${boardBgImage})`,
                        backgroundSize: 'cover', backgroundPosition: 'center',
                        border: '1px solid #D4CCE2',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                      }} />
                      <button
                        onClick={() => {
                          if (selectedBoard && user?.id) {
                            localStorage.removeItem(`board-bg-img-${user.id}-${selectedBoard.id}`)
                            setBoardBgImage('')
                            setBgImageInput('')
                            socket?.emit('board:update_background', {
                              boardId: selectedBoard.id,
                              backgroundImage: null
                            })
                          }
                        }}
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          width: 20, height: 20, borderRadius: '50%',
                          background: 'rgba(0,0,0,0.55)', color: '#fff',
                          border: 'none', cursor: 'pointer', fontSize: 11,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          lineHeight: 1,
                        }}
                        title="Remove background image"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                <PanelDivider/>
                <PanelRow icon={<Copy size={13}/>}   label="Copy board"   onClick={close}/>
                <PanelRow icon={<Eye size={13}/>}    label="Watch"        onClick={close}/>
                <PanelDivider/>
                <PanelRow icon={<Trash2 size={13}/>} label="Close board" danger onClick={close}/>
              </Panel>
            )}
          />
        </div>
      </div>

      {/* ════════════ VIEW SWITCHER ════════════ */}
      {boardData && (
        <div style={{
          background: '#FFFFFF',
          borderBottom: `1px solid ${DS.headerBorder}`,
          padding: '8px 20px',
          display: 'flex',
          gap: 4,
          flexShrink: 0,
        }}>
          {[
            { id: 'board', icon: LayoutGrid, label: 'Board' },
            { id: 'table', icon: TableIcon, label: 'Table' },
            { id: 'calendar', icon: CalendarIcon, label: 'Calendar' },
            { id: 'timeline', icon: Clock, label: 'Timeline' },
            { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
            { id: 'map', icon: MapIcon, label: 'Map' },
          ].map(view => {
            const Icon = view.icon
            const isActive = currentView === view.id
            return (
              <button
                key={view.id}
                onClick={() => setCurrentView(view.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 0,
                  border: 'none',
                  borderBottom: isActive ? '2px solid #4A1F6F' : '2px solid transparent',
                  background: isActive ? 'rgba(74,31,111,0.06)' : 'transparent',
                  color: isActive ? '#4A1F6F' : DS.textMuted,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all .15s',
                  fontFamily: 'var(--font-inter), sans-serif',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#F3F4F6'
                    e.currentTarget.style.color = DS.textPrimary
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = DS.textMuted
                  }
                }}
              >
                <Icon size={14} />
                <span>{view.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ════════════ BOARD CONTENT ════════════ */}
      <div style={{ flex:1, minHeight:0, overflow:'hidden', position: 'relative', zIndex: 1 }}>
        {loading&&!boardData ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
            <Loader2 size={32} style={{ color:'rgba(255,255,255,0.7)', animation:'spin 1s linear infinite' }}/>
          </div>
        ) : error ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
            <div style={{ textAlign:'center', background:'rgba(23,27,30,0.72)', backdropFilter:'blur(16px)',
              borderRadius:12, padding:40, border:`1px solid ${DS.bg3}`, maxWidth:360 }}>
              <X size={44} style={{ color:DS.danger, margin:'0 auto 16px' }}/>
              <h3 style={{ color:DS.textWhite, margin:'0 0 8px', fontSize:16 }}>No Boards Found</h3>
              <p style={{ color:DS.textMuted, margin:'0 0 20px', fontSize:13 }}>{error}</p>
              <button onClick={()=>{ setError(null); fetchBoards() }}
                style={{ padding:'8px 20px', background:DS.accentDark, color:'#fff',
                  border:'none', borderRadius:6, cursor:'pointer', fontSize:13, fontWeight:600 }}>
                Refresh
              </button>
            </div>
          </div>
        ) : boardData ? (
          <>
            {currentView==='board' && (
              <Board
                projectId={currentProjectId||''}
                lists={boardData.lists}
                tasks={filteredTasks}
                boardBackground={boardBgImage
                  ? `url(${boardBgImage}) center/cover no-repeat, ${boardBgColor}`
                  : boardBgColor
                }
                canManageBoard={canManageBoard}
                onRefresh={()=>selectedBoard&&fetchBoardData(selectedBoard.id)}
                onAddTask={(listId, title) => {
                  if (!selectedBoard) return ''
                  const optimisticId = `temp-${Date.now()}`
                  const newTask: Task = {
                    id: optimisticId,
                    public_id: optimisticId,
                    title: title || 'New Card',
                    list_id: listId,
                    position: boardData.tasks.filter(t => t.list_id === listId).length * 1000,
                    priority: 'medium',
                    status: 'todo',
                    completion_percentage: 0,
                    description: '',
                    assigned_to: undefined,
                    due_date: undefined,
                    cover_color: undefined,
                    labels: [],
                  }
                  
                  const updated = {
                    ...boardData,
                    tasks: [...boardData.tasks, newTask]
                  }
                  setBoardData(updated)
                  usePrefetchStore.getState().updateBoardDetailsCache(selectedBoard.id, updated)
                  return optimisticId
                }}
                onTaskCreated={(newTask, tempId) => {
                  if (!selectedBoard) return
                  setBoardData(prev => {
                    if (!prev) return null
                    const filtered = tempId 
                      ? prev.tasks.filter(t => t.id !== tempId)
                      : prev.tasks
                    
                    if (filtered.some(t => t.id === newTask.id)) return { ...prev, tasks: filtered }
                    const updated = {
                      ...prev,
                      tasks: [...filtered, newTask]
                    }
                    usePrefetchStore.getState().updateBoardDetailsCache(selectedBoard.id, updated)
                    return updated
                  })
                }}
                onDeleteTask={(taskId) => {
                  if (!selectedBoard) return
                  setBoardData(prev => {
                    if (!prev) return null
                    const updated = {
                      ...prev,
                      tasks: prev.tasks.filter(t => t.id !== taskId)
                    }
                    usePrefetchStore.getState().updateBoardDetailsCache(selectedBoard.id, updated)
                    return updated
                  })
                }}
                onAddList={(name)=>createList(name)}
                onTaskClick={task=>setSelectedTask(task)}
              />
            )}
            {currentView==='table' && <TableView boardData={boardData} onTaskClick={task=>setSelectedTask(task)}/>}
            {currentView==='timeline' && <TimelineView boardData={boardData} onTaskClick={task=>setSelectedTask(task)}/>}
            {currentView==='calendar' && (
              <CalendarViewComponent 
                tasks={boardData.tasks} 
                onTaskClick={task=>setSelectedTask(task)}
                onCreateTask={async (date) => {
                  if (!selectedBoard || !currentProjectId) return
                  
                  // Find the first list (typically "To Do")
                  const firstList = boardData.lists[0]
                  if (!firstList) {
                    alert('Please create a list first')
                    return
                  }
                  
                  // Create task with the selected date
                  const token = localStorage.getItem('authToken')
                  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
                  
                  try {
                    const res = await fetch(`${BACKEND_URL}/api/v1/tasks/quick-create`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        title: `New Task`,
                        list_id: firstList.id,
                        project_id: currentProjectId,
                        board_id: selectedBoard.id,
                        due_date: date.toISOString(),
                        position: boardData.tasks.length * 1000
                      })
                    })
                    
                    if (res.ok) {
                      const result = await res.json()
                      const newTask = result.data?.task || result.data
                      
                      // Add the new task to boardData
                      setBoardData(prev => prev ? {
                        ...prev,
                        tasks: [...prev.tasks, newTask]
                      } : null)
                      
                      // Open the task detail modal for editing
                      setSelectedTask(newTask)
                    } else {
                      alert('Failed to create task')
                    }
                  } catch (err) {
                    console.error('Error creating task:', err)
                    alert('Error creating task')
                  }
                }}
              />
            )}
            {currentView==='dashboard' && <DashboardView boardData={boardData} onTaskClick={task=>setSelectedTask(task)}/>}
            {currentView==='map' && <MapView boardData={boardData} onTaskClick={task=>setSelectedTask(task)}/>}
          </>
        ) : (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
            <Loader2 size={32} style={{ color:'rgba(255,255,255,0.7)' }}/>
          </div>
        )}
      </div>

      {/* ════════════ CREATE LIST MODAL ════════════ */}
      {showCreateList && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:16 }}
          onClick={()=>setShowCreateList(false)}>
          <div style={{ background:DS.bg1, border:`1px solid ${DS.bg3}`,
            borderRadius:10, width:320, boxShadow:'0 16px 48px rgba(0,0,0,0.6)' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'12px 16px', borderBottom:`1px solid ${DS.bg3}` }}>
              <span style={{ color:DS.textWhite, fontWeight:600, fontSize:14 }}>Add a list</span>
              <button onClick={()=>setShowCreateList(false)} style={iconBtn}><X size={16}/></button>
            </div>
            <div style={{ padding:'14px 16px' }}>
              <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em',
                color:DS.textMuted, margin:'0 0 6px' }}>List name *</p>
              <input autoFocus type="text" value={newListName}
                onChange={e=>setNewListName(e.target.value)}
                placeholder="e.g. To Do"
                style={{ ...inputStyle }}
                onFocus={e=>(e.target.style.borderColor=DS.accent)}
                onBlur={e=>(e.target.style.borderColor=DS.bg3)}
                onKeyDown={e=>{ if(e.key==='Enter') createList() }}/>
            </div>
            <div style={{ display:'flex', gap:8, padding:'0 16px 14px' }}>
              <button onClick={() => createList()} disabled={!newListName.trim()||creating}
                style={{ flex:1, padding:'8px 0', background:DS.accentDark, color:'#fff',
                  border:'none', borderRadius:5, cursor:newListName.trim()&&!creating?'pointer':'not-allowed',
                  opacity:!newListName.trim()||creating?.5:1, fontSize:13, fontWeight:600,
                  transition:'opacity .15s' }}>
                {creating?'Adding…':'Add list'}
              </button>
              <button onClick={()=>setShowCreateList(false)}
                style={{ padding:'8px 14px', background:'transparent', color:DS.textPrimary,
                  border:`1px solid ${DS.bg3}`, borderRadius:5, cursor:'pointer', fontSize:13,
                  transition:'background .12s' }}
                onMouseEnter={e=>(e.currentTarget.style.background=DS.bg2)}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ TASK DETAIL MODAL ════════════ */}
      {selectedTask&&selectedBoard && (
        <TaskDetailModal
          task={selectedTask}
          canManageBoard={canManageBoard}
          onClose={()=>setSelectedTask(null)}
          onUpdate={()=>{
            boardsAPI.getBoardDetails(selectedBoard.id).then(r=>{
              if(r.success&&r.data) {
                const bData = r.data as BoardData
                setBoardData(bData)
                setSelectedTask((prev: any) => {
                  if (!prev) return null
                  const freshTask = bData.tasks.find(t => t.id === prev.id)
                  return freshTask || null
                })
              }
            })
          }}
          boardId={selectedBoard.id}
          projectId={currentProjectId||''}
        />
      )}

      {/* Rename Board Modal */}
      {editingName && selectedBoard && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-4"
          onClick={() => setEditingName(false)}
        >
          <div
            className="bg-white border border-gray-200 rounded-xl w-full max-w-[400px] shadow-2xl flex flex-col p-6"
            style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#111827', fontSize: 16, fontWeight: 700, margin: 0 }}>Rename Board</h3>
              <button 
                onClick={() => setEditingName(false)} 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#6B7280' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', color: '#6B7280', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>
                  Board Name
                </label>
                <input 
                  type="text" 
                  placeholder="Enter board name..." 
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && nameInput.trim()) saveRename()
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                  style={{
                    width: '100%',
                    background: '#FFFFFF',
                    border: '2px solid #3B82F6',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#111827',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setEditingName(false)}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: '1px solid #E5E7EB',
                    borderRadius: 6,
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveRename}
                  disabled={!nameInput.trim()}
                  style={{
                    padding: '8px 16px',
                    background: '#2563EB',
                    border: 'none',
                    borderRadius: 6,
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    opacity: !nameInput.trim() ? 0.6 : 1
                  }}
                >
                  Rename
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Board Modal */}
      {showCreateBoardModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-4"
          onClick={() => setShowCreateBoardModal(false)}
        >
          <div
            className="bg-[#282E33] border border-[#454F59] rounded-xl w-full max-w-[400px] shadow-2xl flex flex-col p-6"
            style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: DS.textWhite, fontSize: 16, fontWeight: 700, margin: 0 }}>Create New Board</h3>
              <button 
                onClick={() => setShowCreateBoardModal(false)} 
                style={{ ...iconBtn, padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', color: DS.textMuted, fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>
                  Board Name
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Developers, Marketing..." 
                  value={newBoardName}
                  onChange={e => setNewBoardName(e.target.value)}
                  style={inputStyle}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', color: DS.textMuted, fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>
                  Description (Optional)
                </label>
                <textarea 
                  placeholder="Describe the purpose of this board..." 
                  value={newBoardDesc}
                  onChange={e => setNewBoardDesc(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'none' }}
                />
              </div>

              {errorMsg && (
                <p style={{ color: DS.danger, fontSize: 12, margin: 0 }}>{errorMsg}</p>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowCreateBoardModal(false)}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: `1px solid ${DS.bg3}`,
                    borderRadius: 6,
                    color: DS.textPrimary,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBoard}
                  disabled={!newBoardName.trim() || creatingBoard}
                  style={{
                    padding: '8px 16px',
                    background: DS.accentDark,
                    border: 'none',
                    borderRadius: 6,
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    opacity: (!newBoardName.trim() || creatingBoard) ? 0.6 : 1
                  }}
                >
                  {creatingBoard ? 'Creating...' : 'Create Board'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



