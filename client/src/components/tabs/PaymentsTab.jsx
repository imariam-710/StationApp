import React from 'react';
import { useSelector } from 'react-redux';
import { Table } from 'reactstrap';
import { PAYMENT_TYPES, totalPayments, dailyPaymentTotals, fmt } from '../../utils/calc.js';

export default function PaymentsTab() {
  const grades = useSelector((s) => s.ledger.data?.grades) || [];
  const dailySales = useSelector((s) => s.ledger.data?.dailySales) || [];
  const totals = totalPayments(dailySales, grades);
  const byDay = dailyPaymentTotals(dailySales, grades);

  return (
    <div>
      <h4 className="mb-1">Payments</h4>
      <p className="text-muted small mb-3">
        This is filled in automatically from the litres and payment method entered for each
        sale on the <strong>Daily Sales</strong> tab — nothing to enter here. A day can have
        several sales split across different payment methods, so this is totaled per payment
        method rather than per fuel. (Tank stock lives on its own <strong>Tank Stock</strong> tab.)
      </p>

      <h6 className="fw-bold mt-4 mb-2">Payment breakdown by day</h6>
      <div className="table-responsive">
        <Table bordered className="bg-white align-middle mb-2">
          <thead className="table-light">
            <tr>
              <th style={{ width: 130 }}>Date</th>
              {PAYMENT_TYPES.map((p) => (
                <th key={p.key} className="text-end">{p.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byDay.map((row, i) => (
              <tr key={i}>
                <td className="text-muted small">{row.date || '—'}</td>
                {PAYMENT_TYPES.map((p) => (
                  <td key={p.key} className="text-end mono">
                    {row[p.key] ? fmt(row[p.key]) : <span className="text-muted">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <h6 className="fw-bold mt-4 mb-2">Totals by payment method</h6>
      <div className="table-responsive">
        <Table bordered className="bg-white align-middle mb-2">
          <thead className="table-light">
            <tr>
              {PAYMENT_TYPES.map((p) => (
                <th key={p.key} className="text-end">{p.label}</th>
              ))}
              <th className="text-end">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="fw-bold">
              {PAYMENT_TYPES.map((p) => (
                <td key={p.key} className="text-end mono">{fmt(totals[p.key])}</td>
              ))}
              <td className="text-end mono">
                {fmt(PAYMENT_TYPES.reduce((sum, p) => sum + (totals[p.key] || 0), 0))}
              </td>
            </tr>
          </tbody>
        </Table>
      </div>
    </div>
  );
}