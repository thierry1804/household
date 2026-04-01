import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { BudgetPostSearchField } from './BudgetPostSearchField'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import type { BudgetItem } from '../../types'
import { DateFrField } from '../ui/DateFrField'
import { Input, Select } from '../ui/Input'
import { Button } from '../ui/Button'
import { Offcanvas } from '../ui/Offcanvas'

export type DepenseQuickAddValues = {
  date: string
  produit: string
  quantite: number
  unite?: string
  prixUnitaire: number
  categorieCode: string
  budgetItemId: number | null
}

function buildDepenseAddSchema(requirePoste: boolean) {
  return z
    .object({
      dateYmd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
      produit: z.string().min(1, 'Produit requis'),
      quantite: z.number().positive(),
      unite: z.string().optional(),
      prixUnitaire: z.number().int().min(0),
      posteId: z.string(),
      enveloppeCode: z.string(),
    })
    .superRefine((data, ctx) => {
      const hasPoste = data.posteId.trim() !== ''
      if (requirePoste) {
        if (!hasPoste) {
          ctx.addIssue({
            code: 'custom',
            path: ['posteId'],
            message: 'Choisissez un poste budgétaire.',
          })
        }
      } else if (!data.enveloppeCode.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['enveloppeCode'],
          message: 'Choisissez une enveloppe.',
        })
      }
    })
}

