import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Users, Check, X, Shield, UserCheck, Clock, Loader2, Trash2, UserX } from 'lucide-react';
import type { AppRole, Profile } from '@/types/database';

interface UserWithRole extends Profile {
  role?: AppRole;
}

export default function UserManagement() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users-management'],
    queryFn: async () => {
      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Merge roles into profiles
      return (profiles as Profile[]).map((profile) => ({
        ...profile,
        role: roles.find((r) => r.user_id === profile.user_id)?.role as AppRole | undefined,
      })) as UserWithRole[];
    },
    enabled: isAdmin,
  });

  const updateApprovalMutation = useMutation({
    mutationFn: async ({
      userId,
      status,
    }: {
      userId: string;
      status: 'approved' | 'rejected';
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ approval_status: status })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users-management'] });
      toast.success(
        variables.status === 'approved'
          ? 'Usuário aprovado com sucesso!'
          : 'Usuário rejeitado.'
      );
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: AppRole;
    }) => {
      // Check if role exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-management'] });
      toast.success('Papel atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar papel: ' + error.message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // First delete the role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) throw roleError;

      // Then delete the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-management'] });
      toast.success('Usuário removido com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover usuário: ' + error.message);
    },
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Acesso negado. Apenas administradores.</p>
      </div>
    );
  }

  const pendingUsers = users?.filter((u) => u.approval_status === 'pending') || [];
  const approvedUsers = users?.filter((u) => u.approval_status === 'approved') || [];
  const rejectedUsers = users?.filter((u) => u.approval_status === 'rejected') || [];

  const getRoleBadge = (role?: AppRole) => {
    if (role === 'admin') {
      return <Badge variant="default" className="gap-1"><Shield className="h-3 w-3" />Admin</Badge>;
    }
    return <Badge variant="outline">Operador</Badge>;
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Gerenciar Usuários
        </h1>
        <p className="text-muted-foreground mt-1">
          Aprove novos usuários e gerencie permissões
        </p>
      </div>

      {/* Pending Users */}
      {pendingUsers.length > 0 && (
        <Card className="border-pending/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-pending" />
              Aguardando Aprovação
              <Badge variant="secondary">{pendingUsers.length}</Badge>
            </CardTitle>
            <CardDescription>
              Usuários que solicitaram acesso ao sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || 'Sem nome'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Select
                        defaultValue={user.role || 'operador'}
                        onValueChange={(value) =>
                          updateRoleMutation.mutate({
                            userId: user.user_id,
                            role: value as AppRole,
                          })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operador">Operador</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-success border-success/30 hover:bg-success/10"
                          onClick={() =>
                            updateApprovalMutation.mutate({
                              userId: user.user_id,
                              status: 'approved',
                            })
                          }
                          disabled={updateApprovalMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() =>
                            updateApprovalMutation.mutate({
                              userId: user.user_id,
                              status: 'rejected',
                            })
                          }
                          disabled={updateApprovalMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Ativos ({approvedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="removed" className="gap-2">
            <UserX className="h-4 w-4" />
            Rejeitados ({rejectedUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCheck className="h-5 w-5 text-success" />
                Usuários Ativos
              </CardTitle>
              <CardDescription>
                Usuários com acesso ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : approvedUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum usuário aprovado</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Desde</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name || 'Sem nome'}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Select
                              defaultValue={user.role || 'operador'}
                              onValueChange={(value) =>
                                updateRoleMutation.mutate({
                                  userId: user.user_id,
                                  role: value as AppRole,
                                })
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="operador">Operador</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover <strong>{user.full_name || 'este usuário'}</strong>? 
                                    Esta ação não pode ser desfeita e o usuário perderá todo o acesso ao sistema.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteUserMutation.mutate(user.user_id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="removed">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserX className="h-5 w-5 text-destructive" />
                Usuários Rejeitados
              </CardTitle>
              <CardDescription>
                Usuários que foram rejeitados ou removidos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rejectedUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum usuário rejeitado</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejectedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name || 'Sem nome'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-success border-success/30 hover:bg-success/10"
                              onClick={() =>
                                updateApprovalMutation.mutate({
                                  userId: user.user_id,
                                  status: 'approved',
                                })
                              }
                              disabled={updateApprovalMutation.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Reativar
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Excluir
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir permanentemente <strong>{user.full_name || 'este usuário'}</strong>? 
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteUserMutation.mutate(user.user_id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
