import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBuyer, useBuyerRedemptions, useCreateRedemption, useUndoRedemption, useRedeemAll, useRemoveBuyer } from '@/hooks/useBuyers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import {
  ArrowLeft,
  Ticket,
  Phone,
  Calendar,
  MapPin,
  CheckCircle2,
  Loader2,
  User,
  Undo2,
  Clock,
  Zap,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function BuyerDetail() {
  const { buyerId } = useParams<{ buyerId: string }>();
  const navigate = useNavigate();
  const { user, profile, isAdmin } = useAuth();
  const { data: buyer, isLoading: buyerLoading } = useBuyer(buyerId);
  const { data: redemptions, isLoading: redemptionsLoading } = useBuyerRedemptions(buyerId);
  const createRedemption = useCreateRedemption();
  const undoRedemption = useUndoRedemption();
  const redeemAll = useRedeemAll();
  const removeBuyer = useRemoveBuyer();

  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [quantidade, setQuantidade] = useState('1');
  const [retiradaPor, setRetiradaPor] = useState<'comprador' | 'outra'>('comprador');
  const [nomeRetirada, setNomeRetirada] = useState('');
  const [telefoneRetirada, setTelefoneRetirada] = useState('');
  const [observacao, setObservacao] = useState('');

  const [isUndoOpen, setIsUndoOpen] = useState(false);
  const [selectedRedemption, setSelectedRedemption] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState('');

  const [isRedeemAllOpen, setIsRedeemAllOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [motivoRemocao, setMotivoRemocao] = useState('');

  const handleRedeem = async () => {
    if (!buyer || !user) return;

    await createRedemption.mutateAsync({
      buyer_id: buyer.id,
      event_id: buyer.event_id,
      quantidade: parseInt(quantidade),
      resgatado_por_comprador: retiradaPor === 'comprador',
      nome_retirada: retiradaPor === 'outra' ? nomeRetirada : undefined,
      telefone_retirada: retiradaPor === 'outra' ? telefoneRetirada : undefined,
      observacao: observacao || undefined,
      operador_id: user.id,
      operador_nome: profile?.full_name || user.email || undefined,
    });

    setIsRedeemOpen(false);
    setQuantidade('1');
    setRetiradaPor('comprador');
    setNomeRetirada('');
    setTelefoneRetirada('');
    setObservacao('');
  };

  const handleUndo = async () => {
    if (!selectedRedemption || !user) return;

    await undoRedemption.mutateAsync({
      redemptionId: selectedRedemption,
      justificativa,
      userId: user.id,
    });

    setIsUndoOpen(false);
    setSelectedRedemption(null);
    setJustificativa('');
  };

  const openUndoDialog = (redemptionId: string) => {
    setSelectedRedemption(redemptionId);
    setIsUndoOpen(true);
  };

  const handleRedeemAll = async () => {
    if (!buyer || !user || disponivel <= 0) return;

    await redeemAll.mutateAsync({
      buyerId: buyer.id,
      eventId: buyer.event_id,
      quantidade: disponivel,
      operadorId: user.id,
      operadorNome: profile?.full_name || user.email || undefined,
    });

    setIsRedeemAllOpen(false);
  };

  const handleRemove = async () => {
    if (!buyer || !user || !motivoRemocao) return;

    await removeBuyer.mutateAsync({
      buyerId: buyer.id,
      motivo: motivoRemocao,
      userId: user.id,
    });

    setIsRemoveOpen(false);
    navigate(`/event/${buyer.event_id}`);
  };

  const disponivel = buyer ? buyer.num_ingressos - buyer.ingressos_resgatados : 0;

  if (buyerLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!buyer) {
    return (
      <div className="text-center py-12">
        <h2 className="font-display text-xl font-semibold mb-2">Comprador não encontrado</h2>
        <Link to="/dashboard">
          <Button variant="outline">Voltar aos Eventos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link to={`/event/${buyer.event_id}`} className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors w-fit">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar ao Evento
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">{buyer.nome}</h1>
            <div className="flex items-center gap-3 mt-2">
              <StatusBadge status={buyer.status} />
              <span className="text-muted-foreground">
                {buyer.ingressos_resgatados}/{buyer.num_ingressos} ingressos resgatados
              </span>
            </div>
            {buyer.ministerios && buyer.ministerios.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {buyer.ministerios.map((m) => (
                  <span
                    key={m}
                    className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                  >
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            {buyer.contato && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{buyer.contato}</span>
              </div>
            )}
            {buyer.data_compra && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Comprado em {buyer.data_compra}</span>
              </div>
            )}
            {buyer.entrega && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{buyer.entrega}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                <span className="font-medium">Ingressos Disponíveis</span>
              </div>
              <span className="text-2xl font-display font-bold text-primary">{disponivel}</span>
            </div>
            <Dialog open={isRedeemOpen} onOpenChange={setIsRedeemOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gradient-primary gap-2" disabled={disponivel === 0}>
                  <CheckCircle2 className="h-4 w-4" />
                  Registrar Resgate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Resgate</DialogTitle>
                  <DialogDescription>
                    Confirme os detalhes do resgate para {buyer.nome}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label>Quantidade de Ingressos</Label>
                    <Select value={quantidade} onValueChange={setQuantidade}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: disponivel }, (_, i) => i + 1).map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n} ingresso{n > 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>Quem está retirando?</Label>
                    <RadioGroup value={retiradaPor} onValueChange={(v) => setRetiradaPor(v as 'comprador' | 'outra')}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="comprador" id="comprador" />
                        <Label htmlFor="comprador" className="font-normal">
                          O próprio comprador ({buyer.nome})
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="outra" id="outra" />
                        <Label htmlFor="outra" className="font-normal">
                          Outra pessoa
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {retiradaPor === 'outra' && (
                    <div className="space-y-4 p-4 bg-muted rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor="nomeRetirada">Nome de quem retirou *</Label>
                        <Input
                          id="nomeRetirada"
                          value={nomeRetirada}
                          onChange={(e) => setNomeRetirada(e.target.value)}
                          placeholder="Nome completo"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefoneRetirada">Telefone (opcional)</Label>
                        <Input
                          id="telefoneRetirada"
                          value={telefoneRetirada}
                          onChange={(e) => setTelefoneRetirada(e.target.value)}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="observacao">Observação (opcional)</Label>
                    <Textarea
                      id="observacao"
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      placeholder="Alguma observação sobre o resgate..."
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter className="flex-col gap-2 sm:flex-row">
                  {/* Resgatar tudo - dentro do dialog */}
                  {disponivel > 1 && (
                    <Dialog open={isRedeemAllOpen} onOpenChange={setIsRedeemAllOpen}>
                      <DialogTrigger asChild>
                        <Button variant="secondary" className="w-full sm:w-auto gap-2">
                          <Zap className="h-4 w-4" />
                          Resgatar tudo ({disponivel})
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Resgatar todos os ingressos</DialogTitle>
                          <DialogDescription>
                            Você está prestes a resgatar <strong>{disponivel} ingressos</strong> para {buyer.nome}. Confirmar?
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsRedeemAllOpen(false)}>
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleRedeemAll}
                            disabled={redeemAll.isPending}
                            className="gradient-primary"
                          >
                            {redeemAll.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Resgate
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" onClick={() => setIsRedeemOpen(false)} className="flex-1 sm:flex-none">
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleRedeem}
                      disabled={createRedemption.isPending || (retiradaPor === 'outra' && !nomeRetirada.trim())}
                      className="flex-1 sm:flex-none"
                    >
                      {createRedemption.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirmar
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Admin Actions - Discreto */}
      {isAdmin && (
        <div className="flex justify-end">
          <Dialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1.5 text-xs">
                <Trash2 className="h-3.5 w-3.5" />
                Remover comprador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remover Comprador</DialogTitle>
                <DialogDescription>
                  Esta ação irá ocultar o comprador das listagens. Os dados serão preservados para auditoria.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Motivo da remoção *</Label>
                  <Select value={motivoRemocao} onValueChange={setMotivoRemocao}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o motivo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Duplicado">Duplicado</SelectItem>
                      <SelectItem value="Erro de importação">Erro de importação</SelectItem>
                      <SelectItem value="Cancelamento">Cancelamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRemoveOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={removeBuyer.isPending || !motivoRemocao}
                >
                  {removeBuyer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar Remoção
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Redemption History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Resgates</CardTitle>
          <CardDescription>Todos os resgates registrados para este comprador</CardDescription>
        </CardHeader>
        <CardContent>
          {redemptionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : redemptions && redemptions.length > 0 ? (
            <div className="space-y-3">
              {redemptions.map((redemption) => (
                <div
                  key={redemption.id}
                  className={`p-4 rounded-lg border ${
                    redemption.desfeito ? 'bg-muted/50 opacity-60' : 'bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {redemption.quantidade} ingresso{redemption.quantidade > 1 ? 's' : ''}
                        </span>
                        {redemption.desfeito && (
                          <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                            Desfeito
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(redemption.created_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        {redemption.resgatado_por_comprador
                          ? 'Retirado pelo comprador'
                          : `Retirado por ${redemption.nome_retirada}`}
                      </div>
                      {redemption.operador_nome && (
                        <p className="text-xs text-muted-foreground">
                          Operador: {redemption.operador_nome}
                        </p>
                      )}
                      {redemption.observacao && (
                        <p className="text-sm mt-2 italic">{redemption.observacao}</p>
                      )}
                      {redemption.desfeito && redemption.justificativa_desfazer && (
                        <p className="text-sm text-destructive mt-2">
                          Motivo: {redemption.justificativa_desfazer}
                        </p>
                      )}
                    </div>

                    {isAdmin && !redemption.desfeito && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => openUndoDialog(redemption.id)}
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Ticket className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum resgate registrado ainda</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Undo Dialog */}
      <Dialog open={isUndoOpen} onOpenChange={setIsUndoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desfazer Resgate</DialogTitle>
            <DialogDescription>
              Esta ação irá desfazer o resgate. Por favor, informe o motivo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="justificativa">Justificativa *</Label>
              <Textarea
                id="justificativa"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Motivo para desfazer o resgate..."
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUndoOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleUndo}
              disabled={undoRedemption.isPending || !justificativa.trim()}
            >
              {undoRedemption.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Desfazer Resgate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
