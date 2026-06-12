'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Check, Edit2, Clock, User as UserIcon, Tag } from 'lucide-react'

interface Task {
  id: string
  title: string
  description?: string
  due_date?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: string
  list_id: string
  assigned_user?: { id: string; name: string; email: string }
  labels?: Array<{ colorId: string; name?: string; color?: string }>
}

interface CalendarViewProps {
  tasks: Task[]
  onCreateTask: (date: Date) => void
  onTaskClick: (task: Task) => void
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => Promise<void>
}

const PRIORITY_COLORS = {
  low: '#94C748',
  medium: '#E2B203',
  high: '#FEA362',
  urgent: '#F87168',
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function CalendarView({ tasks, onCreateTask, onTaskClick, onTaskUpdate }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showDayModal, setShowDayModal] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {}
    tasks.forEach(task => {
      if (task.due_date) {
        const date = new Date(task.due_date)
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(task)
      }
    })
    return grouped
  }, [tasks])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days: Array<{
      date: number
      month: 'prev' | 'current' | 'next'
      fullDate: Date
      isToday: boolean
      tasks: Task[]
    }> = []

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Previous month days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const date = daysInPrevMonth - i
      const fullDate = new Date(year, month - 1, date)
      const key = `${fullDate.getFullYear()}-${fullDate.getMonth()}-${fullDate.getDate()}`
      days.push({
        date,
        month: 'prev',
        fullDate,
        isToday: fullDate.getTime() === today.getTime(),
        tasks: tasksByDate[key] || []
      })
    }

    // Current month days
    for (let date = 1; date <= daysInMonth; date++) {
      const fullDate = new Date(year, month, date)
      const key = `${fullDate.getFullYear()}-${fullDate.getMonth()}-${fullDate.getDate()}`
      days.push({
        date,
        month: 'current',
        fullDate,
        isToday: fullDate.getTime() === today.getTime(),
        tasks: tasksByDate[key] || []
      })
    }

    // Next month days to fill the grid
    const remainingDays = 42 - days.length // 6 rows × 7 days
    for (let date = 1; date <= remainingDays; date++) {
      const fullDate = new Date(year, month + 1, date)
      const key = `${fullDate.getFullYear()}-${fullDate.getMonth()}-${fullDate.getDate()}`
      days.push({
        date,
        month: 'next',
        fullDate,
        isToday: fullDate.getTime() === today.getTime(),
        tasks: tasksByDate[key] || []
      })
    }

    return days
  }, [year, month, firstDayOfMonth, daysInMonth, daysInPrevMonth, tasksByDate])

  const prevMonth = () => setCurrentDate(new Date(year, month - 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1))
  const goToToday = () => setCurrentDate(new Date())

  const handleDateClick = (day: typeof calendarDays[0]) => {
    if (day.month !== 'current') return
    setSelectedDate(day.fullDate)
    setShowDayModal(true)
  }

  const handleTaskClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation()
    setShowDayModal(false)
    onTaskClick(task)
  }

  const selectedDayTasks = selectedDate
    ? calendarDays.find(d => d.fullDate.getTime() === selectedDate.getTime())?.tasks || []
    : []

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F8F9FA' }}>
      {/* Header */}
      <div style={{ 
        padding: '16px 24px', 
        background: '#FFFFFF', 
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>
            {MONTHS[month]} {year}
          </h2>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={prevMonth}
              style={{ 
                padding: '6px 10px', 
                border: '1px solid #E5E7EB', 
                borderRadius: 6, 
                background: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
            >
              <ChevronLeft size={16} color="#6B7280" />
            </button>
            <button
              onClick={nextMonth}
              style={{ 
                padding: '6px 10px', 
                border: '1px solid #E5E7EB', 
                borderRadius: 6, 
                background: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
            >
              <ChevronRight size={16} color="#6B7280" />
            </button>
          </div>
        </div>
        <button
          onClick={goToToday}
          style={{
            padding: '8px 16px',
            border: '1px solid #3B82F6',
            borderRadius: 6,
            background: '#FFFFFF',
            color: '#3B82F6',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#3B82F6'
            e.currentTarget.style.color = '#FFFFFF'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#FFFFFF'
            e.currentTarget.style.color = '#3B82F6'
          }}
        >
          Today
        </button>
      </div>

      {/* Calendar Grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: 1,
          background: '#E5E7EB',
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          overflow: 'hidden'
        }}>
          {/* Day headers */}
          {DAYS.map(day => (
            <div
              key={day}
              style={{
                padding: '12px',
                background: '#F3F4F6',
                color: '#6B7280',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                textAlign: 'center'
              }}
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, idx) => (
            <div
              key={idx}
              onClick={() => handleDateClick(day)}
              style={{
                minHeight: 120,
                padding: 8,
                background: day.month === 'current' ? '#FFFFFF' : '#F9FAFB',
                cursor: day.month === 'current' ? 'pointer' : 'default',
                position: 'relative',
                transition: 'background 0.15s',
                display: 'flex',
                flexDirection: 'column'
              }}
              onMouseEnter={(e) => {
                if (day.month === 'current') {
                  e.currentTarget.style.background = '#F0F9FF'
                }
              }}
              onMouseLeave={(e) => {
                if (day.month === 'current') {
                  e.currentTarget.style.background = '#FFFFFF'
                }
              }}
            >
              {/* Date number */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: 4
              }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: day.isToday ? 700 : 500,
                  color: day.month === 'current' ? (day.isToday ? '#FFFFFF' : '#111827') : '#9CA3AF',
                  width: day.isToday ? 24 : 'auto',
                  height: day.isToday ? 24 : 'auto',
                  borderRadius: day.isToday ? '50%' : 0,
                  background: day.isToday ? '#3B82F6' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {day.date}
                </span>
                {day.month === 'current' && day.tasks.length > 0 && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#6B7280',
                    background: '#F3F4F6',
                    padding: '2px 6px',
                    borderRadius: 10
                  }}>
                    {day.tasks.length}
                  </span>
                )}
              </div>

              {/* Tasks for this day (show only 2 preview) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden' }}>
                {day.tasks.slice(0, 2).map(task => (
                  <div
                    key={task.id}
                    onClick={(e) => handleTaskClick(e, task)}
                    style={{
                      padding: '4px 6px',
                      borderRadius: 4,
                      background: PRIORITY_COLORS[task.priority] + '20',
                      borderLeft: `3px solid ${PRIORITY_COLORS[task.priority]}`,
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#111827',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.stopPropagation()
                      e.currentTarget.style.background = PRIORITY_COLORS[task.priority] + '40'
                      e.currentTarget.style.transform = 'translateX(2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.stopPropagation()
                      e.currentTarget.style.background = PRIORITY_COLORS[task.priority] + '20'
                      e.currentTarget.style.transform = 'translateX(0)'
                    }}
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
                {day.tasks.length > 2 && (
                  <div style={{
                    fontSize: 10,
                    color: '#6B7280',
                    fontWeight: 600,
                    paddingLeft: 6,
                    cursor: 'pointer'
                  }}>
                    +{day.tasks.length - 2} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Day Tasks Modal */}
      {showDayModal && selectedDate && (
        <div
          onClick={() => setShowDayModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              width: '90%',
              maxWidth: 600,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>
                  {selectedDayTasks.length} task{selectedDayTasks.length !== 1 ? 's' : ''} due
                </p>
              </div>
              <button
                onClick={() => setShowDayModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 8,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <X size={20} color="#6B7280" />
              </button>
            </div>


            {/* Modal Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
              {selectedDayTasks.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  color: '#9CA3AF'
                }}>
                  <Clock size={48} color="#E5E7EB" style={{ margin: '0 auto 16px' }} />
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>No tasks due this day</p>
                  <p style={{ margin: '8px 0 16px', fontSize: 13 }}>Click below to create a new task</p>
                  <button
                    onClick={() => {
                      setShowDayModal(false)
                      onCreateTask(selectedDate)
                    }}
                    style={{
                      padding: '8px 20px',
                      background: '#3B82F6',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Plus size={16} /> Create Task
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedDayTasks.map((task, idx) => (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick({} as any, task)}
                      style={{
                        padding: 16,
                        background: '#F9FAFB',
                        borderRadius: 8,
                        border: `1px solid #E5E7EB`,
                        borderLeft: `4px solid ${PRIORITY_COLORS[task.priority]}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F3F4F6'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#F9FAFB'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      {/* Task Title & Status */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                        <h4 style={{ 
                          margin: 0, 
                          fontSize: 15, 
                          fontWeight: 600, 
                          color: '#111827',
                          flex: 1,
                          textDecoration: task.status === 'done' ? 'line-through' : 'none',
                          opacity: task.status === 'done' ? 0.6 : 1
                        }}>
                          {task.title}
                        </h4>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: 12,
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          background: task.priority === 'urgent' ? '#FEE2E2' : 
                                     task.priority === 'high' ? '#FED7AA' :
                                     task.priority === 'medium' ? '#FEF3C7' : '#DCFCE7',
                          color: task.priority === 'urgent' ? '#991B1B' :
                                task.priority === 'high' ? '#9A3412' :
                                task.priority === 'medium' ? '#854D0E' : '#166534'
                        }}>
                          {task.priority}
                        </span>
                      </div>

                      {/* Task Description */}
                      {task.description && (
                        <p style={{ 
                          margin: '0 0 8px', 
                          fontSize: 13, 
                          color: '#6B7280',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {task.description}
                        </p>
                      )}

                      {/* Task Meta */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#6B7280' }}>
                        {task.assigned_user && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <UserIcon size={14} />
                            <span>{task.assigned_user.name}</span>
                          </div>
                        )}
                        {task.labels && task.labels.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Tag size={14} />
                            <div style={{ display: 'flex', gap: 4 }}>
                              {task.labels.slice(0, 2).map((label, i) => (
                                <div
                                  key={i}
                                  style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    background: label.color || '#94C748'
                                  }}
                                  title={label.name}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ 
                          marginLeft: 'auto',
                          padding: '4px 8px',
                          borderRadius: 4,
                          background: task.status === 'done' ? '#DCFCE7' : '#DBEAFE',
                          color: task.status === 'done' ? '#166534' : '#1E40AF',
                          fontSize: 11,
                          fontWeight: 600
                        }}>
                          {STATUS_LABELS[task.status] || task.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              gap: 8,
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowDayModal(false)
                  onCreateTask(selectedDate)
                }}
                style={{
                  padding: '8px 16px',
                  background: '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#2563EB'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#3B82F6'}
              >
                <Plus size={16} /> New Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
