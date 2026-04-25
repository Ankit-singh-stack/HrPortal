import mongoose from 'mongoose';

const salarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: Number,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  basicSalary: {
    type: Number,
    required: true,
    default: 0
  },
  allowances: {
    houseRent: { type: Number, default: 0 },
    dearness: { type: Number, default: 0 },
    travel: { type: Number, default: 0 },
    medical: { type: Number, default: 0 },
    special: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  deductions: {
    tax: { type: Number, default: 0 },
    providentFund: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    loan: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  bonus: {
    type: Number,
    default: 0
  },
  overtime: {
    hours: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 }
  },
  netSalary: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processed', 'paid'],
    default: 'pending'
  },
  paymentDate: Date,
  paymentMethod: {
    type: String,
    enum: ['bank', 'cash', 'cheque'],
    default: 'bank'
  },
  bankAccount: String,
  remarks: String,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index to ensure unique salary per employee per month
salarySchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

export const Salary = mongoose.model('Salary', salarySchema);