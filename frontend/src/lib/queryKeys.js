export const queryKeys = {
  merchant: () => ['merchant'],
  inventory: () => ['inventory'],
  orders: () => ['orders'],
  order: (id) => ['orders', id],
  workflows: () => ['workflows'],
  approvals: () => ['approvals'],
  dashboard: () => ['dashboard'],
  analytics: (range) => (range ? ['analytics', range] : ['analytics']),
  profile: () => ['merchant', 'profile'],
  paymentMethods: () => ['merchant', 'payment-methods'],
  customers: () => ['customers'],
  staff: () => ['merchant', 'staff'],
};
