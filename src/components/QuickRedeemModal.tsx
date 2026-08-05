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
      setQuantidade(disponivel > 0 ? disponivel.toString() : '0');
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

  const optionQuantities = Array.from({ length: Math.min(disponivel, 5) }, (_, i) => i + 1);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-md w-[92vw] rounded-2xl bg-white text-stone-900 border border-stone-200 shadow-2xl p-5 max-h-[85vh] flex flex-col justify-between overflow-y-auto animate-scale-in"
        onPointerDownOutside={(e) => {
          const activeEl = document.activeElement;
          if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            e.preventDefault();
          }
        }}
      >
        <div>
          <DialogHeader className="text-left space-y-1.5 pb-3 border-b border-stone-200">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[11px] font-bold font-display">
                <Ticket className="w-3 h-3 text-orange-600" />
                Resgate Rápido
              </span>
              <StatusBadge status={buyer.status} />
            </div>

            <DialogTitle className="font-display text-xl font-extrabold text-stone-900 tracking-tight leading-snug">
              {buyer.nome}
            </DialogTitle>

            <DialogDescription className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs text-stone-600 font-semibold">
              {buyer.contato ? (
                <span className="inline-flex items-center gap-1 text-stone-900 font-bold">
                  <Phone className="w-3 h-3 text-orange-600" />
                  {buyer.contato}
                </span>
              ) : (
                <span className="text-stone-500">Sem telefone</span>
              )}
              <span className="hidden sm:inline text-stone-400">•</span>
              <span>
                Resgatados: <strong className="text-stone-900">{buyer.ingressos_resgatados}</strong>/{buyer.num_ingressos} (Disponível: <strong className="text-orange-600">{disponivel}</strong>)
              </span>
            </DialogDescription>
          </DialogHeader>

          {disponivel <= 0 ? (
            <div className="py-6 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-base text-stone-900">Todos os ingressos resgatados!</h3>
              <p className="text-xs text-stone-600 max-w-xs mx-auto">
                Este comprador já retirou todos os {buyer.num_ingressos} ingressos vinculados.
              </p>
            </div>
          ) : (
            <form id="quick-redeem-form" onSubmit={handleRedeem} className="space-y-3.5 py-3">
              {/* Selecionador de Quantidade (Pills sem teclado virtual) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-stone-900">
                  Quantidade a resgatar:
                </Label>
                <div className="flex flex-wrap gap-2">
                  {optionQuantities.map((num) => {
                    const isSelected = parseInt(quantidade, 10) === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQuantidade(num.toString())}
                        className={`h-10 px-3.5 font-bold text-xs rounded-xl transition-all border ${
                          isSelected
                            ? 'bg-orange-600 text-white border-orange-600 shadow-md ring-2 ring-orange-400/30'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300'
                        }`}
                      >
                        {num === disponivel && disponivel > 1 ? `Todos (${num})` : `${num} ingresso${num > 1 ? 's' : ''}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quem esta retirando */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-bold text-stone-900">Quem está retirando?</Label>
                <RadioGroup
                  value={retiradaPor}
                  onValueChange={(val: 'comprador' | 'outra') => setRetiradaPor(val)}
                  className="grid grid-cols-2 gap-2"
                >
                  <label
                    htmlFor="r-comprador"
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer font-bold text-xs transition-all ${
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
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer font-bold text-xs transition-all ${
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 rounded-xl bg-orange-50/60 border border-orange-200 animate-fade-in">
                  <div className="space-y-1">
                    <Label htmlFor="nome-retirada" className="text-[11px] font-bold text-stone-900">
                      Nome de quem retirou *
                    </Label>
                    <Input
                      id="nome-retirada"
                      placeholder="Ex: Maria Silva"
                      value={nomeRetirada}
                      onChange={(e) => setNomeRetirada(e.target.value)}
                      required
                      className="h-9 text-xs bg-white border-stone-300 text-stone-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tel-retirada" className="text-[11px] font-bold text-stone-900">
                      Telefone
                    </Label>
                    <Input
                      id="tel-retirada"
                      placeholder="(00) 00000-0000"
                      value={telefoneRetirada}
                      onChange={(e) => setTelefoneRetirada(e.target.value)}
                      className="h-9 text-xs bg-white border-stone-300 text-stone-900"
                    />
                  </div>
                </div>
              )}

              {/* Observacao opcional */}
              <div className="space-y-1">
                <Label htmlFor="obs-input" className="text-xs font-bold text-stone-900">
                  Observação (opcional):
                </Label>
                <Textarea
                  id="obs-input"
                  placeholder="Anotações sobre a retirada..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={2}
                  className="bg-stone-50 border-stone-300 text-stone-900 rounded-xl text-xs font-medium focus:bg-white"
                />
              </div>
            </form>
          )}
        </div>

        <DialogFooter className="pt-2 border-t border-stone-200 gap-2 sm:gap-0">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose} 
            className="h-11 rounded-xl font-bold bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300 text-xs"
          >
            Cancelar
          </Button>
          {disponivel > 0 && (
            <Button
              type="submit"
              form="quick-redeem-form"
              disabled={createRedemption.isPending}
              className="h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl gap-2 px-5 shadow-lg text-xs"
            >
              {createRedemption.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
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
