import { useEffect, useMemo, useRef, useState } from 'react'
import type { BudgetItem } from '../../types'
import { Input } from '../ui/Input'
import { cn } from '../../utils/cn'

type BudgetPostSearchFieldProps = {
  posts: BudgetItem[]
  /** id du poste (string), ou '' */
  value: string
  onChange: (posteId: string) => void
  onBlur?: () => void
  disabled?: boolean
  id?: string
  className?: string
  /** Classes sur l’input (ex. `py-1.5 text-sm` en tableau) */
  inputClassName?: string
}

/**
 * Champ texte + liste filtrée pour choisir un poste budgétaire (remplace un long &lt;select&gt;).
 */
export function BudgetPostSearchField({
  posts,
  value,
  onChange,
  onBlur,
  disabled,
  id,
  className,
  inputClassName,
}: BudgetPostSearchFieldProps) {
  const selected = useMemo(
    () => posts.find((p) => String(p.id) === value),
    [posts, value],
  )

  const [open, setOpen] = useState(false)
  const [text, setText] = useState(() => selected?.nom ?? '')
  const skipBlurSync = useRef(false)

  useEffect(() => {
    if (open) return
    setText(selected?.nom ?? '')
  }, [value, selected, open])

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase()
    if (!q) return posts
    return posts.filter((p) => p.nom.toLowerCase().includes(q))
  }, [posts, text])

  function pick(p: BudgetItem) {
    skipBlurSync.current = true
    onChange(String(p.id))
    setText(p.nom)
    setOpen(false)
  }

  function handleBlur() {
    window.setTimeout(() => {
      if (skipBlurSync.current) {
        skipBlurSync.current = false
        onBlur?.()
        return
      }
      setOpen(false)
      const t = text.trim()
      if (!t) {
        onChange('')
        setText('')
        onBlur?.()
        return
      }
      const exact = posts.find(
        (p) => p.nom.toLowerCase() === t.toLowerCase(),
      )
      if (exact) {
        onChange(String(exact.id))
        setText(exact.nom)
      } else {
        setText(selected?.nom ?? '')
      }
      onBlur?.()
    }, 200)
  }

  return (
    <div className={cn('relative', className)}>
      <Input
        id={id}
        type="text"
        autoComplete="off"
        disabled={disabled}
        placeholder="Rechercher un poste…"
        aria-expanded={open}
        aria-controls={id ? `${id}-listbox` : undefined}
        aria-autocomplete="list"
        role="combobox"
        value={text}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          const v = e.target.value
          setText(v)
          setOpen(true)
          if (selected && v !== selected.nom) {
            onChange('')
          }
        }}
        onBlur={handleBlur}
        className={inputClassName}
      />
      {open && filtered.length > 0 ? (
        <ul
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className={cn(
            'absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 text-sm shadow-md',
          )}
        >
          {filtered.map((p) => (
            <li key={p.id} role="option">
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-stone-100"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(p)}
              >
                {p.nom}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && filtered.length === 0 && text.trim() !== '' ? (
        <p
          className="absolute z-30 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-stone-500 shadow-md"
          role="status"
        >
          Aucun poste correspondant
        </p>
      ) : null}
    </div>
  )
}
