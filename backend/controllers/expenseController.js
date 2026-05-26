const Expense = require('../models/Expense');
const memoryStore = require('../services/memoryStore');

exports.createExpense = async (req, res, next) => {
  try {
    if (req.useMemoryStore) {
      const expense = await memoryStore.createExpense(req.user._id, req.body);
      return res.status(201).json(expense);
    }

    const expenseData = { ...req.body, userId: req.user._id };
    const expense = await Expense.create(expenseData);
    return res.status(201).json(expense);
  } catch (error) {
    return next(error);
  }
};

exports.getExpenses = async (req, res, next) => {
  try {
    if (req.useMemoryStore) {
      const result = await memoryStore.getExpenses(req.user._id, req.query);
      return res.json(result);
    }

    const { category, search, sortBy, page = 1, limit = 10 } = req.query;
    const currentPage = Math.max(Number(page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const query = { userId: req.user._id };

    if (category) query.category = category;
    if (search) query.merchant = { $regex: String(search).trim(), $options: 'i' };

    let sortOptions = { date: -1 };
    if (sortBy === 'amount_asc') sortOptions = { total: 1 };
    if (sortBy === 'amount_desc') sortOptions = { total: -1 };

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .sort(sortOptions)
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize),
      Expense.countDocuments(query)
    ]);

    return res.json({ expenses, total, page: currentPage, pages: Math.ceil(total / pageSize) });
  } catch (error) {
    return next(error);
  }
};

exports.updateExpense = async (req, res, next) => {
  try {
    if (req.useMemoryStore) {
      const expense = await memoryStore.updateExpense(req.user._id, req.params.id, req.body);

      if (!expense) {
        return res.status(404).json({ error: 'Resource context unmapped or unavailable.' });
      }

      return res.json(expense);
    }

    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!expense) {
      return res.status(404).json({ error: 'Resource context unmapped or unavailable.' });
    }

    return res.json(expense);
  } catch (error) {
    return next(error);
  }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    if (req.useMemoryStore) {
      const deleted = await memoryStore.deleteExpense(req.user._id, req.params.id);

      if (!deleted) {
        return res.status(404).json({ error: 'Resource destruction target not found.' });
      }

      return res.json({ message: 'Resource cleanly dropped from cluster.' });
    }

    const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!expense) {
      return res.status(404).json({ error: 'Resource destruction target not found.' });
    }

    return res.json({ message: 'Resource cleanly dropped from cluster.' });
  } catch (error) {
    return next(error);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    if (req.useMemoryStore) {
      const analytics = await memoryStore.getAnalytics(req.user._id);
      return res.json(analytics);
    }

    const breakdown = await Expense.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$category',
          value: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $project: { _id: 0, name: '$_id', value: { $round: ['$value', 2] }, count: 1 } },
      { $sort: { value: -1 } }
    ]);

    const totalStats = await Expense.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: null,
          grandTotal: { $sum: '$total' },
          rawCount: { $sum: 1 }
        }
      }
    ]);

    const stats = totalStats[0] || { grandTotal: 0, rawCount: 0 };
    return res.json({
      grandTotal: Number(stats.grandTotal.toFixed(2)),
      rawCount: stats.rawCount,
      breakdown
    });
  } catch (error) {
    return next(error);
  }
};