export function DepenseAddOffcanvas({
  open,
  onClose,
  budgetItems,
  categoryCodes,
  onSubmit,
  disabled,
  isPending,
}: {
  open: boolean
  onClose: () => void
  budgetItems: BudgetItem[]
  categoryCodes: { code: string; libelle: string }[]
  onSubmit: (values: DepenseQuickAddValues) => void | Promise<void>
  disabled?: boolean
  isPending: boolean
}) {
  const [suggestOpen, setSuggestOpen] = useState(false)
  const defaultDate = format(new Date(), 'yyyy-MM-dd')

  const sortedPosts = useMemo(
    () => [...budgetItems].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    [budgetItems],
  )

  const schema = useMemo(
    () => buildDepenseAddSchema(budgetItems.length > 0),
    [budgetItems.length],
  )

  const form = useForm<z.infer<ReturnType<typeof buildDepenseAddSchema>>>({
    resolver: zodResolver(schema),
    defaultValues: {
      dateYmd: defaultDate,
      produit: '',
      quantite: 1,
      unite: '',
      prixUnitaire: 0,
      posteId: '',
      enveloppeCode: categoryCodes[0]?.code ?? '',
    },
  })

  const produitWatch =
    useWatch({ control: form.control, name: 'produit' }) ?? ''

  const suggestions = useMemo(() => {
    const q = produitWatch.trim().toLowerCase()
    if (q.length < 1) return []
    return budgetItems
      .filter((b) => b.nom.toLowerCase().includes(q))
      .slice(0, 8)
  }, [budgetItems, produitWatch])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      form.setFocus('produit')
    }, 50)
    return () => window.clearTimeout(t)
  }, [open, form])

  function pickBudgetItem(b: BudgetItem) {
    form.setValue('produit', b.nom)
    form.setValue('unite', b.unite ?? '')
    form.setValue('prixUnitaire', b.prixUnitaire)
    form.setValue('posteId', String(b.id))
    setSuggestOpen(false)
  }

  const showEnveloppeOnly = budgetItems.length === 0

  function submit(closeAfter: boolean) {
    form.handleSubmit(async (v) => {
      const pid = v.posteId.trim() ? Number(v.posteId) : null
      const item =
        pid != null && Number.isFinite(pid)
          ? budgetItems.find((b) => b.id === pid)
          : undefined
      const categorieCode = item ? item.categorie : v.enveloppeCode.trim()
      const payload: DepenseQuickAddValues = {
        date: v.dateYmd,
        produit: v.produit,
        quantite: v.quantite,
        unite: v.unite || undefined,
        prixUnitaire: v.prixUnitaire,
        categorieCode,
        budgetItemId: item?.id ?? null,
      }
      try {
        await onSubmit(payload)
        if (closeAfter) {
          onClose()
        } else {
          form.reset({
            dateYmd: v.dateYmd,
            produit: '',
            quantite: 1,
            unite: '',
            prixUnitaire: 0,
            posteId: '',
            enveloppeCode:
              budgetItems.length === 0 ? v.enveloppeCode : '',
          })
          window.setTimeout(() => form.setFocus('produit'), 0)
        }
      } catch {
        /* erreur réseau / API : garder le panneau ouvert */
      }
    })()
  }

  return (
    <Offcanvas
      open={open}
      onClose={onClose}
      title="Nouvelle ligne — main courante"
      disableClose={isPending}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="overflow-visible">
              <label
                className="mb-1 block text-xs text-stone-600"
                htmlFor="depense-add-date"
              >
                Date
              </label>
              <Controller
                name="dateYmd"
                control={form.control}
                render={({ field }) => (
                  <DateFrField
                    id="depense-add-date"
                    valueYmd={field.value}
                    onChangeYmd={field.onChange}
                    onBlur={field.onBlur}
                    disabled={disabled || isPending}
                    inputClassName="min-w-0"
                  />
                )}
              />
              {form.formState.errors.dateYmd ? (
                <p className="mt-1 text-xs text-red-600">
                  {form.formState.errors.dateYmd.message}
                </p>
              ) : null}
            </div>
            <div className="relative">
              <label className="mb-1 block text-xs text-stone-600">Produit</label>
              <Input
                {...form.register('produit', {
                  onChange: () => form.setValue('posteId', ''),
                })}
                disabled={disabled || isPending}
                autoComplete="off"
                onFocus={() => setSuggestOpen(true)}
                onBlur={() => setTimeout(() => setSuggestOpen(false), 200)}
              />
              {suggestOpen && suggestions.length > 0 ? (
                <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-0 py-1 text-sm shadow-md">
                  {suggestions.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-stone-100"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickBudgetItem(b)}
                      >
                        {b.nom}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {form.formState.errors.produit ? (
                <p className="mt-1 text-xs text-red-600">
                  {form.formState.errors.produit.message}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-stone-600">Qté</label>
                <Input
                  type="number"
                  step="any"
                  min={0.0001}
                  {...form.register('quantite', { valueAsNumber: true })}
                  disabled={disabled || isPending}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-stone-600">
                  Unité
                </label>
                <Input
                  {...form.register('unite')}
                  disabled={disabled || isPending}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-stone-600">PU (Ar)</label>
              <Input
                type="number"
                min={0}
                step={1}
                {...form.register('prixUnitaire', { valueAsNumber: true })}
                disabled={disabled || isPending}
              />
            </div>
            <div>
              {!showEnveloppeOnly ? (
                <>
                  <label className="mb-1 block text-xs text-stone-600">
                    Poste budgétaire
                  </label>
                  <Controller
                    name="posteId"
                    control={form.control}
                    render={({ field }) => (
                      <BudgetPostSearchField
                        id="depense-add-poste"
                        posts={sortedPosts}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        disabled={disabled || isPending}
                      />
                    )}
                  />
                </>
              ) : null}
              {showEnveloppeOnly ? (
                <div>
                  <label className="mb-1 block text-xs text-stone-600">
                    Enveloppe
                  </label>
                  <Select
                    {...form.register('enveloppeCode')}
                    disabled={disabled || isPending}
                  >
                    {categoryCodes.length === 0 ? (
                      <option value="">— Aucune enveloppe —</option>
                    ) : (
                      categoryCodes.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.libelle}
                        </option>
                      ))
                    )}
                  </Select>
                </div>
              ) : null}
              <Link
                to="/budget"
                className="mt-1.5 inline-block text-left text-xs font-medium text-stone-600 underline decoration-stone-400 underline-offset-2 hover:text-[var(--color-ink)]"
              >
                Nouveau poste budgétaire…
              </Link>
              {form.formState.errors.posteId ? (
                <p className="mt-1 text-xs text-red-600">
                  {form.formState.errors.posteId.message}
                </p>
              ) : null}
              {form.formState.errors.enveloppeCode ? (
                <p className="mt-1 text-xs text-red-600">
                  {form.formState.errors.enveloppeCode.message}
                </p>
              ) : null}
            </div>
          </div>
          <div className="shrink-0 space-y-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                className="sm:flex-1"
                disabled={disabled || isPending}
                onClick={() => void submit(true)}
              >
                {isPending ? 'Enregistrement…' : 'Enregistrer et fermer'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="sm:flex-1"
                disabled={disabled || isPending}
                onClick={() => void submit(false)}
              >
                {isPending ? 'Enregistrement…' : 'Enregistrer et ajouter une autre'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Offcanvas>
  )
}
