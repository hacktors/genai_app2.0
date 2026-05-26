const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { categories, paymentMethods } = require('../models/Expense');

const users = new Map();
const userIdsByEmail = new Map();
const expenses = new Map();

const createId = () => crypto.randomBytes(12).toString('hex');

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizeEmail = (email) => String(email || '').toLowerCase().trim();

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email
});

const createHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toNumber = (value, field, fallback = null) => {
  const number = Number(value);
  if (Number.isFinite(number) && number >= 0) return number;
  if (fallback !== null) return fallback;
  throw createHttpError(`${field} must be a non-negative number.`);
};

const coerceAllowed = (value, allowed, fallback) => {
  if (!value) return fallback;
  const normalized = String(value).trim().toLowerCase();
  return allowed.find((entry) => entry.toLowerCase() === normalized) || fallback;
};

const normalizeExpense = (payload, userId, existing = {}) => {
  const merchant = String(payload.merchant ?? existing.merchant ?? '').trim();
  if (!merchant) throw createHttpError('Merchant is required.');

  const parsedDate = new Date(payload.date ?? existing.date);
  if (Number.isNaN(parsedDate.getTime())) throw createHttpError('Valid expense date is required.');

  const items = Array.isArray(payload.items)
    ? payload.items
        .filter((item) => item && item.name)
        .map((item) => ({
          name: String(item.name).trim(),
          price: toNumber(item.price, 'Item price', 0)
        }))
    : existing.items || [];

  const subtotal = toNumber(
    payload.subtotal ?? existing.subtotal,
    'Subtotal',
    items.reduce((sum, item) => sum + item.price, 0)
  );
  const tax = toNumber(payload.tax ?? existing.tax, 'Tax', 0);
  const total = toNumber(payload.total ?? existing.total, 'Total', subtotal + tax);

  return {
    userId: String(userId),
    merchant,
    date: parsedDate.toISOString(),
    items,
    subtotal,
    tax,
    total,
    paymentMethod: coerceAllowed(payload.paymentMethod ?? existing.paymentMethod, paymentMethods, 'Other'),
    category: coerceAllowed(payload.category ?? existing.category, categories, 'Others'),
    receiptUrl: payload.receiptUrl ?? existing.receiptUrl ?? null
  };
};

const createUser = async ({ name, email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date().toISOString();
  const user = {
    _id: createId(),
    name: String(name).trim(),
    email: normalizedEmail,
    password: await bcrypt.hash(password, 12),
    createdAt: now,
    updatedAt: now
  };

  users.set(user._id, user);
  userIdsByEmail.set(normalizedEmail, user._id);
  return publicUser(user);
};

const findUserByEmail = async (email) => {
  const userId = userIdsByEmail.get(normalizeEmail(email));
  return userId ? users.get(userId) || null : null;
};

const findUserById = async (id) => {
  const user = users.get(String(id));
  return user ? publicUser(user) : null;
};

const comparePassword = async (user, password) => bcrypt.compare(password, user.password);

const createExpense = async (userId, payload) => {
  const now = new Date().toISOString();
  const expense = {
    _id: createId(),
    ...normalizeExpense(payload, userId),
    createdAt: now,
    updatedAt: now
  };

  expenses.set(expense._id, expense);
  return clone(expense);
};

const getExpenses = async (userId, { category, search, sortBy, page = 1, limit = 10 } = {}) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const normalizedSearch = String(search || '').trim().toLowerCase();

  let rows = Array.from(expenses.values()).filter((expense) => expense.userId === String(userId));

  if (category) rows = rows.filter((expense) => expense.category === category);
  if (normalizedSearch) {
    rows = rows.filter((expense) => expense.merchant.toLowerCase().includes(normalizedSearch));
  }

  rows.sort((a, b) => {
    if (sortBy === 'amount_asc') return a.total - b.total;
    if (sortBy === 'amount_desc') return b.total - a.total;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const total = rows.length;
  const pagedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return {
    expenses: clone(pagedRows),
    total,
    page: currentPage,
    pages: Math.ceil(total / pageSize)
  };
};

const updateExpense = async (userId, id, payload) => {
  const existing = expenses.get(String(id));
  if (!existing || existing.userId !== String(userId)) return null;

  const updated = {
    ...existing,
    ...normalizeExpense(payload, userId, existing),
    _id: existing._id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString()
  };

  expenses.set(existing._id, updated);
  return clone(updated);
};

const deleteExpense = async (userId, id) => {
  const existing = expenses.get(String(id));
  if (!existing || existing.userId !== String(userId)) return false;
  return expenses.delete(existing._id);
};

const getAnalytics = async (userId) => {
  const rows = Array.from(expenses.values()).filter((expense) => expense.userId === String(userId));
  const totalsByCategory = new Map();

  for (const expense of rows) {
    const current = totalsByCategory.get(expense.category) || { name: expense.category, value: 0, count: 0 };
    current.value += expense.total;
    current.count += 1;
    totalsByCategory.set(expense.category, current);
  }

  const breakdown = Array.from(totalsByCategory.values())
    .map((entry) => ({ ...entry, value: Number(entry.value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);

  return {
    grandTotal: Number(rows.reduce((sum, expense) => sum + expense.total, 0).toFixed(2)),
    rawCount: rows.length,
    breakdown
  };
};

module.exports = {
  comparePassword,
  createExpense,
  createUser,
  deleteExpense,
  findUserByEmail,
  findUserById,
  getAnalytics,
  getExpenses,
  updateExpense
};
