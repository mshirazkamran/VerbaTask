import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import {
  Search,
  Wallet,
  User,
  Plus,
  Pencil,
  Trash2,
  Phone,
  AlertTriangle,
  Receipt,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ReportDropdown } from '../components/ReportDropdown';
import {
  useCustomers,
  useSettleBalance,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from '../hooks/useCustomers';
import { useUiStore } from '../lib/store';
import { formatPKR } from '../lib/format';

export function CustomersPage() {
  const language = useUiStore((s) => s.language);
  const isUrdu = language === 'ur';

  const { data: customers, isLoading, error } = useCustomers();
  const settleMutation = useSettleBalance();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const [search, setSearch] = useState('');

  // Add Customer modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', phone: '', balance: '' });

  // Edit Customer modal state
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', balance: '' });

  // Delete Customer modal state
  const [deletingCustomer, setDeletingCustomer] = useState(null);

  // Settle Payment modal state
  const [settlingCustomer, setSettlingCustomer] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');

  // Handlers for Add Customer
  const handleOpenAdd = () => {
    setAddForm({ name: '', phone: '', balance: '' });
    setIsAddOpen(true);
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    const trimmedName = addForm.name.trim();
    if (!trimmedName) {
      toast.error(isUrdu ? 'گاہک کا نام درج کریں' : 'Please enter customer name');
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: trimmedName,
        phone: addForm.phone.trim() || undefined,
        balance: addForm.balance ? Math.max(0, Number(addForm.balance)) : 0,
      });
      toast.success(
        isUrdu ? `گاہک "${trimmedName}" کھاتہ میں شامل ہو گیا!` : `Customer "${trimmedName}" added successfully!`
      );
      setIsAddOpen(false);
      setAddForm({ name: '', phone: '', balance: '' });
    } catch (err) {
      console.error('Create customer error:', err);
      toast.error(err.message || 'Failed to add customer');
    }
  };

  // Handlers for Edit Customer
  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    setEditForm({
      name: customer.name || '',
      phone: customer.phone || '',
      balance: customer.balance !== undefined ? String(customer.balance) : '0',
    });
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    const trimmedName = editForm.name.trim();
    if (!trimmedName) {
      toast.error(isUrdu ? 'گاہک کا نام خالی نہیں ہو سکتا' : 'Customer name cannot be empty');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: editingCustomer._id,
        name: trimmedName,
        phone: editForm.phone.trim() || undefined,
        balance: editForm.balance !== '' ? Math.max(0, Number(editForm.balance)) : 0,
      });
      toast.success(
        isUrdu ? `گاہک "${trimmedName}" کا ریکارڈ اپڈیٹ ہو گیا!` : `Customer "${trimmedName}" updated successfully!`
      );
      setEditingCustomer(null);
    } catch (err) {
      console.error('Update customer error:', err);
      toast.error(err.message || 'Failed to update customer');
    }
  };

  // Handlers for Delete Customer
  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;
    try {
      await deleteMutation.mutateAsync(deletingCustomer._id);
      toast.success(
        isUrdu
          ? `گاہک "${deletingCustomer.name}" کھاتہ سے حذف کر دیا گیا`
          : `Customer "${deletingCustomer.name}" deleted from ledger`
      );
      setDeletingCustomer(null);
    } catch (err) {
      console.error('Delete customer error:', err);
      toast.error(err.message || 'Failed to delete customer');
    }
  };

  // Handlers for Settle Payment
  const handleOpenSettle = (customer) => {
    setSettlingCustomer(customer);
    setSettleAmount(customer.balance ? String(customer.balance) : '');
  };

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    if (!settleAmount || Number(settleAmount) <= 0) {
      toast.error(isUrdu ? 'درست رقم درج کریں' : 'Please enter a valid amount');
      return;
    }
    if (Number(settleAmount) > settlingCustomer.balance) {
      toast.error(
        isUrdu
          ? 'رقم کل ادھار سے زیادہ نہیں ہو سکتی'
          : 'Amount cannot be greater than outstanding balance'
      );
      return;
    }

    try {
      await settleMutation.mutateAsync({
        customerId: settlingCustomer._id,
        amount: settleAmount,
      });
      toast.success(
        isUrdu
          ? `رقم ${formatPKR(Number(settleAmount))} وصول کر لی گئی!`
          : `Payment of ${formatPKR(Number(settleAmount))} settled successfully!`
      );
      setSettlingCustomer(null);
      setSettleAmount('');
    } catch (err) {
      console.error('Settle balance error:', err);
      toast.error(err.message || 'Failed to settle balance');
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: isUrdu ? 'گاہک کا نام' : 'Customer',
        cell: ({ getValue }) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <span className="font-medium text-ink capitalize">{getValue()}</span>
          </div>
        ),
      },
      {
        accessorKey: 'phone',
        header: isUrdu ? 'فون نمبر' : 'Phone',
        cell: ({ getValue }) => {
          const val = getValue();
          return val ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-tabular text-ink-secondary">
              <Phone className="w-3.5 h-3.5 text-muted" />
              <span>{val}</span>
            </span>
          ) : (
            <span className="text-muted text-xs">—</span>
          );
        },
      },
      {
        accessorKey: 'balance',
        header: isUrdu ? 'بقایا ادھار (Udhaar)' : 'Outstanding Balance (Udhaar)',
        cell: ({ getValue }) => {
          const bal = getValue() || 0;
          return (
            <span
              className={`font-tabular font-semibold text-sm ${
                bal > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {formatPKR(bal)}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: isUrdu ? 'کارروائی' : 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={!row.original.balance || row.original.balance <= 0}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenSettle(row.original);
              }}
              title={isUrdu ? 'رقم وصول کریں' : 'Settle payment'}
            >
              <Receipt className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              <span>{isUrdu ? 'وصولی' : 'Settle'}</span>
            </Button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEdit(row.original);
              }}
              title={isUrdu ? 'ترمیم کریں' : 'Edit customer'}
              className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-paper-2 transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeletingCustomer(row.original);
              }}
              title={isUrdu ? 'حذف کریں' : 'Delete customer'}
              className="p-1.5 rounded-md text-muted hover:text-coral hover:bg-coral/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
    [isUrdu]
  );

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!search) return customers;
    const q = search.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q))
    );
  }, [customers, search]);

  const table = useReactTable({
    data: filteredCustomers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const totalUdhaar = useMemo(() => {
    return (customers || []).reduce((sum, c) => sum + (c.balance || 0), 0);
  }, [customers]);

  if (error) {
    return (
      <Card padding="lg" className="text-center">
        <p className="text-coral">Failed to load customer ledger</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold text-ink ${isUrdu ? 'font-urdu text-3xl' : ''}`}>
            {isUrdu ? 'ادھار کھاتہ (Ledger & Khata)' : 'Ledger & Khata'}
          </h1>
          <p className="text-sm text-ink-mute mt-1">
            {isUrdu
              ? 'گاہکوں کے ادھار، کھاتہ، وصولیاں اور مکمل ریکارڈ سنبھالیں'
              : 'Manage customer credit, ledger entries, and outstanding balances'}
          </p>
        </div>

        {/* Total Udhaar Card */}
        <Card
          padding="sm"
          className="bg-canvas-soft min-w-[220px] border-amber-200 dark:border-amber-900/50 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 uppercase tracking-wider font-semibold">
                {isUrdu ? 'مارکیٹ کا کل ادھار' : 'Total Market Udhaar'}
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-tabular mt-0.5">
                {formatPKR(totalUdhaar)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Action Bar: Search, Add Customer, Reports */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-ink-mute absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={isUrdu ? 'گاہک یا فون نمبر تلاش کریں...' : 'Search customers by name or phone...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-canvas border border-hairline rounded-lg pl-9 pr-3 text-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-10 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <ReportDropdown />

          <Button
            onClick={handleOpenAdd}
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            className="whitespace-nowrap"
          >
            <span>{isUrdu ? '+ نیا گاہک' : '+ Add Customer'}</span>
          </Button>
        </div>
      </div>

      {/* Main Table or Loading / Empty */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton variant="tableRow" />
          <Skeleton variant="tableRow" />
          <Skeleton variant="tableRow" />
        </div>
      ) : filteredCustomers.length === 0 && !search ? (
        <Card padding="lg">
          <EmptyState
            icon={<Wallet className="w-8 h-8 text-muted" />}
            title={isUrdu ? 'کوئی ادھار کھاتہ موجود نہیں' : 'No ledger entries yet'}
            description={
              isUrdu
                ? 'نیا گاہک شامل کرنے کے لیے اوپر دیے گئے بٹن پر کلک کریں، یا واٹس ایپ پر "3 چاول حمزہ کو ادھار" بولیں۔'
                : 'Add a customer directly above, or send a voice message on WhatsApp like "3 chawal hamza ko udhaar".'
            }
            action={
              <Button onClick={handleOpenAdd} variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                {isUrdu ? 'پہلا گاہک شامل کریں' : 'Add First Customer'}
              </Button>
            }
          />
        </Card>
      ) : (
        <Table table={table} emptyText={isUrdu ? 'کوئی گاہک نہیں ملا' : 'No customers found'} />
      )}

      {/* 1. ADD CUSTOMER MODAL */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={isUrdu ? 'نیا گاہک شامل کریں' : 'Add New Customer'}
        description={
          isUrdu
            ? 'کھاتہ کے لیے گاہک کا نام اور ابتدائی بقایا ادھار درج کریں'
            : 'Enter customer name and optional starting udhaar balance'
        }
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <Input
            label={isUrdu ? 'گاہک کا نام' : 'Customer Name'}
            placeholder={isUrdu ? 'مثلاً: حمزہ' : 'e.g. Hamza'}
            value={addForm.name}
            onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            required
            autoFocus
          />

          <Input
            label={isUrdu ? 'فون نمبر (اختیاری)' : 'Phone Number (Optional)'}
            placeholder="03001234567"
            type="tel"
            value={addForm.phone}
            onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
            helperText={isUrdu ? 'گاہک کو ایس ایم ایس یا واٹس ایپ کے لیے' : 'For customer communication and alerts'}
          />

          <Input
            label={isUrdu ? 'ابتدائی ادھار (روپے)' : 'Starting Balance / Udhaar (Rs)'}
            placeholder="0"
            type="number"
            min="0"
            value={addForm.balance}
            onChange={(e) => setAddForm({ ...addForm, balance: e.target.value })}
            helperText={
              isUrdu
                ? 'اگر پہلے سے کوئی ادھار واجب الادا ہے تو یہاں رقم لکھیں'
                : 'Enter existing credit if any. Defaults to 0.'
            }
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>
              {isUrdu ? 'منسوخ' : 'Cancel'}
            </Button>
            <Button type="submit" loading={createMutation.isPending} variant="primary">
              {isUrdu ? 'کھاتہ شامل کریں' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. EDIT CUSTOMER MODAL */}
      {editingCustomer && (
        <Modal
          isOpen={!!editingCustomer}
          onClose={() => setEditingCustomer(null)}
          title={isUrdu ? 'گاہک کا ریکارڈ تبدیل کریں' : 'Edit Customer'}
          description={
            isUrdu
              ? `"${editingCustomer.name}" کے کوائف یا ادھار کی رقم میں تبدیلی کریں`
              : `Update details or adjust balance for ${editingCustomer.name}`
          }
        >
          <form onSubmit={handleUpdateCustomer} className="space-y-4">
            <Input
              label={isUrdu ? 'گاہک کا نام' : 'Customer Name'}
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
              autoFocus
            />

            <Input
              label={isUrdu ? 'فون نمبر' : 'Phone Number'}
              placeholder="03001234567"
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />

            <Input
              label={isUrdu ? 'بقایا ادھار (روپے)' : 'Outstanding Balance (Rs)'}
              type="number"
              min="0"
              value={editForm.balance}
              onChange={(e) => setEditForm({ ...editForm, balance: e.target.value })}
              required
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setEditingCustomer(null)}>
                {isUrdu ? 'منسوخ' : 'Cancel'}
              </Button>
              <Button type="submit" loading={updateMutation.isPending} variant="primary">
                {isUrdu ? 'محفوظ کریں' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 3. DELETE CUSTOMER MODAL */}
      {deletingCustomer && (
        <Modal
          isOpen={!!deletingCustomer}
          onClose={() => setDeletingCustomer(null)}
          title={isUrdu ? 'گاہک حذف کریں؟' : 'Delete Customer?'}
          description={
            isUrdu
              ? `کیا آپ واقعی "${deletingCustomer.name}" کو کھاتہ سے حذف کرنا چاہتے ہیں؟`
              : `Are you sure you want to remove ${deletingCustomer.name} from the ledger?`
          }
        >
          <div className="space-y-4">
            {deletingCustomer.balance > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                <div className="text-xs">
                  <p className="font-semibold">
                    {isUrdu ? 'تنبیہ: بقایا رقم موجود ہے!' : 'Warning: Outstanding Balance Exists!'}
                  </p>
                  <p className="mt-0.5">
                    {isUrdu
                      ? `اس گاہک پر ${formatPKR(deletingCustomer.balance)} واجب الادا ہیں۔ حذف کرنے سے یہ کھاتہ ختم ہو جائے گا۔`
                      : `This customer has an unpaid balance of ${formatPKR(deletingCustomer.balance)}. Deleting them will remove their ledger history.`}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setDeletingCustomer(null)}>
                {isUrdu ? 'منسوخ' : 'Cancel'}
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={deleteMutation.isPending}
                onClick={handleDeleteCustomer}
              >
                {isUrdu ? 'ہاں، حذف کریں' : 'Delete Customer'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 4. SETTLE PAYMENT MODAL */}
      {settlingCustomer && (
        <Modal
          isOpen={!!settlingCustomer}
          onClose={() => setSettlingCustomer(null)}
          title={isUrdu ? 'ادھار وصولی (Settle Payment)' : 'Settle Payment'}
          description={
            isUrdu
              ? `گاہک "${settlingCustomer.name}" سے موصول ہونے والی رقم درج کریں`
              : `Record a received payment from ${settlingCustomer.name}`
          }
        >
          <form onSubmit={handleSettleSubmit} className="space-y-4">
            <Card padding="sm" className="bg-canvas-soft flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-ink-secondary">
                {isUrdu ? 'موجودہ کل ادھار' : 'Current Balance'}
              </span>
              <span className="font-tabular font-bold text-amber-600 dark:text-amber-400 text-base">
                {formatPKR(settlingCustomer.balance)}
              </span>
            </Card>

            <Input
              label={isUrdu ? 'وصول شدہ رقم (روپے)' : 'Amount Received (Rs)'}
              type="number"
              min="1"
              max={settlingCustomer.balance}
              value={settleAmount}
              onChange={(e) => setSettleAmount(e.target.value)}
              placeholder="e.g. 500"
              required
              autoFocus
            />

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setSettleAmount(String(settlingCustomer.balance))}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {isUrdu ? 'مکمل ادھار وصول (Full Balance)' : 'Set Full Amount'}
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setSettlingCustomer(null)}>
                {isUrdu ? 'منسوخ' : 'Cancel'}
              </Button>
              <Button type="submit" loading={settleMutation.isPending} variant="primary">
                {isUrdu ? 'وصولی درج کریں' : 'Settle Balance'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default CustomersPage;

