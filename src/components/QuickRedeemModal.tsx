import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateRedemption, Buyer } from '@/hooks/useBuyers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { StatusBadge } from '@/components/StatusBadge';
import { Ticket, Phone, CheckCircle2, Loader2, UserCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface QuickRedeemModalProps {
  buyer: Buyer | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickRedeemModal({ buyer, isOpen, onClose }: QuickRedeemModalProps) {
  const { user, profile } = useAuth();
  const createRedemption = useCreateRedemption();

  const [quantidade, setQuantidade] = useState('1');
  const [retiradaPor, setRetiradaPor] = useState<'comprador' | 'outra'>('comprador');
  const [nomeRetirada, setNomeRetirada] = useState('');
  const [telefoneRetirada, setTelefoneRetirada] = useState('');
  const [observacao, setObservacao] = useState('');

  const disponivel = buyer ? Math.max(0, buyer.num_ingressos - buyer.ingressos_resgatados) : 0;

  useEffect(() => {
    if (buyer) {
      setQuantidade(disponivel > 0 ? '1' : '0');
      setRetiradaPor('comprador');
      setNomeRetirada('');
      setTelefoneRetirada('');
      setObservacao('');
    }
  }, [buyer, disponivel]);

  if (!buyer) return null;

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Você precisa estar autenticado');
      return;
    }

    const qtdNum = parseInt(quantidade, 10);
    if (isNaN(qtdNum) || qtdNum <= 0) {
      toast.error('Informe uma quantidade válida de ingressos');
      return;
    }

    if (qtdNum > disponivel) {
      toast.error(`Quantidade maior que o disponível (${disponivel})`);
      return;
    }

    try {
      await createRedemption.mutateAsync({
        buyer_id: buyer.id,
        event_id: buyer.event_id,
        quantidade: qtdNum,
        resgatado_por_comprador: retiradaPor === 'comprador',
        nome_retirada: retiradaPor === 'outra' ? nomeRetirada.trim() : undefined,
        telefone_retirada: retiradaPor === 'outra' ? telefoneRetirada.trim() : undefined,
        observacao: observacao.trim() || undefined,
        operador_id: user.id,
        operador_nome: profile?.full_name || user.email || undefined,
      });

      toast.success(`${qtdNum} ingresso(s) resgatado(s) com sucesso para ${buyer.nome}!`);
      onClose();
    } catch (err: any) {
      toast.error('Erro ao realizar resgate: ' + (err?.message || 'Erro desconhecido'));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-lg w-[95vw] rounded-2xl bg-white text-stone-900 border border-stone-200 shadow-2xl p-6 max-h-[90vh] flex flex-col justify-between overflow-y-auto"
        onPointerDownOutside={(e) => {
          const activeEl = document.activeElement;
          if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            e.preventDefault();
          }
        }}
      >
        <div>
          <DialogHeader className="text-left space-y-2 pb-3 border-b border-stone-200">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold font-display">
                <Ticket className="w-3.5 h-3.5 text-orange-600" />
                Resgate Rápido
              </span>
              <StatusBadge status={buyer.status} />
            </div>

            <DialogTitle className="font-display text-2xl font-extrabold text-stone-900 tracking-tight leading-snug">
              {buyer.nome}
            </DialogTitle>

            <DialogDescription className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-stone-600 font-semibold">
              {buyer.contato ? (
                <span className="inline-flex items-center gap-1 text-stone-900 font-bold">
                  <Phone className="w-3.5 h-3.5 text-orange-600" />
                  {buyer.contato}
                </span>
              ) : (
                <span className="text-stone-500">Sem telefone cadastrado</span>
              )}
              <span className="hidden sm:inline text-stone-400">•</span>
              <span>
                Ingressos: <strong className="text-stone-900">{buyer.ingressos_resgatados}</strong> / {buyer.num_ingressos} (Disponível: <strong className="text-orange-600">{disponivel}</strong>)
              </span>
            </DialogDescription>
          </DialogHeader>

          {disponivel <= 0 ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-display font-bold text-lg text-stone-900">Todos os ingressos resgatados!</h3>
              <p className="text-sm text-stone-600 max-w-xs mx-auto">
                Este comprador já retirou todos os {buyer.num_ingressos} ingressos vinculados.
              </p>
            </div>
          ) : (
            <form id="quick-redeem-form" onSubmit={handleRedeem} className="space-y-4 py-4">
              {/* Quantidade */}
              <div className="space-y-2">
                <Label htmlFor="qtd-input" className="text-sm font-bold text-stone-900">
                  Quantidade a resgatar agora:
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="qtd-input"
                    type="number"
                    min="1"
                    max={disponivel}
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    className="h-12 text-lg font-extrabold text-center w-28 bg-stone-50 border-stone-300 text-stone-900 rounded-xl focus:bg-white"
                  />
                  <div className="flex gap-1.5 flex-1">
                    {[1, 2, disponivel].filter((v, i, self) => v > 0 && v <= disponivel && self.indexOf(v) === i).map((num) => (
                      <Button
                        key={num}
                        type="button"
                        onClick={() => setQuantidade(num.toString())}
                        className={`h-12 flex-1 font-bold rounded-xl transition-all ${
                          parseInt(quantidade, 10) === num
                            ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-md'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300'
                        }`}
                      >
                        {num === disponivel && disponivel > 1 ? `Todos (${num})` : num}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quem esta retirando */}
              <div className="space-y-2 pt-1">
                <Label className="text-sm font-bold text-stone-900">Quem está retirando?</Label>
                <RadioGroup
                  value={retiradaPor}
                  onValueChange={(val: 'comprador' | 'outra') => setRetiradaPor(val)}
                  className="grid grid-cols-2 gap-3"
                >
                  <label
                    htmlFor="r-comprador"
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer font-bold text-sm transition-all ${
                      retiradaPor === 'comprador'
                        ? 'border-orange-500 bg-orange-50 text-orange-950 ring-2 ring-orange-400/30'
                        : 'border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800'
                    }`}
                  >
                    <RadioGroupItem value="comprador" id="r-comprador" />
                    <span>O próprio comprador</span>
                  </label>
                  <label
                    htmlFor="r-outra"
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer font-bold text-sm transition-all ${
                      retiradaPor === 'outra'
                        ? 'border-orange-500 bg-orange-50 text-orange-950 ring-2 ring-orange-400/30'
                        : 'border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800'
                    }`}
                  >
                    <RadioGroupItem value="outra" id="r-outra" />
                    <span>Outra pessoa</span>
                  </label>
                </RadioGroup>
              </div>

              {retiradaPor === 'outra' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-orange-50/60 border border-orange-200 animate-fade-in">
                  <div className="space-y-1.5">
                    <Label htmlFor="nome-retirada" className="text-xs font-bold text-stone-900">
                      Nome de quem retirou *
                    </Label>
                    <Input
                      id="nome-retirada"
                      placeholder="Ex: Maria Silva (Esposa)"
                      value={nomeRetirada}
                      onChange={(e) => setNomeRetirada(e.target.value)}
                      required
                      className="h-10 text-sm bg-white border-stone-300 text-stone-900"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tel-retirada" className="text-xs font-bold text-stone-900">
                      Telefone de quem retirou
                    </Label>
                    <Input
                      id="tel-retirada"
                      placeholder="(00) 00000-0000"
                      value={telefoneRetirada}
                      onChange={(e) => setTelefoneRetirada(e.target.value)}
                      className="h-10 text-sm bg-white border-stone-300 text-stone-900"
                    />
                  </div>
                </div>
              )}

              {/* Observacao opcional */}
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="obs-input" className="text-sm font-bold text-stone-900">
                  Observação (opcional):
                </Label>
                <Textarea
                  id="obs-input"
                  placeholder="Anotações sobre a retirada..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={2}
                  className="bg-stone-50 border-stone-300 text-stone-900 rounded-xl text-sm font-medium focus:bg-white"
                />
              </div>
            </form>
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-stone-200 gap-2 sm:gap-0">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose} 
            className="h-12 rounded-xl font-bold bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300"
          >
            Cancelar
          </Button>
          {disponivel > 0 && (
            <Button
              type="submit"
              form="quick-redeem-form"
              disabled={createRedemption.isPending}
              className="h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl gap-2 px-6 shadow-lg"
            >
              {createRedemption.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <UserCheck className="w-5 h-5" />
                  Confirmar Resgate ({quantidade})
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
