import { useMemo, useState } from 'react'
import { Header } from '../components/layout/Header'
import { CategoryCreateModal } from '../components/referentials/CategoryCreateModal'
import { CategoryEditModal } from '../components/referentials/CategoryEditModal'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Table, Th, Td } from '../components/ui/Table'
import { useCategories } from '../hooks/useCategories'
import { getApiErrorMessage } from '../services/api'
import type { Categorie } from '../types'
import { Pencil, Plus, Trash2 } from 'lucide-react'

export function ReferentialsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Categorie | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<Categorie | null>(null)
  const {
    data: categories = [],
    isLoading,
    isError,
    error,
    createCategory,
    updateCategory: updateCategoryMut,
    deleteCategory: deleteCategoryMut,
  } = useCategories()

  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.ordre - b.ordre),
    [categories],
  )

  if (isLoading) {
    return (
      <>
        <Header title="Référentiels" />
        <div className="p-4 text-stone-600 md:px-8">Chargement…</div>
      </>
    )
  }

  if (isError) {
    return (
      <>
        <Header title="Référentiels" />
        <div className="p-4 text-red-600 md:px-8">
          {error instanceof Error ? error.message : 'Impossible de charger les données.'}
        </div>
      </>
    )
  }

  return (
    <>
      <Header
        title="Référentiels"
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle catégorie
          </Button>
        }
      />
      <CategoryCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        categories={categories}
        createCategory={(p) => createCategory.mutateAsync(p)}
        isPending={createCategory.isPending}
      />
      <CategoryEditModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        category={editing}
        updateCategory={(id, payload) =>
          updateCategoryMut.mutateAsync({ id, payload })
        }
        isPending={updateCategoryMut.isPending}
      />
      <ConfirmDialog
        open={categoryToDelete !== null}
        onClose={() => setCategoryToDelete(null)}
        title="Supprimer cette catégorie ?"
        confirmLabel="Supprimer définitivement"
        cancelLabel="Conserver"
        isPending={deleteCategoryMut.isPending}
        onConfirm={async () => {
          if (!categoryToDelete) return
          try {
            await deleteCategoryMut.mutateAsync(categoryToDelete.id)
            setCategoryToDelete(null)
          } catch (e) {
            window.alert(getApiErrorMessage(e))
          }
        }}
      >
        {categoryToDelete ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-stone-50 px-3 py-2.5">
              <span
                className="h-10 w-10 shrink-0 rounded-md border border-[var(--color-border)]"
                style={{ backgroundColor: categoryToDelete.couleur }}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="font-medium text-[var(--color-ink)]">
                  {categoryToDelete.libelle}
                </p>
                <p className="font-mono text-xs text-stone-500">
                  {categoryToDelete.code}
                </p>
              </div>
            </div>
            <p>
              Vous allez retirer cette catégorie du référentiel. La suppression est
              définitive.
            </p>
            <p>
              Si des dépenses ou des lignes de budget y sont encore liées, le serveur
              refusera l’opération : dans ce cas, modifiez ou supprimez d’abord ces
              éléments.
            </p>
          </div>
        ) : null}
      </ConfirmDialog>
      <div className="space-y-6 p-4 md:px-8 md:py-6">
        <Card>
          <CardHeader>
            <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
              Catégories
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Codes utilisés dans le budget, les dépenses et les analyses.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            {sorted.length === 0 ? (
              <p className="text-sm text-stone-500">Aucune catégorie pour le moment.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
                <Table>
                  <thead>
                    <tr>
                      <Th>Ordre</Th>
                      <Th>Code</Th>
                      <Th>Libellé</Th>
                      <Th>Couleur</Th>
                      <Th className="w-[1%] whitespace-nowrap text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((c) => (
                      <tr key={c.id}>
                        <Td className="tabular-nums text-stone-600">{c.ordre}</Td>
                        <Td className="font-mono text-sm">{c.code}</Td>
                        <Td>{c.libelle}</Td>
                        <Td>
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="inline-block h-4 w-4 rounded border border-[var(--color-border)]"
                              style={{ backgroundColor: c.couleur }}
                              title={c.couleur}
                            />
                            <span className="font-mono text-xs text-stone-600">
                              {c.couleur}
                            </span>
                          </span>
                        </Td>
                        <Td className="whitespace-nowrap text-right align-middle">
                          <div className="inline-flex flex-nowrap items-center justify-end gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              className="shrink-0 px-2 py-1.5"
                              onClick={() => setEditing(c)}
                              title="Modifier"
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Modifier</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="shrink-0 px-2 py-1.5 text-red-700 hover:bg-red-50"
                              onClick={() => setCategoryToDelete(c)}
                              disabled={deleteCategoryMut.isPending}
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Supprimer</span>
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
              Autres listes
            </h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-600">
              D’autres référentiels (ex. libellés récurrents, unités) pourront être ajoutés ici
              lorsque l’API les exposera.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
