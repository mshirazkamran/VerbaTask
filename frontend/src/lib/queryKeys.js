export const queryKeys = {
  merchant: () => ['merchant'],
  inventory: () => ['inventory'],
  orders: () => ['orders'],
  order: (id) => ['orders', id],
  workflows: () => ['workflows'],
  approvals: () => ['approvals'],
  dashboard: () => ['dashboard'],
};
