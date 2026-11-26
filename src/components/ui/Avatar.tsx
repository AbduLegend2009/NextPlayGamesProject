import type { Member } from '../../lib/types'

/** First letters of the first and last word: "Maya Chen" → "MC". */
function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

const SIZES = {
  xs: 'size-5 text-[9px]',
  sm: 'size-6 text-[10px]',
  md: 'size-7 text-[11px]',
} as const

export function Avatar({ member, size = 'sm' }: { member: Pick<Member, 'name' | 'color'>; size?: keyof typeof SIZES }) {
  return (
    <span
      title={member.name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-surface select-none ${SIZES[size]}`}
      style={{ backgroundColor: member.color }}
    >
      {initials(member.name)}
    </span>
  )
}

/** Overlapping avatars, showing "+2" when there are more than `max`. */
export function AvatarStack({ members, max = 3, size = 'xs' }: { members: Member[]; max?: number; size?: keyof typeof SIZES }) {
  if (!members.length) return null
  const shown = members.slice(0, max)
  const extra = members.length - shown.length
  return (
    <span className="flex -space-x-1.5" aria-label={`Assigned to ${members.map((m) => m.name).join(', ')}`}>
      {shown.map((m) => (
        <Avatar key={m.id} member={m} size={size} />
      ))}
      {extra > 0 && (
        <span
          className={`inline-flex items-center justify-center rounded-full bg-sunken font-semibold text-ink-muted ring-2 ring-surface ${SIZES[size]}`}
        >
          +{extra}
        </span>
      )}
    </span>
  )
}
