const mongoose = require('mongoose');

const categories = ['Food', 'Travel', 'Entertainment', 'Shopping', 'Medical', 'Education', 'Utilities', 'Bills', 'Groceries', 'Others'];
const paymentMethods = ['Cash', 'Card', 'UPI', 'NetBanking', 'Other'];

const ItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    price: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const ExpenseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    merchant: { type: String, required: true, trim: true, maxlength: 160, index: true },
    date: { type: Date, required: true, index: true },
    items: { type: [ItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0, index: true },
    paymentMethod: { type: String, enum: paymentMethods, default: 'Other' },
    category: {
      type: String,
      enum: categories,
      default: 'Others',
      index: true
    },
    receiptUrl: { type: String, default: null, trim: true }
  },
  { timestamps: true }
);

ExpenseSchema.index({ userId: 1, date: -1 });
ExpenseSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Expense', ExpenseSchema);
module.exports.categories = categories;
module.exports.paymentMethods = paymentMethods;
