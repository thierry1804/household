import { useEffect, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { DayPicker } from 'react-day-picker'
import { Calendar } from 'lucide-react'
import {
  formatYmdFrSlash,
  parseFrSlashDateToYmd,
} from '../../utils/formatters'
import { cn } from '../../utils/cn'
import { Input } from './Input'
import 'react-day-picker/style.css'

type DateFrFieldProps = {
  /** AAAA-MM-JJ */
  valueYmd: string
  onChangeYmd: (ymd: string) => void
  /** Après saisie valide ou choix calendrier (ex. sauvegarde ligne). */
  onCommit?: () => void
  disabled?: boolean
  className?: string
  inputClassName?: string
  'aria-label'?: string
  id?: string
  /** RHF : onBlur du champ texte */
  onBlur?: () => void
}

export function DateFrField({
  valueYmd,
  onChangeYmd,
  onCommit,
  disabled,
  className,
  inputClassName,
  'aria-label': ariaLabel,
  id,
  onBlur,
}: DateFrFieldProps) {
  const [text, setText] = useState(() => formatYmdFrSlash(valueYmd))
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setText(formatYmdFrSlash(valueYmd))
  }, [valueYmd])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  let selectedDate: Date | undefined
  try {
    selectedDate = parseISO(valueYmd + 'T12:00:00')
    if (Number.isNaN(selectedDate.getTime())) selectedDate = undefined
  } catch {
    selectedDate = undefined
  }

  function commitText() {
    const ymd = parseFrSlashDateToYmd(text)
    if (ymd) {
      setText(formatYmdFrSlash(ymd))
      if (ymd !== valueYmd) onChangeYmd(ymd)
      onCommit?.()
    } else {
      setText(formatYmdFrSlash(valueYmd))
      onCommit?.()
    }
    onBlur?.()
  }

  function pickCalendar(d: Date | undefined) {
    if (!d) return
    const ymd = format(d, 'yyyy-MM-dd')
    setOpen(false)
    setText(formatYmdFrSlash(ymd))
    if (ymd !== valueYmd) onChangeYmd(ymd)
    onCommit?.()
    onBlur?.()
  }

  return (
    <div ref={rootRef} className={cn('relative w-full min-w-0', className)}>
      <div className="relative">
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="jj/mm/aaaa"
          value={text}
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            'w-full min-w-0 pr-9 tabular-nums',
            inputClassName,
          )}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
        />
        <button
          type="button"
          disabled={disabled}
          aria-label="Ouvrir le calendrier"
          aria-expanded={open}
          className={cn(
            'absolute right-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-ink)] outline-none',
            'hover:bg-stone-100 focus-visible:bg-stone-100 focus-visible:ring-2 focus-visible:ring-amber-500/30',
            disabled && 'cursor-not-allowed opacity-50',
          )}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => !disabled && setOpen((o) => !o)}
        >
          <Calendar className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      </div>
      {open ? (
        <div
          className="absolute left-0 top-full z-[100] mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-md"
          role="dialog"
          aria-label="Calendrier"
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(d) => pickCalendar(d)}
            locale={fr}
            defaultMonth={selectedDate}
          />
        </div>
      ) : null}
    </div>
  )
}
