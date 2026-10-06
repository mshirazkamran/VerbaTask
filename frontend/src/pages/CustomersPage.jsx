import { useMemo, useState } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel } from '@tanstack/react-table';
import { Search, Wallet, User, History } from 'lucide-react';
import { toast } from 'sonner';

import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useCustomers, useSettleBalance } from '../hooks/useCustomers';
import { formatPKR } from '../lib/format';

export function CustomersPage() {
  const { data: customers, isLoading, error } = useCustomers();
  const settleMutation = useSettleBalance();
  
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');

  const handleSettle = async (e) => {
    e.preventDefault();
    if (!settleAmount || Number(settleAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (Number(settleAmount) > selectedCustomer.balance) {
      toast.error('Amount cannot be greater than outstanding balance');
      return;
    }

    try {
      await settleMutation.mutateAsync({ customerId: selectedCustomer._id, amount: settleAmount });
      toast.success('Balance settled successfully');
      setSelectedCustomer(null);
      setSettleAmount('');
    } catch (err) {
      toast.error(err.message || 'Failed to settle balance');
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Customer',
        cell: ({ getValue }) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <span className="font-medium text-ink capitalize">{getValue()}</span>
          </div>
        ),
      },
      {
        accessorKey: 'balance',
        header: 'Outstanding Balance (Udhaar)',
        cell: ({ getValue }) => (
          <span className={`font-tabular font-medium ${getValue() > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {formatPKR(getValue())}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              disabled={row.original.balance <= 0}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCustomer(row.original);
                setSettleAmount(row.original.balance);
              }}
            >
              Settle
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!search) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [customers, search]);

  const table = useReactTable({
    data: filteredCustomers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const totalUdhaar = useMemo(() => {
    return (customers || []).reduce((sum, c) => sum + c.balance, 0);
  }, [customers]);

  if (error) {
    return (
      <Card padding="lg" className="text-center">
        <p className="text-red-500">Failed to load customers</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Ledger & Khata</h1>
          <p className="text-sm text-ink-mute mt-1">Manage customer credit and outstanding balances</p>
        </div>
        <Card padding="sm" className="bg-canvas-soft min-w-[200px] border-amber-200 dark:border-amber-900/50">
          <p className="text-[11px] text-amber-700 dark:text-amber-500 uppercase tracking-wider font-semibold">Total Market Udhaar</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-500 font-tabular">{formatPKR(totalUdhaar)}</p>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-ink-mute absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-canvas border border-hairline rounded-lg pl-9 pr-3 text-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-10 transition-colors"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton variant="tableRow" />
          <Skeleton variant="tableRow" />
          <Skeleton variant="tableRow" />
        </div>
      ) : filteredCustomers.length === 0 && !search ? (
        <Card padding="lg">
          <EmptyState
            icon={<Wallet className="w-6 h-6" />}
            title="No ledger entries yet"
            description="When you log an order with 'Udhaar', the customer and their balance will appear here."
          />
        </Card>
      ) : (
        <Table table={table} emptyText="No customers found" />
      )}

      {selectedCustomer && (
        <Modal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title="Settle Payment"
          description={`Record a received payment for ${selectedCustomer.name}`}
        >
          <form onSubmit={handleSettle} className="space-y-4">
            <Card padding="sm" className="bg-canvas-soft flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-ink-secondary">Current Balance</span>
              <span className="font-tabular font-bold text-amber-600">{formatPKR(selectedCustomer.balance)}</span>
            </Card>
            
            <Input
              label="Amount Received (Rs)"
              type="number"
              min="1"
              max={selectedCustomer.balance}
              value={settleAmount}
              onChange={(e) => setSettleAmount(e.target.value)}
              placeholder="e.g. 500"
              required
              autoFocus
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setSelectedCustomer(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={settleMutation.isPending}>
                Settle Balance
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
