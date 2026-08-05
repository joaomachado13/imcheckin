import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useEvents } from '@/hooks/useEvents';
import { useSearchBuyers } from '@/hooks/useBuyers';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { Search as SearchIcon, Loader2, Users, Ticket } from 'lucide-react';

export default function Search() {
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: events, isLoading: eventsLoading } = useEvents();
  const { data: results, isLoading: searchLoading, isFetching } = useSearchBuyers(
    selectedEvent,
    debouncedSearch
  );

  // Proper debounce with cleanup
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold">Buscar Comprador</h1>
        <p className="text-muted-foreground">
          Pesquise por nome ou telefone para encontrar compradores
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Evento</label>
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um evento..." />
              </SelectTrigger>
              <SelectContent>
                {eventsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  events?.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Buscar</label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nome ou telefone..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
                disabled={!selectedEvent}
              />
              {isFetching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {selectedEvent && debouncedSearch.trim().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados</CardTitle>
            <CardDescription>
              {results?.length || 0} comprador{results?.length !== 1 ? 'es' : ''} encontrado
              {results?.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {searchLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : results && results.length > 0 ? (
              <div className="space-y-3">
                {results.map((buyer) => (
                  <Link
                    key={buyer.id}
                    to={`/buyer/${buyer.id}`}
                    className="block p-4 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{buyer.nome}</h3>
                        {buyer.contato && (
                          <p className="text-sm text-muted-foreground">{buyer.contato}</p>
                        )}
                      </div>
                      <StatusBadge status={buyer.status} />
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Ticket className="h-3.5 w-3.5" />
                        {buyer.ingressos_resgatados}/{buyer.num_ingressos}
                      </span>
                      {buyer.entrega && <span>{buyer.entrega}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum comprador encontrado</p>
                <p className="text-sm">Tente buscar com outros termos</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!selectedEvent && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <SearchIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-display text-lg font-semibold mb-1">Selecione um evento</h3>
            <p className="text-muted-foreground text-sm">
              Escolha um evento acima para começar a buscar compradores
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
