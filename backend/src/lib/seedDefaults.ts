export const DEFAULT_OWNERS = [
  { name: 'Me', color: '#2563eb' },
  { name: 'Family', color: '#16a34a' },
]

export const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'income' },
  { name: 'Business Income', type: 'income' },
  { name: 'Food', type: 'expense' },
  { name: 'Transport', type: 'expense' },
  { name: 'Shopping', type: 'expense' },
  { name: 'Household', type: 'expense' },
  { name: 'Business', type: 'expense' },
  { name: 'Subscriptions', type: 'expense' },
  { name: 'Other', type: 'expense' },
]

// Seeded lazily the first time a user opens fund categories (see
// listFundCategories), so existing users get them without a data migration.
export const DEFAULT_FUND_CATEGORIES = [
  'Travel',
  'Stay',
  'Food',
  'Shopping',
  'Gifts',
  'Tickets',
  'Materials',
  'Labour',
  'Misc',
]
