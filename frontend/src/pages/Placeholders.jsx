import { Card } from '../components/ui/Card';

import { Badge } from '../components/ui/Badge';
import {
  IconBoxSeam,
  IconReceipt,
  IconGitBranch,
  IconClipboardCheck,
  IconLayoutDashboard,
} from '@tabler/icons-react';

export function OverviewPlaceholder() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-light text-ink tracking-tight">Overview</h2>
          <p className="text-xs text-ink-mute">Store activity summary and KPI metrics</p>
        </div>
        <Badge variant="primary">Phase 2</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Sales", val: '0', sub: 'No sales yet today' },
          { label: "Today's Revenue", val: 'Rs. 0', sub: 'Tabular figures ready' },
          { label: 'Low Stock Items', val: '0', sub: 'All stock healthy' },
          { label: 'Pending Approvals', val: '0', sub: 'No actions pending' },
        ].map((stat, i) => (
          <Card key={i} padding="md">
            <p className="text-xs text-ink-mute uppercase tracking-wider font-medium">{stat.label}</p>
            <p className="text-2xl font-light text-ink font-tabular mt-2">{stat.val}</p>
            <p className="text-xs text-ink-mute mt-1">{stat.sub}</p>
          </Card>
        ))}
      </div>

      <Card padding="lg" className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center mb-3">
          <IconLayoutDashboard className="w-6 h-6" />
        </div>
        <h3 className="text-base font-medium text-ink">Dashboard Visualizations Ready</h3>
        <p className="text-xs text-ink-mute max-w-md mx-auto mt-1 leading-relaxed">
          The foundation layer, routing, auth guards, and UI tokens are fully configured.
          Real-time charts and recent orders table will be wired to backend overview endpoints in Phase 2.
        </p>
      </Card>
    </div>
  );
}

export function InventoryPlaceholder() {
  return (
    <Card padding="lg" className="text-center py-16 space-y-3">
      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
        <IconBoxSeam className="w-6 h-6" />
      </div>
      <h2 className="text-base font-medium text-ink">Inventory Management</h2>
      <p className="text-xs text-ink-mute max-w-sm mx-auto leading-relaxed">
        Full TanStack Table CRUD with low-stock alerts, search filtering, and unit pricing is scheduled for Phase 2.
      </p>
      <div className="pt-2">
        <Badge variant="primary">Scheduled in Phase 2</Badge>
      </div>
    </Card>
  );
}

export function OrdersPlaceholder() {
  return (
    <Card padding="lg" className="text-center py-16 space-y-3">
      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
        <IconReceipt className="w-6 h-6" />
      </div>
      <h2 className="text-base font-medium text-ink">Orders & Transactions</h2>
      <p className="text-xs text-ink-mute max-w-sm mx-auto leading-relaxed">
        Order history, voice/guided payment method breakdowns (EasyPaisa, JazzCash, Cash), and detail views will be active in Phase 2.
      </p>
      <div className="pt-2">
        <Badge variant="primary">Scheduled in Phase 2</Badge>
      </div>
    </Card>
  );
}

export function WorkflowsPlaceholder() {
  return (
    <Card padding="lg" className="text-center py-16 space-y-3">
      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
        <IconGitBranch className="w-6 h-6" />
      </div>
      <h2 className="text-base font-medium text-ink">Automations & Workflows</h2>
      <p className="text-xs text-ink-mute max-w-sm mx-auto leading-relaxed">
        Threshold, schedule, and message trigger automations will be manageable in Phase 2.
      </p>
      <div className="pt-2">
        <Badge variant="primary">Scheduled in Phase 2</Badge>
      </div>
    </Card>
  );
}

export function ApprovalsPlaceholder() {
  return (
    <Card padding="lg" className="text-center py-16 space-y-3">
      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
        <IconClipboardCheck className="w-6 h-6" />
      </div>
      <h2 className="text-base font-medium text-ink">Human-in-the-loop Approvals</h2>
      <p className="text-xs text-ink-mute max-w-sm mx-auto leading-relaxed">
        High-value order flags and risky workflow action review queue will be manageable in Phase 2.
      </p>
      <div className="pt-2">
        <Badge variant="primary">Scheduled in Phase 2</Badge>
      </div>
    </Card>
  );
}
