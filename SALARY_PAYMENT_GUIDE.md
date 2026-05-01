# Salary Payment System Guide

## Overview

The salary payment system enables HR to initiate salary payments to employees through Razorpay. The flow is:

1. **HR Process Salary** - HR creates and processes salary records for employees
2. **HR Initiate Payment** - HR initiates payment for processed salaries
3. **Employee Receives Notification** - Employee gets real-time notification
4. **Employee Confirms Payment** - Employee completes payment through Razorpay
5. **Payment Completed** - Salary is marked as paid with transaction details

---

## Payment Flow Diagram

```
┌─────────────────┐
│    HR Admin     │
└────────┬────────┘
         │
         ├─► Process Salary (Month/Year)
         │
         ├─► Select Salaries
         │
         └─► Click "Initiate Payments"
             │
             ├─► Create Razorpay Orders
             ├─► Update Salary Status → payment_initiated
             ├─► Store Payment Order ID
             └─► Notify Employees (Socket.io)
                 │
                 ▼
         ┌─────────────────┐
         │    Employee     │
         └────────┬────────┘
                  │
                  ├─► View Pending Payments
                  │
                  └─► Click "Complete Payment"
                      │
                      ├─► Open Razorpay Checkout
                      ├─► Enter Payment Details
                      ├─► Verify OTP
                      └─► Payment Successful
                          │
                          ├─► Verify Signature
                          ├─► Update Salary Status → paid
                          ├─► Store Payment ID & Signature
                          └─► Notify HR (Socket.io)
```

---

## API Endpoints

### HR Endpoints

#### 1. Initiate Salary Payments
**POST** `/api/salary-payment/initiate`

**Request:**
```json
{
  "salaryIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
}
```

**Response:**
```json
{
  "message": "Salary payments initiated",
  "results": [
    {
      "salaryId": "507f1f77bcf86cd799439011",
      "success": true,
      "orderId": "order_IHtMvFHhWpZq8b",
      "amount": 50000,
      "message": "Payment initiated successfully"
    }
  ]
}
```

#### 2. Get Initiated Payments
**GET** `/api/salary-payment/initiated?status=payment_initiated&userId=507f1f77bcf86cd799439011`

**Response:**
```json
{
  "payments": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "month": 4,
      "year": 2026,
      "netSalary": 50000,
      "paymentStatus": "payment_initiated",
      "paymentOrderId": "order_IHtMvFHhWpZq8b",
      "paymentInitiatedAt": "2026-05-01T10:30:00Z"
    }
  ],
  "stats": {
    "total": 5,
    "paid": 2,
    "pending": 3,
    "totalAmount": 250000,
    "paidAmount": 100000
  }
}
```

#### 3. Cancel Payment
**DELETE** `/api/salary-payment/{salaryId}/cancel`

**Request:**
```json
{
  "reason": "Need to adjust amount"
}
```

#### 4. Payment Statistics
**GET** `/api/salary-payment/statistics`

**Response:**
```json
{
  "totalSalaries": 100,
  "paidSalaries": 85,
  "pendingSalaries": 10,
  "failedSalaries": 5,
  "totalAmount": 5000000,
  "paidAmount": 4250000,
  "pendingAmount": 500000
}
```

### Employee Endpoints

#### 1. Get Pending Payments
**GET** `/api/salary-payment/pending`

**Response:**
```json
{
  "pendingPayments": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "month": 4,
      "year": 2026,
      "basicSalary": 40000,
      "allowances": {
        "houseRent": 10000
      },
      "deductions": {
        "tax": 5000
      },
      "netSalary": 45000,
      "paymentStatus": "payment_initiated",
      "paymentOrderId": "order_IHtMvFHhWpZq8b",
      "paymentInitiatedAt": "2026-05-01T10:30:00Z",
      "paymentDueDate": "2026-05-08T10:30:00Z"
    }
  ],
  "total": 3,
  "totalAmount": 135000
}
```

#### 2. Confirm Payment
**POST** `/api/salary-payment/confirm`

**Request:**
```json
{
  "salaryId": "507f1f77bcf86cd799439011",
  "paymentId": "pay_IHtMvFHhWpZq8b",
  "signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}
```

**Response:**
```json
{
  "message": "Salary payment completed successfully",
  "salary": {
    "_id": "507f1f77bcf86cd799439011",
    "paymentStatus": "paid",
    "paymentDate": "2026-05-01T10:40:00Z",
    "paymentId": "pay_IHtMvFHhWpZq8b"
  }
}
```

#### 3. Get Payment Details
**GET** `/api/salary-payment/{salaryId}/details`

---

## Database Schema Changes

### Salary Model Updates

New fields added to salary schema:

```javascript
{
  // ... existing fields ...
  
  // Payment tracking
  paymentOrderId: String,           // Razorpay order ID
  paymentId: String,                // Razorpay payment ID
  paymentSignature: String,         // Payment verification signature
  paymentInitiatedAt: Date,         // When HR initiated payment
  paymentInitiatedBy: ObjectId,     // HR who initiated
  paymentApprovedAt: Date,          // When employee confirmed
  paymentDueDate: Date,             // Payment deadline
  failureReason: String             // If payment failed
}
```

### Payment Statuses

