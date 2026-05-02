import crypto from 'crypto';
import { User } from '../models/User.js';

const API_BASE = 'https://api.razorpay.com';

function getCredentials() {
  const keyId = process.env.RAZORPAYX_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAYX_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
  const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;
  return { keyId, keySecret, accountNumber };
}

export function isPayoutModeEnabled() {
  const { keyId, keySecret, accountNumber } = getCredentials();
  return Boolean(keyId && keySecret && accountNumber);
}

function authHeader() {
  const { keyId, keySecret } = getCredentials();
  const token = Buffer.from(`${keyId}:${keySecret}`, 'utf8').toString('base64');
  return `Basic ${token}`;
}

async function razorpayRequest(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data.error?.description ||
      data.error?.reason ||
      data.message ||
      `Razorpay API error (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export function resolveEmployeeBank(salary, employee) {
  const fromSalary = {
    accountNumber: (salary.payoutAccountNumber || '').replace(/\s/g, ''),
    ifsc: (salary.payoutIfsc || '').trim().toUpperCase(),
    accountHolderName: (salary.payoutAccountName || '').trim()
  };
  if (fromSalary.accountNumber && fromSalary.ifsc && fromSalary.accountHolderName) {
    return fromSalary;
  }

  const bd = employee.bankDetails;
  if (bd?.accountNumber && bd?.ifsc) {
    return {
      accountNumber: String(bd.accountNumber).replace(/\s/g, ''),
      ifsc: String(bd.ifsc).trim().toUpperCase(),
      accountHolderName: (bd.accountHolderName || employee.name || '').trim()
    };
  }
  return null;
}

async function createContact(employee, bank) {
  const phoneRaw = (employee.profile?.phone || '').replace(/\D/g, '');
  const payload = {
    name: bank.accountHolderName || employee.name,
    email: employee.email,
    type: 'employee',
    reference_id: employee._id.toString()
  };
  if (phoneRaw.length >= 10) {
    payload.contact = `+91${phoneRaw.slice(-10)}`;
  }
  return razorpayRequest('POST', '/v1/contacts', payload);
}

async function createFundAccount(contactId, bank) {
  return razorpayRequest('POST', '/v1/fund_accounts', {
    contact_id: contactId,
    account_type: 'bank_account',
    bank_account: {
      name: bank.accountHolderName,
      ifsc: bank.ifsc,
      account_number: bank.accountNumber
    }
  });
}

/**
 * Ensures RazorpayX contact + fund account for employee bank credits.
 * Caches IDs on User when bank identity is unchanged.
 */
export async function ensureContactAndFundAccount(employee, bank) {
  const bankKey = `${bank.ifsc}|${bank.accountNumber}`;
  let contactId = employee.razorpayContactId;
  let fundAccountId = employee.razorpayFundAccountId;

  if (!contactId) {
    const contact = await createContact(employee, bank);
    contactId = contact.id;
    await User.findByIdAndUpdate(employee._id, { razorpayContactId: contactId });
  }

  if (employee.payoutBankKey !== bankKey || !fundAccountId) {
    const fa = await createFundAccount(contactId, bank);
    fundAccountId = fa.id;
    await User.findByIdAndUpdate(employee._id, {
      razorpayFundAccountId: fundAccountId,
      payoutBankKey: bankKey
    });
  }

  return { contactId, fundAccountId };
}

/**
 * Push salary amount from RazorpayX business account to employee bank (IMPS).
 */
export async function createSalaryPayout({
  fundAccountId,
  amountRupee,
  referenceId,
  narration
}) {
  const { accountNumber } = getCredentials();
  const amountPaise = Math.round(Number(amountRupee) * 100);
  if (amountPaise < 100) {
    throw new Error('Payout amount must be at least ₹1');
  }

  const idempotencyKey =
    crypto.randomUUID?.() || `sal_${referenceId}_${Date.now()}`;

  const res = await fetch(`${API_BASE}/v1/payouts`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      'X-Payout-Idempotency': idempotencyKey
    },
    body: JSON.stringify({
      account_number: accountNumber,
      fund_account_id: fundAccountId,
      amount: amountPaise,
      currency: 'INR',
      mode: 'IMPS',
      purpose: 'salary',
      queue_if_low_balance: true,
      reference_id: String(referenceId).slice(0, 40),
      narration: (narration || 'Salary').slice(0, 30)
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data.error?.description ||
      data.error?.reason ||
      data.message ||
      `Payout failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}
