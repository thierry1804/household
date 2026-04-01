import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Categorie } from '../../types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { getApiErrorMessage, getViolations } from '../../services/api'

const schema = z.object({
  libelle: z.string().min(1, 'Libellé requis').max(120),
  couleur: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur hex (#RRGGBB)'),
  ordre: z.number({ error: 'Nombre entier requis' }).int().min(0, 'Ordre ≥ 0'),
})

type FormValues = z.infer<typeof schema>

export function CategoryEditModal({
  open,
  onClose,
  category,
  updateCategory,
  isPending,
}: {
  open: boolean
  onClose: () => void
  category: Categorie | null
  updateCategory: (id: number, payload: FormValues) => Promise<Categorie>
  isPending: boolean
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      libelle: '',
      couleur: '#78716c',
      ordre: 0,
    },
  })

  useEffect(() => {
    if (open && category) {
      form.reset({
        libelle: category.libelle,
        couleur: category.couleur,
        ordre: category.ordre,
      })
    }
  }, [open, category, form])

  const couleurWatch = useWatch({ control: form.control, name: 'couleur' })

  async function onSubmit(values: FormValues) {
    if (!category) return
    try {
      await updateCategory(category.id, {
        libelle: values.libelle.trim(),
        couleur: values.couleur,
        ordre: values.ordre,
      })
      onClose()
    } catch (err) {
      const v = getViolations(err)
      if (v.length) {
        window.alert(v.map((x) => `${x.field}: ${x.message}`).join('\n'))
      } else {
        window.alert(getApiErrorMessage(err))
      }
    }
  }

  if (!category) return null

  return (
    <Modal open={open} onClose={onClose} title="Modifier la catégorie">
      <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <label className="mb-1 block text-xs text-stone-600">Code</label>
          <p className="rounded-lg border border-[var(--color-border)] bg-stone-50 px-3 py-2 font-mono text-sm text-stone-700">
            {category.code}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Le code est utilisé en base ; contactez l’administrateur pour le renommer si nécessaire.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs text-stone-600">Libellé</label>
          <Input {...form.register('libelle')} />
          {form.formState.errors.libelle ? (
            <p className="mt-1 text-xs text-red-600">
              {form.formState.errors.libelle.message}
            </p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-xs text-stone-600">Ordre d’affichage</label>
          <Input
            type="number"
            min={0}
            step={1}
            {...form.register('ordre', { valueAsNumber: true })}
          />
          {form.formState.errors.ordre ? (
            <p className="mt-1 text-xs text-red-600">
              {form.formState.errors.ordre.message}
            </p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-xs text-stone-600">Couleur</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-10 w-14 cursor-pointer rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
              value={couleurWatch ?? '#78716c'}
              onChange={(e) =>
                form.setValue('couleur', e.target.value, { shouldValidate: true })
              }
            />
            <Input className="w-28 font-mono text-sm" {...form.register('couleur')} />
          </div>
          {form.formState.errors.couleur ? (
            <p className="mt-1 text-xs text-red-600">
              {form.formState.errors.couleur.message}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
