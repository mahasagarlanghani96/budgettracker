export const TEST_IDS = {
  // Auth
  loginEmailInput: 'login-email',
  loginPasswordInput: 'login-password',
  loginSubmitButton: 'login-submit',
  registerNameInput: 'register-name',
  registerEmailInput: 'register-email',
  registerPasswordInput: 'register-password',
  registerSubmitButton: 'register-submit',

  // Navigation
  sidebar: 'sidebar',
  sidebarLink: (name: string) => `sidebar-link-${name}`,

  // Dashboard
  dashboardTotalBalance: 'dashboard-total-balance',
  dashboardReceivables: 'dashboard-receivables',
  dashboardPayables: 'dashboard-payables',

  // Transactions
  transactionList: 'transaction-list',
  transactionRow: (id: string) => `transaction-row-${id}`,
  newTransactionButton: 'new-transaction-button',

  // Accounts
  accountList: 'account-list',
  accountCard: (id: string) => `account-card-${id}`,

  // Forms
  formSubmitButton: 'form-submit',
  formCancelButton: 'form-cancel',

  // Toasts
  toastSuccess: 'toast-success',
  toastError: 'toast-error',
} as const;
