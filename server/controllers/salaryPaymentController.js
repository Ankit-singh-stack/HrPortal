import { Salary } from '../models/Salary.js';
import { User } from '../models/User.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { createOrder, verifyPaymentSignature } from '../utils/razorpay.js';

// HR initiates salary payment
export const initiateSalaryPayment = async (req, res) => {
  try {
    const { salaryIds } = req.body;
    const hrId = req.user._id;

    if (!salaryIds || salaryIds.length === 0) {
      return res.status(400).json({ message: 'Please provide salary IDs' });
    }

    const salaries = await Salary.find({ _id: { $in: salaryIds } });

    if (salaries.length === 0) {
      return res.status(404).json({ message: 'No salaries found' });
    }

    const results = [];

    for (const salary of salaries) {
      try {
        // Check if already paid
        if (salary.paymentStatus === 'paid') {
          results.push({
            salaryId: salary._id,
            success: false,
            message: 'Salary already paid'
          });
          continue;
        }

        // Create Razorpay order
        const order = await createOrder(
          salary.netSalary,
          'INR',
          `salary_${salary._id}_${Date.now()}`
        );

        // Update salary with payment order details
        salary.paymentOrderId = order.id;
        salary.paymentStatus = 'payment_initiated';
        salary.paymentInitiatedAt = new Date();
        salary.paymentInitiatedBy = hrId;
        salary.paymentMethod = 'razorpay';
        salary.paymentDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days due date

        await salary.save();

        // Create activity log
        await ActivityLog.create({
          userId: hrId,
          action: 'SALARY_PAYMENT_INITIATED',
          details: {
            salaryId: salary._id,
            employeeId: salary.userId,
            amount: salary.netSalary,
            orderId: order.id
          }
        });

        // Notify employee
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${salary.userId}`).emit('salaryPaymentInitiated', {
            message: `Your salary payment for ${salary.month + 1}/${salary.year} has been initiated`,
            salaryId: salary._id,
            amount: salary.netSalary,
            orderId: order.id
          });
        }

        results.push({
          salaryId: salary._id,
          success: true,
          orderId: order.id,
          amount: salary.netSalary,
          message: 'Payment initiated successfully'
        });
      } catch (error) {
        results.push({
          salaryId: salary._id,
          success: false,
          message: error.message
        });
      }
    }

    res.json({
      message: 'Salary payments initiated',
      results
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Employee confirms payment and completes transaction
export const confirmSalaryPayment = async (req, res) => {
  try {
    const { salaryId, paymentId, signature } = req.body;
    const employeeId = req.user._id;

    if (!salaryId || !paymentId || !signature) {
      return res.status(400).json({ message: 'Missing payment details' });
    }

    const salary = await Salary.findById(salaryId);

    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    // Verify user is authorized (HR or the Employee themselves)
    if (req.user.role !== 'hr' && salary.userId.toString() !== employeeId.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Verify Razorpay signature
    const isValid = verifyPaymentSignature(
      salary.paymentOrderId,
      paymentId,
      signature
    );

    if (!isValid) {
      // Payment verification failed
      salary.paymentStatus = 'failed';
      salary.failureReason = 'Invalid payment signature';
      await salary.save();

      await ActivityLog.create({
        userId: employeeId,
        action: 'SALARY_PAYMENT_FAILED',
        details: {
          salaryId: salary._id,
          reason: 'Invalid signature'
        }
      });

      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Update salary with payment confirmation
    salary.paymentId = paymentId;
    salary.paymentSignature = signature;
    salary.paymentStatus = 'paid';
    salary.paymentDate = new Date();
    salary.paymentApprovedAt = new Date();

    await salary.save();

    // Create activity log
    await ActivityLog.create({
      userId: employeeId,
      action: 'SALARY_PAYMENT_COMPLETED',
      details: {
        salaryId: salary._id,
        paymentId: paymentId,
        amount: salary.netSalary,
        month: salary.month,
        year: salary.year
      }
    });

    // Notify HR
    const io = req.app.get('io');
    if (io) {
      io.to('hr_department').emit('salaryPaymentCompleted', {
        message: `Salary payment completed for employee`,
        salaryId: salary._id,
        employeeId: salary.userId,
        amount: salary.netSalary
      });
    }

    res.json({
      message: 'Salary payment completed successfully',
      salary
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Employee views pending salary payments
export const getPendingSalaryPayments = async (req, res) => {
  try {
    const employeeId = req.user._id;

    const pendingPayments = await Salary.find({
      userId: employeeId,
      paymentStatus: { $in: ['payment_pending', 'payment_initiated'] }
    })
      .populate('processedBy', 'name email')
      .populate('paymentInitiatedBy', 'name email')
      .sort({ paymentDueDate: 1 });

    res.json({
      pendingPayments,
      total: pendingPayments.length,
      totalAmount: pendingPayments.reduce((sum, p) => sum + p.netSalary, 0)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// HR views all initiated payments
export const getInitiatedPayments = async (req, res) => {
  try {
    const { status, userId } = req.query;

    let query = {
      paymentStatus: { $in: ['payment_initiated', 'paid'] }
    };

    if (userId) {
      query.userId = userId;
    }

    if (status) {
      query.paymentStatus = status;
    }

    const payments = await Salary.find(query)
      .populate('userId', 'name email')
      .populate('paymentInitiatedBy', 'name email')
      .sort({ paymentInitiatedAt: -1 });

    const stats = {
      total: payments.length,
      paid: payments.filter(p => p.paymentStatus === 'paid').length,
      pending: payments.filter(p => p.paymentStatus === 'payment_initiated').length,
      totalAmount: payments.reduce((sum, p) => sum + p.netSalary, 0),
      paidAmount: payments
        .filter(p => p.paymentStatus === 'paid')
        .reduce((sum, p) => sum + p.netSalary, 0)
    };

    res.json({
      payments,
      stats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get payment details
export const getSalaryPaymentDetails = async (req, res) => {
  try {
    const { salaryId } = req.params;

    const salary = await Salary.findById(salaryId)
      .populate('userId', 'name email profile')
      .populate('processedBy', 'name email')
      .populate('paymentInitiatedBy', 'name email');

    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    res.json(salary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cancel payment (HR only)
export const cancelSalaryPayment = async (req, res) => {
  try {
    const { salaryId } = req.params;
    const { reason } = req.body;
    const hrId = req.user._id;

    const salary = await Salary.findById(salaryId);

    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    if (salary.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Cannot cancel paid salary' });
    }

    salary.paymentStatus = 'failed';
    salary.failureReason = reason || 'Cancelled by HR';
    salary.paymentInitiatedBy = null;
    salary.paymentOrderId = null;

    await salary.save();

    await ActivityLog.create({
      userId: hrId,
      action: 'SALARY_PAYMENT_CANCELLED',
      details: {
        salaryId: salary._id,
        reason: reason || 'Cancelled by HR'
      }
    });

    // Notify employee
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${salary.userId}`).emit('salaryPaymentCancelled', {
        message: `Your salary payment has been cancelled`,
        reason: reason || 'Cancelled by HR'
      });
    }

    res.json({
      message: 'Payment cancelled successfully',
      salary
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get salary payment statistics
export const getPaymentStatistics = async (req, res) => {
  try {
    const salaries = await Salary.find({
      paymentStatus: { $in: ['payment_initiated', 'paid', 'failed'] }
    });

    const stats = {
      totalSalaries: salaries.length,
      paidSalaries: salaries.filter(s => s.paymentStatus === 'paid').length,
      pendingSalaries: salaries.filter(s => s.paymentStatus === 'payment_initiated').length,
      failedSalaries: salaries.filter(s => s.paymentStatus === 'failed').length,
      totalAmount: salaries.reduce((sum, s) => sum + s.netSalary, 0),
      paidAmount: salaries
        .filter(s => s.paymentStatus === 'paid')
        .reduce((sum, s) => sum + s.netSalary, 0),
      pendingAmount: salaries
        .filter(s => s.paymentStatus === 'payment_initiated')
        .reduce((sum, s) => sum + s.netSalary, 0)
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
