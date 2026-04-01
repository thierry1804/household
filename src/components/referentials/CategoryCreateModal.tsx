import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Categorie } from '../../types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { slugifyReferentialCode } from '../../utils/slug'
import { getViolations } from '../../services/api'
import axios from 'axios'

const schema = z.object({
  libelle: z.string().min(1, 'Libellé requis').max(120),
  code: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_]+$/, 'Code : minuscules, chiffres et _ uniquement'),
  couleur: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur hex (#RRGGBB)'),
})

type FormValues = z.infer<typeof schema>

/**
 * Création d’une catégorie (POST /api/categories).
 * Même schéma peut servir de modèle pour d’autres référentiels : service POST + mutation + modal dédié.
 */
export function CategoryCreateModal({
  open,
  onClose,
  categories,
  onCreated,
  createCategory,
  isPending,
}: {
  open: boolean
  onClose: () => void
  categories: Categorie[]
  onCreated?: (c: Categorie) => void
  createCategory: (payload: {
    code: string
    libelle: string
    couleur: string
    icone: null
    ordre: number
  }) => Promise<Categorie>
  isPending: boolean
}) {
  const nextOrdre =
    categories.length === 0
      ? 0
      : Math.max(...categories.map((c) => c.ordre)) + 1

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      libelle: '',
      code: '',
      couleur: '#78716c',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({ libelle: '', code: '', couleur: '#78716c' })
    }
  }, [open, form])

  const couleurWatch = useWatch({ control: form.control, name: 'couleur' })

  async function onSubmit(values: FormValues) {
    try {
      const created = await createCategory({
        code: values.code,
        libelle: values.libelle.trim(),
        couleur: values.couleur,
        icone: null,
        ordre: nextOrdre,
      })
      onCreated?.(created)
      onClose()
    } catch (err) {
      const v = getViolations(err)
      if (v.length) {
        window.alert(v.map((x) => `${x.field}: ${x.message}`).join('\n'))
      } else if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string } | undefined
        window.alert(data?.error ?? err.message)
      }
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle catégorie">
      <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <label className="mb-1 block text-xs text-stone-600">Libellé</label>
          <Input
            placeholder="Ex. Épicerie"
            {...form.register('libelle', {
              onBlur: (e) => {
                const cur = form.getValues('code').trim()
                if (!cur) {
                  form.setValue(
                    'code',
                    slugifyReferentialCode(e.target.value),
                    { shouldValidate: true },
                  )
                }
              },
            })}
          />
          {form.formState.errors.libelle ? (
            <p className="mt-1 text-xs text-red-600">
              {form.formState.errors.libelle.message}
            </p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-xs text-stone-600">Code</label>
          <Input
            placeholder="epicerie"
            autoComplete="off"
            {...form.register('code')}
          />
          <p className="mt-1 text-xs text-stone-500">
            Unique, stable (souvent dérivé du libellé à la première saisie).
          </p>
          {form.formState.errors.code ? (
            <p className="mt-1 text-xs text-red-600">
              {form.formState.errors.code.message}
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
            <Input
              className="w-28 font-mono text-sm"
              {...form.register('couleur')}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Création…' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