- `pending` - Salary created, not yet processed
- `processed` - HR has calculated salary
- `payment_pending` - Waiting for HR to initiate
- `payment_initiated` - HR has created Razorpay order, awaiting employee confirmation
- `paid` - Payment successfully completed
- `failed` - Payment failed or cancelled

---

## Frontend Components

### 1. InitiateSalaryPayment Component
Used by HR to initiate salary payments.

**Props:**
- `onSuccess` (function) - Called after successful payment initiation

**Usage:**
```jsx
import InitiateSalaryPayment from '../components/InitiateSalaryPayment';

<InitiateSalaryPayment onSuccess={() => console.log('Payment initiated')} />
```

**Features:**
- Select multiple salaries
- Bulk payment initiation
- Real-time amount calculation
- Payment status tracking

### 2. ConfirmSalaryPayment Component
Used by employees to confirm and complete payments.

**Props:**
- `onPaymentSuccess` (function) - Called after successful payment

**Usage:**
```jsx
import ConfirmSalaryPayment from '../components/ConfirmSalaryPayment';

<ConfirmSalaryPayment onPaymentSuccess={(salary) => console.log(salary)} />
```

**Features:**
- View pending payments
- Complete payment via Razorpay
- Salary breakdown display
- Payment status indicators

---

## Step-by-Step Usage Guide

### For HR Admin

**Step 1: Process Salaries**
```
Dashboard → Salary Management → Process Salary
- Enter month/year
- Calculate salary for employees
- Click "Process"
```

**Step 2: Initiate Payments**
```
Dashboard → Salary Management → Initiate Payments
- View all processed salaries
- Select employees to pay
- Click "Initiate Payments"
- Confirm action
```

**Step 3: Monitor Payments**
```
Dashboard → Salary Management → Payment Status
- View initiated payments
- Track completion status
- See payment statistics
```

### For Employees

**Step 1: View Pending Payments**
```
Dashboard → My Salary → Pending Payments
- See all salary payments initiated by HR
- View amount and due date
```

**Step 2: Complete Payment**
```
- Click "Complete Payment" button
- Razorpay checkout opens
- Enter card/UPI details
- Verify OTP
- Payment completes
```

**Step 3: Payment Confirmation**
```
- Get notification of payment success
- Salary marked as "Paid"
- Receipt available in payment history
```

---

## Real-Time Notifications (Socket.io)

### Events Emitted

**From Server to Employee:**
```javascript
// When HR initiates payment
io.to(`user_${employeeId}`).emit('salaryPaymentInitiated', {
  message: 'Your salary payment has been initiated',
  salaryId: '...',
  amount: 50000,
  orderId: '...'
});

// When payment is cancelled
io.to(`user_${employeeId}`).emit('salaryPaymentCancelled', {
  message: 'Your salary payment has been cancelled',
  reason: 'Need to adjust amount'
});
```

**From Server to HR:**
```javascript
// When employee completes payment
io.to('hr_department').emit('salaryPaymentCompleted', {
  message: 'Salary payment completed',
  salaryId: '...',
  employeeId: '...',
  amount: 50000
});
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "No processed salaries found" | No salaries in processed status | Process salaries first |
| "Salary already paid" | Trying to re-initiate paid salary | Check status before initiating |
| "Invalid payment signature" | Signature verification failed | Contact support |
| "Payment verification failed" | Razorpay verification error | Retry payment |

---

## Security Features

✅ **Signature Verification** - All payments verified with Razorpay signature
✅ **User Authorization** - Employees can only confirm their own payments
✅ **Role-Based Access** - Only HR can initiate payments
✅ **Activity Logging** - All payment actions logged
✅ **Transaction Integrity** - All payment details stored securely

---

## Testing Paymentss

### Test with Razorpay Test Card

**Card Details:**
- Number: `4111 1111 1111 1111`
- Expiry: Any future date (e.g., 12/25)
- CVV: Any 3 digits (e.g., 123)
- OTP: `123456`

**Payment Result:** ✅ Success

### Testing Scenarios

1. **Successful Payment:**
   - Select salaries → Initiate → Confirm → Complete payment with test card

2. **Failed Payment:**
   - Use declined card number or wrong OTP

3. **Cancellation:**
   - HR cancels pending payment → Employee notified

---

## Best Practices

1. **Regular Payment Runs** - Process salaries monthly, initiate payments on fixed date
2. **Set Due Dates** - Give employees 1-2 weeks to confirm payment
3. **Monitor Pending** - Follow up on unconfirmed payments before due date
4. **Keep Records** - Maintain payment transaction records for audit
5. **Backup Plan** - Have manual payment method as fallback

---

## Troubleshooting

### Payment Not Showing for Employee
- Check if HR initiated the payment
- Verify employee ID is correct
- Check if salary is in "payment_initiated" status
- Refresh browser

### Payment Fails After Completion
- Verify internet connection during payment
- Check Razorpay account status
- Contact Razorpay support if issue persists

### Employee Can't Find Salary
- Ensure salary is processed first
- Check month/year is correct
- Verify employee role is set correctly

---

## Support & Resources

- Razorpay Documentation: https://razorpay.com/docs/
- Socket.io Events: Check server logs for event emissions
- Database Queries: Use MongoDB Compass for salary record inspection

