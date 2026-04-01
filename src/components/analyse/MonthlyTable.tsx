import type { MonthlyStats } from '../../types'
import { Table, Th, Td } from '../ui/Table'
import { toAriary } from '../../utils/formatters'

export function MonthlyTable({ rows }: { rows: MonthlyStats[] }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <Table>
        <thead>
          <tr>
            <Th>Catégorie</Th>
            <Th className="text-right">Prévision</Th>
            <Th className="text-right">Réel</Th>
            <Th className="text-right">Écart</Th>
            <Th className="text-right">%</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.categorie}>
              <Td>{r.categorie}</Td>
              <Td className="text-right tabular-nums">{toAriary(r.prevision)}</Td>
              <Td className="text-right tabular-nums">{toAriary(r.reel)}</Td>
              <Td
                className={`text-right tabular-nums ${
                  r.ecart > 0 ? 'text-red-600' : r.ecart < 0 ? 'text-emerald-700' : ''
                }`}
              >
                {toAriary(r.ecart)}
              </Td>
              <Td className="text-right tabular-nums">
                {r.prevision > 0 ? `${r.pourcentage} %` : '—'}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
