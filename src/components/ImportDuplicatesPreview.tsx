import { AlertTriangle, CheckCircle2, Users, Layers } from 'lucide-react';
import type { DuplicateAnalysis } from '@/lib/import/duplicates';

interface Props<T extends { nome: string; ministerios?: string[] }> {
  analysis: DuplicateAnalysis<T>;
}

export function ImportDuplicatesPreview<T extends { nome: string; ministerios?: string[] }>({
  analysis,
}: Props<T>) {
  const { unique, internalDuplicates, existingDuplicates, totalParsed } = analysis;
  const hasIssues = internalDuplicates.length > 0 || existingDuplicates.length > 0;

  return (
    <div className="space-y-3">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground font-medium">Linhas Lidas</p>
          <p className="text-2xl font-bold">{totalParsed}</p>
        </div>
        <div className="rounded-lg border border-success/30 bg-success/5 p-3">
          <p className="text-xs text-success font-medium">Pessoas Únicas</p>
          <p className="text-2xl font-bold text-success">{unique.length}</p>
        </div>
        <div
          className={`rounded-lg border p-3 ${
            hasIssues ? 'border-warning/40 bg-warning/5' : 'border-border/60 bg-muted/30'
          }`}
        >
          <p className={`text-xs font-medium ${hasIssues ? 'text-warning-foreground' : 'text-muted-foreground'}`}>
            Linhas Agrupadas / Repetidas
          </p>
          <p className="text-2xl font-bold">
            {internalDuplicates.length + existingDuplicates.length}
          </p>
        </div>
      </div>

      {!hasIssues && (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm text-success font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Nenhum registro repetido. Todos os registros são únicos.
        </div>
      )}

      {internalDuplicates.length > 0 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm font-semibold text-primary">
              {internalDuplicates.length} pessoa{internalDuplicates.length > 1 ? 's com ministérios agrupados' : ' com ministérios agrupados'}
            </p>
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
            {internalDuplicates.map((d, i) => (
              <div key={i} className="flex flex-col text-xs p-2 rounded bg-background/80 border border-border/40 gap-1">
                <div className="flex items-center justify-between font-semibold">
                  <span className="truncate">{d.nome}</span>
                  <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                    {d.count} linhas fundidas
                  </span>
                </div>
                {d.ministerios && d.ministerios.length > 0 && (
                  <p className="text-muted-foreground font-medium text-[11px]">
                    Ministérios: <strong className="text-foreground">{d.ministerios.join(', ')}</strong>
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Os ministérios de todas as linhas foram vinculados a cada pessoa em um registro único com 1 ingresso.
          </p>
        </div>
      )}

      {existingDuplicates.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm font-semibold text-destructive">
              {existingDuplicates.length} pessoa{existingDuplicates.length > 1 ? 's' : ''} já cadastrada{existingDuplicates.length > 1 ? 's' : ''} no evento
            </p>
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
            {existingDuplicates.map((d, i) => (
              <div key={i} className="text-xs px-2 py-1 rounded bg-background/80 font-medium truncate">
                {d.nome}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Estes nomes já constam no banco de dados e serão mantidos sem duplicação.
          </p>
        </div>
      )}
    </div>
  );
}
