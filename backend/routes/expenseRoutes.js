const express = require('express');
const { createExpense, getExpenses, updateExpense, deleteExpense, getAnalytics } = require('../controllers/expenseController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);
router.route('/').post(createExpense).get(getExpenses);
router.route('/analytics').get(getAnalytics);
router.route('/:id').put(updateExpense).delete(deleteExpense);

module.exports = router;
