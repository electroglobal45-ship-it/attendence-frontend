/**
 * Trello Color System
 * Label colors, board backgrounds, and cover colors
 */

export const LABEL_COLORS = [
  { id: 'green', name: 'Green', color: '#61BD4F', textColor: '#FFFFFF' },
  { id: 'yellow', name: 'Yellow', color: '#F2D600', textColor: '#172B4D' },
  { id: 'orange', name: 'Orange', color: '#FF9F1A', textColor: '#FFFFFF' },
  { id: 'red', name: 'Red', color: '#EB5A46', textColor: '#FFFFFF' },
  { id: 'purple', name: 'Purple', color: '#C377E0', textColor: '#FFFFFF' },
  { id: 'blue', name: 'Blue', color: '#0079BF', textColor: '#FFFFFF' },
  { id: 'sky', name: 'Sky', color: '#00C2E0', textColor: '#FFFFFF' },
  { id: 'lime', name: 'Lime', color: '#51E898', textColor: '#172B4D' },
  { id: 'pink', name: 'Pink', color: '#FF78CB', textColor: '#FFFFFF' },
  { id: 'black', name: 'Black', color: '#344563', textColor: '#FFFFFF' },
] as const

export const BOARD_BACKGROUNDS = [
  { id: 'blue', name: 'Blue', color: '#0079BF', gradient: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)' },
  { id: 'orange', name: 'Orange', color: '#D29034', gradient: 'linear-gradient(135deg, #D29034 0%, #B36D1F 100%)' },
  { id: 'green', name: 'Green', color: '#519839', gradient: 'linear-gradient(135deg, #519839 0%, #3D7527 100%)' },
  { id: 'red', name: 'Red', color: '#B04632', gradient: 'linear-gradient(135deg, #B04632 0%, #8C3626 100%)' },
  { id: 'purple', name: 'Purple', color: '#89609E', gradient: 'linear-gradient(135deg, #89609E 0%, #6B4C7A 100%)' },
  { id: 'pink', name: 'Pink', color: '#CD5A91', gradient: 'linear-gradient(135deg, #CD5A91 0%, #A0466F 100%)' },
  { id: 'lime', name: 'Lime', color: '#4BBF6B', gradient: 'linear-gradient(135deg, #4BBF6B 0%, #3A9654 100%)' },
  { id: 'sky', name: 'Sky', color: '#00AECC', gradient: 'linear-gradient(135deg, #00AECC 0%, #0085A1 100%)' },
  { id: 'grey', name: 'Grey', color: '#838C91', gradient: 'linear-gradient(135deg, #838C91 0%, #5E6C84 100%)' },
] as const

export const CARD_COVER_COLORS = [
  { id: 'green', name: 'Green', color: '#61BD4F' },
  { id: 'yellow', name: 'Yellow', color: '#F2D600' },
  { id: 'orange', name: 'Orange', color: '#FF9F1A' },
  { id: 'red', name: 'Red', color: '#EB5A46' },
  { id: 'purple', name: 'Purple', color: '#C377E0' },
  { id: 'blue', name: 'Blue', color: '#0079BF' },
  { id: 'sky', name: 'Sky', color: '#00C2E0' },
  { id: 'lime', name: 'Lime', color: '#51E898' },
  { id: 'pink', name: 'Pink', color: '#FF78CB' },
  { id: 'black', name: 'Black', color: '#344563' },
] as const

export const LIST_COLORS = [
  { id: 'default', name: 'Default', color: '#EBECF0' },
  { id: 'blue', name: 'Blue', color: '#D6EAF8' },
  { id: 'green', name: 'Green', color: '#D5F4E6' },
  { id: 'yellow', name: 'Yellow', color: '#FCF3CF' },
  { id: 'orange', name: 'Orange', color: '#FAE5D3' },
  { id: 'red', name: 'Red', color: '#FADBD8' },
  { id: 'purple', name: 'Purple', color: '#E8DAEF' },
  { id: 'pink', name: 'Pink', color: '#F9EBEA' },
] as const

export type LabelColor = typeof LABEL_COLORS[number]
export type BoardBackground = typeof BOARD_BACKGROUNDS[number]
export type CardCoverColor = typeof CARD_COVER_COLORS[number]
export type ListColor = typeof LIST_COLORS[number]

export function getLabelColor(colorId: string): LabelColor | undefined {
  return LABEL_COLORS.find(c => c.id === colorId)
}

export function getBoardBackground(bgId: string): BoardBackground | undefined {
  return BOARD_BACKGROUNDS.find(b => b.id === bgId)
}

export function getCardCoverColor(colorId: string): CardCoverColor | undefined {
  return CARD_COVER_COLORS.find(c => c.id === colorId)
}

export function getListColor(colorId: string): ListColor | undefined {
  return LIST_COLORS.find(c => c.id === colorId)
}

// Priority color mapping
export const PRIORITY_COLORS = {
  low: { bg: '#DFE1E6', text: '#172B4D', label: 'Low' },
  medium: { bg: '#0079BF', text: '#FFFFFF', label: 'Medium' },
  high: { bg: '#FF9F1A', text: '#FFFFFF', label: 'High' },
  urgent: { bg: '#EB5A46', text: '#FFFFFF', label: 'Urgent' },
} as const

// Status color mapping
export const STATUS_COLORS = {
  todo: { bg: '#DFE1E6', text: '#172B4D', label: 'To Do' },
  in_progress: { bg: '#0079BF', text: '#FFFFFF', label: 'In Progress' },
  review: { bg: '#FF9F1A', text: '#FFFFFF', label: 'Review' },
  done: { bg: '#61BD4F', text: '#FFFFFF', label: 'Done' },
} as const
