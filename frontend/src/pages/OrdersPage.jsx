import { useMemo, useState } from 'react';
import {
 useReactTable,
 getCoreRowModel,
 getSortedRowModel,
 getFilteredRowModel,
} from '@tanstack/react-table';
import {
  Search,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Receipt,
  RotateCcw,
  ArrowLeftRight,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useOrders, useCreateOrder, useReturnOrder, useExchangeOrder } from '../hooks/useOrders';
import { useInventory } from '../hooks/useInventory';
import { useUiStore } from '../lib/store';
import { getTranslations } from '../lib/translations';
import { formatPKR, formatDate, formatQuantity } from '../lib/format';

const PAYMENT_METHODS = ['cash', 'easypaisa', 'jazzcash', 'bank'];

const PAYMENT_DOTS = {
  cash: 'bg-primary',
  easypaisa: 'bg-pear-deep',
  jazzcash: 'bg-coral',
  bank: 'bg-sky',
};

function NewOrderModal({ isOpen, onClose }) {
  const language = useUiStore((s) => s.language);
  const isUrdu = language === 'ur';
  const t = getTranslations(language).ordersPage;
  const tDash = getTranslations(language).dashboard;

  const { data: inventory } = useInventory();
  const createOrder = useCreateOrder();

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [items, setItems] = useState([
    { inventoryItemId: '', name: '', quantity: 1, price: 0 },
  ]);

 const inventoryMap = useMemo(() => {
 const map = new Map();
 (inventory || []).forEach((item) => map.set(item._id, item));
 return map;
 }, [inventory]);

 const updateItem = (idx, updates) => {
 setItems((prev) => {
 const next = [...prev];
 next[idx] = { ...next[idx], ...updates };
 return next;
 });
 };

 const handleSelectItem = (idx, inventoryItemId) => {
 const item = inventoryMap.get(inventoryItemId);
 updateItem(idx, {
 inventoryItemId,
 name: item?.name || '',
 price: item?.price || 0,
 });
 };

 const addLine = () => {
 setItems((prev) => [...prev, { inventoryItemId: '', name: '', quantity: 1, price: 0 }]);
 };

 const removeLine = (idx) => {
 setItems((prev) => prev.filter((_, i) => i !== idx));
 };

 const total = items.reduce((sum, i) => sum + (i.price || 0) * (Number(i.quantity) || 0), 0);

 const handleSubmit = async (e) => {
 e.preventDefault();
 const validItems = items.filter((i) => i.inventoryItemId && Number(i.quantity) > 0);
 if (!validItems.length) {
 toast.error(isUrdu ? 'کم از کم ایک چیز شامل کریں' : 'Add at least one item');
 return;
 }

 // Group requested quantities by inventoryItemId to prevent overdraft across multiple rows
 const requestedTotals = new Map();
 for (const i of validItems) {
   const current = requestedTotals.get(i.inventoryItemId) || 0;
   requestedTotals.set(i.inventoryItemId, current + Number(i.quantity));
 }

 for (const [id, reqQty] of requestedTotals) {
   const invItem = inventoryMap.get(id);
   const available = invItem ? Math.max(0, Number(invItem.quantity) || 0) : 0;
   if (available < reqQty) {
     toast.error(
       isUrdu
         ? `اسٹاک ناکافی ہے: ${invItem?.name || 'آئٹم'} (دستیاب: ${available})`
         : `Insufficient stock for ${invItem?.name || 'Item'} (Available: ${available})`
     );
     return;
   }
 }

 try {
 await createOrder.mutateAsync({
 items: validItems.map((i) => ({
 inventoryItemId: i.inventoryItemId,
 name: i.name,
 quantity: Number(i.quantity),
 price: i.price,
 })),
 total,
 paymentMethod,
 source: 'dashboard',
 });
 toast.success(isUrdu ? 'نیا آرڈر کامیابی سے درج ہو گیا' : 'Order created');
 setItems([{ inventoryItemId: '', name: '', quantity: 1, price: 0 }]);
 setPaymentMethod('cash');
 onClose();
 } catch (err) {
 toast.error(err.message || (isUrdu ? 'آرڈر درج کرنے میں ناکامی' : 'Failed to create order'));
 }
 };

 return (
 <Modal
 isOpen={isOpen}
 onClose={onClose}
 title={t.createOrderModalTitle}
 description={t.createOrderModalDesc}
 maxWidth="max-w-xl"
 >
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
 {items.map((item, idx) => {
 const selectedItem = item.inventoryItemId ? inventoryMap.get(item.inventoryItemId) : null;
 const availableStock = selectedItem ? Math.max(0, Number(selectedItem.quantity) || 0) : null;
 const isOverStock = availableStock != null && Number(item.quantity) > availableStock;

 return (
 <div key={idx} className="flex flex-col sm:flex-row sm:items-start gap-2 p-2.5 sm:p-0 rounded-md bg-paper-2 sm:bg-transparent border border-rule sm:border-0">
 <div className="flex-1">
 <select
 value={item.inventoryItemId}
 onChange={(e) => handleSelectItem(idx, e.target.value)}
 className="w-full h-10 px-3 text-[15px] bg-canvas text-ink border border-hairline-input rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
 required
 >
 <option value="" disabled>
 {t.selectItem}
 </option>
 {(inventory || []).map((inv) => {
   const isOutOfStock = (inv.quantity ?? 0) <= 0;
   return (
     <option key={inv._id} value={inv._id} disabled={isOutOfStock}>
       {inv.name} ({isOutOfStock ? (isUrdu ? '⚠️ اسٹاک ختم' : '⚠️ Out of stock') : `${formatQuantity(inv.quantity, inv.unit)} @ ${formatPKR(inv.price)}`})
     </option>
   );
 })}
 </select>
 {selectedItem && (
   <div className={`text-[11px] mt-1 font-mono ${isOverStock ? 'text-red-500 font-semibold' : 'text-ink-secondary'}`}>
     {isUrdu ? `دستیاب: ${availableStock} ${selectedItem.unit || ''}` : `In stock: ${availableStock} ${selectedItem.unit || ''}`}
     {isOverStock && (isUrdu ? ' (اسٹاک سے زیادہ)' : ' (Exceeds stock)')}
   </div>
 )}
 </div>
 <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
 <div className="flex items-center gap-1.5">
 <span className="text-xs text-ink-muted sm:hidden">{isUrdu ? 'تعداد:' : 'Qty:'}</span>
 <Input
 type="number"
 min="1"
 max={availableStock ?? undefined}
 value={item.quantity}
 onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
 className={`w-20 sm:w-24 ${isOverStock ? 'border-red-500 focus:border-red-500' : ''}`}
 required
 />
 </div>
 <div className="w-24 sm:w-28 pt-0 sm:pt-2 text-sm text-ink font-tabular text-right shrink-0">
 {formatPKR((item.price || 0) * (Number(item.quantity) || 0))}
 </div>
 {items.length > 1 && (
 <Button
 type="button"
 variant="ghost"
 size="sm"
 className="!text-danger-ink hover:!bg-coral-tint !px-2.5 shrink-0"
 aria-label="Remove line"
 onClick={() => removeLine(idx)}
 >
 <Trash2 className="w-4 h-4" />
 </Button>
 )}
 </div>
 </div>
 );
 })}
 </div>

 <Button
 type="button"
 variant="outline"
 size="sm"
 leftIcon={<Plus className="w-4 h-4" />}
 onClick={addLine}
 >
 {t.addItem}
 </Button>

 <div className="grid grid-cols-2 gap-4 pt-2 border-t border-hairline">
 <div className="flex flex-col gap-1.5">
 <label className="text-xs font-medium text-ink-secondary">{t.paymentMethod}</label>
 <select
 value={paymentMethod}
 onChange={(e) => setPaymentMethod(e.target.value)}
 className="h-11 rounded-input border border-rule-2 bg-surface px-3.5 text-[15px] text-ink hover:border-muted focus:border-ink focus:outline-none"
 >
 {PAYMENT_METHODS.map((m) => (
 <option key={m} value={m}>
 {tDash[m] || (m.charAt(0).toUpperCase() + m.slice(1))}
 </option>
 ))}
 </select>
 </div>
 <div className="flex flex-col justify-center rounded-input bg-pear-tint px-4 py-2">
 <p className="label">{t.total}</p>
 <p className="font-mono text-lg font-semibold text-ink">{formatPKR(total)}</p>
 </div>
 </div>

 <div className="flex items-center justify-end gap-3 pt-5 pb-1">
 <Button type="button" variant="ghost" onClick={onClose} disabled={createOrder.isPending}>
 {t.cancel}
 </Button>
 <Button type="submit" loading={createOrder.isPending}>
 {t.createOrderBtn}
 </Button>
 </div>
 </form>
 </Modal>
 );
}

