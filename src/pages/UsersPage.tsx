import React, { useState, useEffect } from 'react';
import { Users, Plus, ChevronLeft, Shield, Mail, Trash2, Save } from 'lucide-react';
import { authService } from '../api/services';
import { PageHeader } from '../components/ui/PageHeader';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import { getErrorMessage } from '../api/errorUtils';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { type User } from '../types';

export const UsersPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  const { toast, showToast, hideToast } = useToast();
  const { isOpen: isDelOpen, data: delData, ask: askDelete, confirm: confirmDelete, cancel: cancelDelete } = useConfirm<number>();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE'
  });

  const loadUsers = async () => {
    try {
      const response = await authService.getUsers();
      if (response.data.success) {
        setUsers(response.data.data || []);
        setTotalItems(response.data.pagination?.total || response.data.data?.length || 0);
      }
    } catch (err) {
      console.error('Error loading users', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await authService.getUsers();
        if (mounted && response.data.success) {
          setUsers(response.data.data || []);
          setTotalItems(response.data.pagination?.total || response.data.data?.length || 0);
        }
      } catch (err) {
        console.error('Error loading users', err);
      } finally {
        if (mounted) setFetching(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!delData) return;
    setLoading(true);
    try {
      const response = await authService.deleteUser(delData);
      if (response.data.success) {
        loadUsers();
        showToast('Usuario eliminado');
        confirmDelete();
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Error al eliminar usuario.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = editingId 
        ? await authService.updateUser(editingId, { name: formData.name, role: formData.role as 'ADMIN' | 'EMPLOYEE' })
        : await authService.register(formData);

      if (response.data.success) {
        loadUsers();
        setEditingId(null);
        setShowForm(false);
        setFormData({ name: '', email: '', password: '', role: 'EMPLOYEE' });
        showToast(editingId ? 'Usuario actualizado' : 'Usuario creado con éxito');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Error al guardar usuario.'));
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { 
      header: 'Usuario', 
      render: (u: User) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
          <p className="text-xs text-slate-500">{u.email}</p>
        </div>
      )
    },
    { 
      header: 'Rol', 
      render: (u: User) => (
        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
          u.role === 'ADMIN' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {u.role}
        </span>
      )
    },
    {
      header: 'Acciones',
      className: 'w-20',
      render: (u: User) => (
        <Button variant="ghost" size="sm" icon={Trash2} iconClassName="text-rose-600" onClick={() => askDelete(u.id)} title="Eliminar" />
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Toast */}
      <Toast 
        message={toast.message} 
        isVisible={toast.isVisible} 
        onClose={hideToast} 
        type={toast.type} 
      />

      {/* Delete Modal */}
      <Modal
        isOpen={isDelOpen}
        onClose={cancelDelete}
        onConfirm={handleDelete}
        title="Eliminar Usuario"
        description="¿Estás seguro de que deseas eliminar este acceso al sistema? El usuario no podrá volver a ingresar."
        type="danger"
        confirmText="Eliminar Usuario"
        isLoading={loading}
      />

      <div className="flex flex-col gap-4 mb-8">
        <PageHeader 
          title={showForm ? (editingId ? "Editar Personal" : "Registrar Personal") : "Gestión de Personal"}
          description={showForm ? "Modifica los datos de acceso." : "Administración de usuarios y roles del sistema. Haz clic en una fila para editar."}
        />
        <Button 
          variant={showForm ? "outline" : "primary"}
          onClick={() => {
            if (showForm) {
              setEditingId(null);
              setFormData({ name: '', email: '', password: '', role: 'EMPLOYEE' });
            }
            setShowForm(!showForm);
          }}
          icon={showForm ? ChevronLeft : Plus}
          className="w-full md:w-fit px-8"
        >
          {showForm ? "Volver al Listado" : "Nuevo Usuario"}
        </Button>
      </div>

      <ErrorMessage message={error} className="mb-8" />

      {showForm ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 md:p-8 pb-8 md:pb-10 border border-slate-200 dark:border-zinc-800 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <Input 
                label="Nombre Completo"
                placeholder="Ej: Juan Pérez"
                icon={Users}
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
              <Input 
                label="Correo Electrónico"
                type="email"
                placeholder="juan@empresa.com"
                icon={Mail}
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                disabled={!!editingId}
              />
              {!editingId && (
                <Input 
                  label="Contraseña"
                  type="password"
                  placeholder="••••••••"
                  icon={Shield}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required={!editingId}
                  autoComplete="new-password"
                />
              )}
              <Select 
                label="Rol de Usuario"
                icon={Shield}
                options={[
                  { value: 'EMPLOYEE', label: 'Empleado (Solo carga)' },
                  { value: 'ADMIN', label: 'Administrador (Todo)' }
                ]}
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                required
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" className="w-full md:w-72" isLoading={loading} icon={Save}>
                {editingId ? 'Guardar Cambios' : 'Crear Cuenta'}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <Table 
          columns={columns} 
          data={users} 
          isLoading={fetching} 
          onRowClick={handleEdit} 
          pagination={{
            page,
            total: totalItems,
            onPageChange: (newPage) => {
              setPage(newPage);
              setTimeout(loadUsers, 0);
            }
          }}
        />
      )}
    </div>
  );
};
