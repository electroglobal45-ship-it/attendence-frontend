'use client'

import { useState } from 'react'
import { getLabelColor } from '@/lib/trello-colors'

interface LabelProps {
  colorId: string
  name?: string
  showName?: boolean
  onClick?: () => void
  className?: string
}

export function Label({ 
  colorId, 
  name, 
  showName = false, 
  onClick,
  className = '' 
}: LabelProps) {
  const [isHovered, setIsHovered] = useState(false)
  const labelColor = getLabelColor(colorId)
  
  if (!labelColor) return null

  const displayName = name || labelColor.name
  const shouldShowText = showName || isHovered

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        inline-flex items-center rounded-trello-sm cursor-pointer transition-all
        ${shouldShowText ? 'px-2 py-1 min-w-[56px]' : 'w-10 h-2'}
        ${onClick ? 'hover:opacity-80' : ''}
        ${className}
      `}
      style={{ backgroundColor: labelColor.color }}
    >
      {shouldShowText && (
        <span 
          className="text-xs font-medium whitespace-nowrap"
          style={{ color: labelColor.textColor }}
        >
          {displayName}
        </span>
      )}
    </div>
  )
}

interface LabelGroupProps {
  labels: Array<{ colorId: string; name?: string }>
  showNames?: boolean
  maxVisible?: number
  onClick?: (colorId: string) => void
  className?: string
}

export function LabelGroup({ 
  labels, 
  showNames = false, 
  maxVisible = 4,
  onClick,
  className = '' 
}: LabelGroupProps) {
  const visibleLabels = labels.slice(0, maxVisible)
  const hiddenCount = labels.length - maxVisible

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {visibleLabels.map((label, index) => (
        <Label
          key={`${label.colorId}-${index}`}
          colorId={label.colorId}
          name={label.name}
          showName={showNames}
          onClick={() => onClick?.(label.colorId)}
        />
      ))}
      {hiddenCount > 0 && (
        <div className="inline-flex items-center px-2 py-1 rounded-trello-sm bg-gray-100 text-text-secondary text-xs font-medium">
          +{hiddenCount}
        </div>
      )}
    </div>
  )
}