function ReturnExchangeModal({ isOpen, onClose, initialOrder = null }) {
  const language = useUiStore((s) => s.language);
  const isUrdu = language === 'ur';
  const t = getTranslations(language).ordersPage;
  const tDash = getTranslations(language).dashboard;

  const { data: inventory } = useInventory();
  const { data: orders } = useOrders();
  const returnMutation = useReturnOrder();
  const exchangeMutation = useExchangeOrder();

  const [mode, setMode] = useState('return'); // 'return' | 'exchange'
  const [orderSearch, setOrderSearch] = useState('');
  const [targetOrder, setTargetOrder] = useState(initialOrder);
  const [selectedItemIdx, setSelectedItemIdx] = useState(0);
  const [returnQty, setReturnQty] = useState(1);
  const [exchangeItemId, setExchangeItemId] = useState('');
  const [exchangeQty, setExchangeQty] = useState(1);
  const [reason, setReason] = useState('');

  // Sync state when initialOrder changes (React pattern: adjusting state during render)
  const [prevInitialOrder, setPrevInitialOrder] = useState(initialOrder);
  if (initialOrder !== prevInitialOrder) {
    setPrevInitialOrder(initialOrder);
    setTargetOrder(initialOrder);
    setSelectedItemIdx(0);
    setReturnQty(1);
  }

  // Inventory Map for fast item lookup
  const inventoryMap = useMemo(() => {
    const map = new Map();
    (inventory || []).forEach((item) => map.set(item._id, item));
    return map;
  }, [inventory]);

  // If no order selected yet, let them pick from orders or filter by search
  const candidateOrders = useMemo(() => {
    if (!orders) return [];
    const valid = orders.filter((o) => o.status !== 'returned' && o.status !== 'rejected');
    if (!orderSearch.trim()) return valid.slice(0, 10);
    const q = orderSearch.trim().toLowerCase();
    return valid.filter(
      (o) =>
        (o.orderNumber && String(o.orderNumber).toLowerCase().includes(q)) ||
        (o._id && o._id.toLowerCase().includes(q)) ||
        (o.customerName && o.customerName.toLowerCase().includes(q))
    );
  }, [orders, orderSearch]);

  const currentItem = targetOrder?.items?.[selectedItemIdx];
  const maxReturnQty = currentItem?.quantity || 1;
  const returnUnitPrice = currentItem?.price || 0;
  const returnTotalValue = returnUnitPrice * Number(returnQty || 0);

  const replacementItem = inventoryMap.get(exchangeItemId);
  const replacementUnitPrice = replacementItem?.price || 0;
  const replacementTotalValue = replacementUnitPrice * Number(exchangeQty || 0);

  const priceDiff = replacementTotalValue - returnTotalValue;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetOrder) {
      toast.error(isUrdu ? 'پہلے آرڈر منتخب کریں' : 'Please select an order first');
      return;
    }
    if (!currentItem) {
      toast.error(isUrdu ? 'واپسی کے لیے چیز منتخب کریں' : 'Please select an item to return');
      return;
    }

    const numReturn = Number(returnQty);
    if (!numReturn || isNaN(numReturn) || numReturn <= 0) {
      toast.error(isUrdu ? 'واپسی کی درست تعداد درج کریں' : 'Please enter a valid return quantity greater than 0');
      return;
    }

    if (mode === 'exchange') {
      const numExchange = Number(exchangeQty);
      if (!numExchange || isNaN(numExchange) || numExchange <= 0) {
        toast.error(isUrdu ? 'تبادلے کی درست تعداد درج کریں' : 'Please enter a valid replacement quantity greater than 0');
        return;
      }
    }

    try {
      if (mode === 'return') {
        await returnMutation.mutateAsync({
          orderId: targetOrder._id,
          orderNumber: targetOrder.orderNumber,
          returnItem: {
            inventoryItemId: currentItem.inventoryItemId,
            name: currentItem.name,
            quantity: Number(returnQty),
            price: currentItem.price,
          },
          reason: reason.trim() || undefined,
        });
        toast.success(isUrdu ? 'سامان کی واپسی کامیابی سے درج ہو گئی' : 'Item returned successfully');
      } else {
        if (!replacementItem) {
          toast.error(isUrdu ? 'تبادلے کے لیے نئی چیز منتخب کریں' : 'Please select a replacement item');
          return;
        }
        await exchangeMutation.mutateAsync({
          orderId: targetOrder._id,
          orderNumber: targetOrder.orderNumber,
          returnItem: {
            inventoryItemId: currentItem.inventoryItemId,
            name: currentItem.name,
            quantity: Number(returnQty),
            price: currentItem.price,
          },
          newItem: {
            inventoryItemId: replacementItem._id,
            name: replacementItem.name,
            quantity: Number(exchangeQty),
            price: replacementItem.price,
          },
          reason: reason.trim() || undefined,
        });
        toast.success(isUrdu ? 'سامان کا تبادلہ کامیابی سے مکمل ہو گیا' : 'Item exchanged successfully');
      }
      onClose();
    } catch (err) {
      toast.error(err.message || (isUrdu ? 'عمل مکمل کرنے میں ناکامی' : 'Failed to process request'));
    }
  };

  const isPending = returnMutation.isPending || exchangeMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isUrdu ? 'سامان کی واپسی یا تبادلہ' : 'Return or Exchange Items'}
      description={isUrdu ? 'گاہک کا واپس آیا سامان اسٹاک میں دوبارہ شامل کریں یا دوسری چیز سے تبدیل کریں۔' : 'Restock returned items into inventory or swap them with other shelf items.'}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 bg-paper-2 rounded-card border border-hairline">
          <button
            type="button"
            onClick={() => setMode('return')}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'return'
                ? 'bg-ink text-paper shadow-xs'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t.returnBtn}
          </button>
          <button
            type="button"
            onClick={() => setMode('exchange')}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'exchange'
                ? 'bg-ink text-paper shadow-xs'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            {t.exchangeBtn}
          </button>
        </div>

        {/* Order Selection */}
        {!targetOrder ? (
          <div className="space-y-2">
            <label className="text-xs font-medium text-ink-secondary block">
              {t.selectItem} / {t.orderNumber}
            </label>
            <Input
              placeholder={t.enterOrderNumber}
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
            />
            <div className="max-h-40 overflow-y-auto divide-y divide-hairline rounded-lg border border-hairline bg-surface">
              {candidateOrders.map((ord) => (
                <div
                  key={ord._id}
                  onClick={() => {
                    setTargetOrder(ord);
                    setSelectedItemIdx(0);
                    setReturnQty(1);
                  }}
                  className="p-2.5 text-xs hover:bg-paper-2 cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono font-bold text-ink">#{ord.orderNumber || ord._id.slice(-6)}</span>
                    <span className="text-ink-mute ml-2 font-tabular">{formatPKR(ord.total)}</span>
                    {ord.customerName && <span className="ml-2 text-primary font-medium">({ord.customerName})</span>}
                  </div>
                  <span className="text-ink-mute font-mono text-[11px]">{formatDate(ord.createdAt, language)}</span>
                </div>
              ))}
              {candidateOrders.length === 0 && (
                <div className="p-3 text-xs text-center text-ink-mute">
                  {t.noOrdersYet}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-card bg-paper-2 border border-hairline flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="label">{t.orderNumber}</span>
                <span className="font-mono font-bold text-sm text-ink">#{targetOrder.orderNumber || targetOrder._id.slice(-6)}</span>
                <Badge variant={targetOrder.status} size="sm">{tDash[targetOrder.status] || targetOrder.status}</Badge>
              </div>
              <p className="text-xs text-ink-mute mt-1">
                {formatPKR(targetOrder.total)} · {targetOrder.items?.length || 0} items
                {targetOrder.customerName && ` · Customer: ${targetOrder.customerName}`}
              </p>
            </div>
            {!initialOrder && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTargetOrder(null)}
                className="text-xs text-muted hover:text-ink"
              >
                Change
              </Button>
            )}
          </div>
        )}

        {targetOrder && (
          <>
            {/* Return Item Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-ink-secondary block mb-1">
                  {t.selectItemToReturn}
                </label>
                <select
                  value={selectedItemIdx}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    setSelectedItemIdx(idx);
                    setReturnQty(1);
                  }}
                  className="w-full h-10 px-3 text-xs bg-canvas text-ink border border-hairline-input rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {(targetOrder.items || []).map((itm, idx) => (
                    <option key={idx} value={idx}>
                      {itm.name} ({itm.quantity} bought @ {formatPKR(itm.price)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-ink-secondary block mb-1">
                  {t.returnQuantity} (Max {maxReturnQty})
                </label>
                <Input
                  type="number"
                  min="0"
                  max={maxReturnQty}
                  step="any"
                  value={returnQty}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setReturnQty(val === '' ? '' : Math.min(maxReturnQty, Math.max(0, val)));
                  }}
                  className="h-10 text-xs"
                  required
                />
              </div>
            </div>

            {/* Exchange Item Selection (Only in Exchange Mode) */}
            {mode === 'exchange' && (
              <div className="pt-3 border-t border-hairline space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-ink-secondary block mb-1">
                      {t.exchangeWith}
                    </label>
                    <select
                      value={exchangeItemId}
                      onChange={(e) => setExchangeItemId(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-canvas text-ink border border-hairline-input rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required
                    >
                      <option value="" disabled>
                        {t.selectItem}
                      </option>
                      {(inventory || []).map((inv) => (
                        <option key={inv._id} value={inv._id}>
                          {inv.name} ({formatQuantity(inv.quantity, inv.unit)} in stock @ {formatPKR(inv.price)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-ink-secondary block mb-1">
                      {t.replacementQuantity}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={exchangeQty}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setExchangeQty(val === '' ? '' : Math.max(0, val));
                      }}
                      className="h-10 text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Live Price Difference Card */}
                {replacementItem && (
                  <div className="p-3.5 rounded-card bg-paper-2 border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2 text-ink-mute">
                        <span>Return credit:</span>
                        <span className="font-mono font-medium text-ink">{formatPKR(returnTotalValue)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-ink-mute">
                        <span>New item cost:</span>
                        <span className="font-mono font-medium text-ink">{formatPKR(replacementTotalValue)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="label block">{t.priceDifference}</span>
                      {priceDiff > 0 ? (
                        <p className="font-mono font-bold text-sm text-coral">
                          +{formatPKR(priceDiff)} ({t.customerPays})
                        </p>
                      ) : priceDiff < 0 ? (
                        <p className="font-mono font-bold text-sm text-primary">
                          -{formatPKR(Math.abs(priceDiff))} ({t.storeRefunds})
                        </p>
                      ) : (
                        <p className="font-mono font-bold text-sm text-ink">
                          {t.evenExchange}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Optional Reason */}
            <div>
              <label className="text-xs font-medium text-ink-secondary block mb-1">
                {t.reason}
              </label>
              <Input
                placeholder={t.reasonPlaceholder}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="text-xs"
              />
            </div>
          </>
        )}

        <div className="flex items-center justify-end gap-3 pt-5 pb-1 border-t border-hairline mt-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            {t.cancel}
          </Button>
          <Button
            type="submit"
            loading={isPending}
            disabled={!targetOrder}
            leftIcon={mode === 'return' ? <RotateCcw className="w-4 h-4" /> : <ArrowLeftRight className="w-4 h-4" />}
          >
            {mode === 'return' ? t.returnBtn : t.exchangeBtn}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function OrdersPage() {
  const language = useUiStore((s) => s.language);
  const isUrdu = language === 'ur';
  const t = getTranslations(language).ordersPage;
  const tDash = getTranslations(language).dashboard;

  const { data: orders, isLoading, error } = useOrders();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnModalOrder, setReturnModalOrder] = useState(null);

  const statusTabs = useMemo(
    () => [
      { id: 'all', label: t.all },
      { id: 'completed', label: t.completed },
      { id: 'returned', label: tDash.returned || (isUrdu ? 'واپس شدہ' : 'Returned') },
      { id: 'pending_approval', label: t.waitingApproval },
      { id: 'rejected', label: t.rejected },
    ],
    [t, tDash, isUrdu]
  );

  const counts = useMemo(() => {
    const list = orders || [];
    return {
      all: list.length,
      completed: list.filter((o) => o.status === 'completed' || o.status === 'approved').length,
      returned: list.filter((o) => o.status === 'returned' || o.status === 'partially_returned' || o.status === 'exchanged').length,
      pending_approval: list.filter((o) => o.status === 'pending_approval').length,
      rejected: list.filter((o) => o.status === 'rejected').length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (statusFilter === 'all') return orders;
    if (statusFilter === 'completed') {
      return orders.filter((o) => o.status === 'completed' || o.status === 'approved');
    }
    if (statusFilter === 'returned') {
      return orders.filter((o) => o.status === 'returned' || o.status === 'partially_returned' || o.status === 'exchanged');
    }
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const totalRevenue = useMemo(() => {
    return (orders || []).reduce((sum, o) => sum + (o.total || 0), 0);
  }, [orders]);

  const columns = useMemo(
    () => [
      {
        id: 'srNo',
        header: isUrdu ? 'نمبر شمار' : 'Sr No.',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-muted">
            {row.index + 1}
          </span>
        ),
      },
      {
        accessorKey: 'orderNumber',
        header: isUrdu ? 'آرڈر #' : 'Order #',
        cell: ({ getValue, row }) => {
          const val = getValue() || row.original._id?.slice(-4);
          return (
            <span className="font-mono text-xs font-semibold text-ink">
              #{val}
            </span>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: t.date,
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap font-mono text-xs text-muted">
            {formatDate(getValue(), language)}
          </span>
        ),
      },
      {
        accessorKey: 'items',
        header: t.items,
        cell: ({ getValue }) => {
          const items = getValue() || [];
          const count = items.length;
          const summary = items.map((i) => `${i.name} x${i.quantity}`).join(', ');
          return (
            <div className="flex items-center gap-2 max-w-[260px]">
              <span className="shrink-0 font-mono text-[11px] text-muted">{count}×</span>
              <span className="truncate text-ink text-xs" title={summary}>
                {summary || '-'}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'total',
        header: t.total,
        cell: ({ getValue }) => (
          <span className="font-mono text-sm font-semibold text-ink">
            {formatPKR(getValue())}
          </span>
        ),
      },
      {
        accessorKey: 'paymentMethod',
        header: t.payment,
        cell: ({ getValue }) => {
          const key = (getValue() || 'cash').toLowerCase();
          return (
            <span className="text-xs font-medium capitalize text-ink-2">
              {tDash[key] || key}
            </span>
          );
        },
      },
      {
        accessorKey: 'source',
        header: t.sourceStaff,
        cell: ({ row, getValue }) => {
          const staffName = row.original?.staffName;
          const val = getValue();
          const displayVal = val === 'whatsapp' ? 'WhatsApp' : val === 'dashboard' ? (isUrdu ? 'ڈیش بورڈ' : 'Dashboard') : val;
          return (
            <div className="flex flex-col gap-1 items-start">
              <Badge variant={val} dot>{displayVal}</Badge>
              {staffName && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-deep dark:text-primary bg-primary-tint/60 px-1.5 py-0.5 rounded">
                  👤 {staffName}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: t.status,
        cell: ({ getValue }) => {
          const val = getValue();
          const label = tDash[val] || (val === 'pending_approval' ? tDash.pendingApproval : val);
          return <Badge variant={val} dot>{label}</Badge>;
        },
      },
    ],
    [t, tDash, language, isUrdu]
  );

  const table = useReactTable({
    data: filteredOrders,
    columns,
    state: { globalFilter: search },
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { sorting: [{ id: 'createdAt', desc: true }] },
  });

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <p className="label">{t.ledger}</p>
          <h1 className="display mt-2 text-[length:var(--fs-xl)] text-ink">{t.orders}</h1>
        </div>
        <Card padding="lg" className="text-center py-12">
          <AlertCircle className="mx-auto mb-3 size-9 text-coral" />
          <h3 className="font-display text-lg font-semibold text-ink">{t.ordersFailedTitle}</h3>
          <p className="mt-1 text-sm text-muted">{error.message}. {t.ordersFailedDesc}</p>
        </Card>
      </div>
    );
  }

 const statusTone = {
 all: 'bg-ink',
 completed: 'bg-primary',
 returned: 'bg-coral',
 pending_approval: 'bg-pear-deep',
 rejected: 'bg-coral',
 };

 return (
 <div className="space-y-5 sm:space-y-6">
 <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
 <div>
 <p className="label">{t.ledger}</p>
 <h1 className="display mt-2 text-[length:var(--fs-xl)] text-ink sm:text-[length:var(--fs-2xl)]">{t.orders}</h1>
 </div>
 <div className="flex flex-wrap items-center gap-2">
 <Button
 variant="outline"
 leftIcon={<RotateCcw className="size-4" />}
 onClick={() => {
 setReturnModalOrder(null);
 setReturnModalOpen(true);
 }}
 >
 {t.returnExchange}
 </Button>
 <Button leftIcon={<Plus className="size-4" />} onClick={() => setNewOrderOpen(true)}>
 {t.newOrder}
 </Button>
 </div>
 </div>

 {/* Volume slab (5) beside a status ledger that filters the table (7) */}
 <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
 <div className="flex flex-col justify-between gap-8 rounded-card bg-ink p-5 text-paper sm:p-7 lg:col-span-5">
 <p className="font-mono text-[11px] uppercase tracking-[0.1em] opacity-70">{t.volumeRecorded}</p>
 <div>
 <p className="font-display text-[clamp(2.25rem,4vw+1rem,3.5rem)] font-semibold leading-none tracking-[-0.04em] font-tabular">
 {isLoading ? '—' : formatPKR(totalRevenue)}
 </p>
 <p className="mt-3 text-sm opacity-75">
 {isUrdu ? `${isLoading ? '—' : counts.all} آرڈرز پر مشتمل` : `across ${isLoading ? '—' : counts.all} order${counts.all === 1 ? '' : 's'}`}
 </p>
 </div>
 </div>

 <div className="surface-card p-2 lg:col-span-7" role="group" aria-label="Filter by status">
 {statusTabs.map((tab) => {
 const active = statusFilter === tab.id;
 const n = counts[tab.id] ?? 0;
 const share = counts.all ? (n / counts.all) * 100 : 0;
 return (
 <button
 key={tab.id}
 type="button"
 onClick={() => setStatusFilter(tab.id)}
 aria-pressed={active}
 className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-input px-4 py-3 text-left transition-colors duration-150 ${
 active ? 'bg-paper-2' : 'hover:bg-paper-2/60'
 }`}
 >
 <span className={`size-2.5 rounded-pill ${statusTone[tab.id]}`} />
 <span className="min-w-0">
 <span className={`block text-sm ${active ? 'font-semibold text-ink' : 'font-medium text-ink-2'}`}>{tab.label}</span>
 {tab.id !== 'all' && (
 <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-pill bg-paper-3">
 <span className={`block h-full rounded-pill ${statusTone[tab.id]}`} style={{ width: `${share}%` }} />
 </span>
 )}
 </span>
 <span className="font-mono text-sm font-semibold text-ink">{isLoading ? '—' : n}</span>
 </button>
 );
 })}
 </div>
 </div>

 <Card padding="none" className="overflow-hidden">
 <div className="flex flex-col gap-3 px-5 pb-2 pt-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
 <div>
 <h2 className="font-display text-base font-semibold tracking-tight text-ink sm:text-lg">
 {statusTabs.find((item) => item.id === statusFilter)?.label} {t.orders}
 </h2>
 <p className="label mt-0.5">{t.tapRowHint}</p>
 </div>
 <div className="relative w-full sm:w-64">
 <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
 <input
 type="search"
 placeholder={t.searchPlaceholder}
 aria-label={t.searchPlaceholder}
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="h-10 w-full rounded-pill border border-rule-2 bg-paper pl-10 pr-4 text-sm text-ink transition-colors placeholder:text-muted/70 hover:border-muted focus:border-ink focus:outline-none"
 />
 </div>
 </div>

 {isLoading ? (
 <div className="space-y-2 px-5 pb-5 sm:px-6">
 <Skeleton variant="tableRow" />
 <Skeleton variant="tableRow" />
 <Skeleton variant="tableRow" />
 </div>
 ) : filteredOrders.length === 0 && !search ? (
 <EmptyState
 icon={<Receipt className="size-6" />}
 title={statusFilter === 'all' ? t.noOrdersYet : (isUrdu ? 'اس کیٹیگری میں کوئی آرڈر نہیں ہے' : `No ${statusFilter.replace('_', ' ')} orders`)}
 description={
 statusFilter === 'all'
 ? t.noOrdersDesc
 : t.noFilteredOrdersDesc
 }
 actionLabel={statusFilter === 'all' ? t.newOrder : undefined}
 actionIcon={statusFilter === 'all' ? <Plus className="size-4" /> : undefined}
 onAction={statusFilter === 'all' ? () => setNewOrderOpen(true) : undefined}
 />
 ) : (
 <div className="pb-2">
 <Table table={table} onRowClick={(order) => setSelectedOrder(order)} emptyText={t.noMatchSearch} />
 </div>
 )}
 </Card>

 <NewOrderModal isOpen={newOrderOpen} onClose={() => setNewOrderOpen(false)} />
 <ReturnExchangeModal
    key={returnModalOpen ? (returnModalOrder?._id || 'open') : 'closed'}
    isOpen={returnModalOpen}
    onClose={() => {
      setReturnModalOpen(false);
      setReturnModalOrder(null);
    }}
    initialOrder={returnModalOrder}
  />

 <Modal
 isOpen={!!selectedOrder}
 onClose={() => setSelectedOrder(null)}
 title={t.orderDetails}
 maxWidth="max-w-lg"
 >
 {selectedOrder && (
 <div className="space-y-5">
 <div className="flex items-end justify-between gap-4 rounded-card bg-paper-2 p-4">
 <div>
 <span className="font-mono text-xs font-semibold text-ink-mute block mb-0.5">#{selectedOrder.orderNumber || selectedOrder._id.slice(-6)}</span>
 <p className="label">{t.total}</p>
 <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink font-tabular">{formatPKR(selectedOrder.total)}</p>
 </div>
 <Badge variant={selectedOrder.status} dot>{tDash[selectedOrder.status] || selectedOrder.status}</Badge>
 </div>

 <div className="space-y-3">
 {selectedOrder.customerName && (
 <div className="flex items-center justify-between text-sm">
 <span className="text-ink-secondary">{isUrdu ? 'گاہک' : 'Customer'}</span>
 <span className="text-primary font-medium">{selectedOrder.customerName}</span>
 </div>
 )}
 <div className="flex items-center justify-between text-sm">
 <span className="text-ink-secondary">{t.paymentMethod}</span>
 <span className="capitalize text-ink font-medium">{tDash[selectedOrder.paymentMethod] || selectedOrder.paymentMethod}</span>
 </div>
 <div className="flex items-center justify-between text-sm">
 <span className="text-ink-secondary">{t.source}</span>
 <Badge variant={selectedOrder.source}>{selectedOrder.source === 'dashboard' ? (isUrdu ? 'ڈیش بورڈ' : 'Dashboard') : selectedOrder.source}</Badge>
 </div>
 <div className="flex items-center justify-between text-sm">
 <span className="text-ink-secondary">{t.created}</span>
 <span className="text-ink font-medium">{formatDate(selectedOrder.createdAt, language)}</span>
 </div>
 </div>

 <div>
 <p className="label mb-2">{t.items}</p>
 <ul className="divide-y divide-dashed divide-rule-2 border-y border-rule font-mono">
 {(selectedOrder.items || []).map((item, idx) => (
 <li key={idx} className="flex items-center justify-between gap-4 py-3">
 <div>
 <p className="text-sm text-ink">{item.name}</p>
 <p className="text-[11px] text-ink-mute">
 {formatPKR(item.price)} {t.each}
 </p>
 </div>
 <div className="text-right">
 <p className="text-sm text-ink font-tabular">{formatQuantity(item.quantity)}</p>
 <p className="text-[11px] text-ink-mute">
 {formatPKR((item.price || 0) * item.quantity)}
 </p>
 </div>
 </li>
 ))}
 </ul>
 </div>

 {selectedOrder.returnHistory?.length > 0 && (
 <div className="pt-1">
 <p className="label mb-2 text-danger-ink">{isUrdu ? 'واپسی کی تاریخ' : 'Return History'}</p>
 <div className="space-y-2">
 {selectedOrder.returnHistory.map((rh, idx) => (
 <div key={idx} className="p-2.5 rounded-lg bg-coral-tint/40 border border-coral-tint text-xs space-y-1">
 <div className="flex items-center justify-between font-mono">
 <span className="font-semibold text-danger-ink">Refund: -{formatPKR(rh.refundAmount)}</span>
 <span className="text-ink-mute text-[10px]">{formatDate(rh.returnedAt, language)}</span>
 </div>
 <div className="text-ink-2">
 {(rh.items || []).map((ri, riIdx) => (
 <span key={riIdx}>{ri.name} x{ri.quantity}{riIdx < rh.items.length - 1 ? ', ' : ''}</span>
 ))}
 </div>
 {rh.reason && <p className="text-[11px] text-ink-mute italic">Reason: {rh.reason}</p>}
 </div>
 ))}
 </div>
 </div>
 )}

 {selectedOrder.exchangeHistory?.length > 0 && (
 <div className="pt-1">
 <p className="label mb-2 text-sky-ink">{isUrdu ? 'تبادلے کی تاریخ' : 'Exchange History'}</p>
 <div className="space-y-2">
 {selectedOrder.exchangeHistory.map((eh, idx) => (
 <div key={idx} className="p-2.5 rounded-lg bg-sky-tint/40 border border-sky-tint text-xs space-y-1">
 <div className="flex items-center justify-between font-mono">
 <span className="font-semibold text-ink">
 {eh.priceDifference > 0 ? `+${formatPKR(eh.priceDifference)} (Paid)` : eh.priceDifference < 0 ? `-${formatPKR(Math.abs(eh.priceDifference))} (Refunded)` : 'Even Exchange'}
 </span>
 <span className="text-ink-mute text-[10px]">{formatDate(eh.exchangedAt, language)}</span>
 </div>
 <div className="text-ink-2">
 <span>Returned: {eh.returnItem?.name} x{eh.returnItem?.quantity}</span>
 <span className="mx-1">→</span>
 <span>New: {eh.newItem?.name} x{eh.newItem?.quantity}</span>
 </div>
 {eh.reason && <p className="text-[11px] text-ink-mute italic">Reason: {eh.reason}</p>}
 </div>
 ))}
 </div>
 </div>
 )}

 <div className="flex items-center justify-between pt-5 pb-1">
 {selectedOrder.status !== 'returned' && selectedOrder.status !== 'rejected' ? (
 <Button
 variant="outline"
 size="sm"
 leftIcon={<RotateCcw className="w-4 h-4" />}
 onClick={() => {
 const ord = selectedOrder;
 setSelectedOrder(null);
 setReturnModalOrder(ord);
 setReturnModalOpen(true);
 }}
 >
 {t.returnExchange}
 </Button>
 ) : <div />}
 <Button variant="outline" onClick={() => setSelectedOrder(null)} leftIcon={<X className="w-4 h-4" />}>
 {t.close}
 </Button>
 </div>
 </div>
 )}
 </Modal>
 </div>
 );
}
