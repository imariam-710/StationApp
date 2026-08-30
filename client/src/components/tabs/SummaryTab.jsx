import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button } from 'reactstrap';
import { setPartners, setCashToBank } from '../../features/ledger/ledgerSlice.js';
import {
  PAYMENT_TYPES, revenueByGrade, fuelProfitByGrade, fuelProfitTotal, totalPayments,
  oilProfitTotal, oilCashTotal, oilCardTotal, deductionsTotal, expensesTotal,
  stockLossByGrade, stockLossTotal, n, fmt, monthLabel,
} from '../../utils/calc.js';
import { downloadMonthlySummaryPDF } from '../../utils/pdfReport.js';

export default function SummaryTab() {
  const dispatch = useDispatch();
  const data = useSelector((s) => s.ledger.data);
  const currentMonth = useSelector((s) => s.ledger.currentMonth);
  const stationName = useSelector((s) => s.ledger.stationName);
  if (!data) return null;

  const grades = data.grades || [];
  const revenue = revenueByGrade(data.dailySales, grades);
  const profitByGrade = fuelProfitByGrade(grades, data.dailySales);
  const payments = totalPayments(data.dailySales, grades);
  const paymentsTotal = PAYMENT_TYPES.reduce((sum, p) => sum + (payments[p.key] || 0), 0);
  const cashToBank = n(data.cashToBank);
  const cashDifference = payments.cash - cashToBank;

  const fuel = fuelProfitTotal(grades, data.dailySales);
  const oil = oilProfitTotal(data.oilProducts);
  const oilCash = oilCashTotal(data.oilProducts);
  const oilCard = oilCardTotal(data.oilProducts);
  const ded = deductionsTotal(data.deductions);
  const exp = expensesTotal(data.expenses);

  const totalProfitPlusOil = fuel + oil;
  const lossByGrade = stockLossByGrade(grades, data.dailySales);
  const evaporationLoss = stockLossTotal(grades, data.dailySales);
  const totalLosses = ded + exp;
  const net = totalProfitPlusOil - totalLosses;
  const partners = data.partners || 1;

  const revenueTotal = grades.reduce((s, g) => s + (revenue[g.key] || 0), 0);
  const profitTotal = grades.reduce((s, g) => s + (profitByGrade[g.key] || 0), 0);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <h4 className="mb-0">Summary — {monthLabel(currentMonth)}</h4>
        <Button
          color="primary"
          outline
          size="sm"
          onClick={() => downloadMonthlySummaryPDF({ stationName, currentMonth, data })}
        >
          ⬇ Download PDF
        </Button>
      </div>
      <p className="text-muted small mb-3">Monthly report, matching the station's Excel ledger layout.</p>

      <h6 className="fw-bold mb-2">Payments received</h6>
      <div className="table-responsive mb-3">
        <Table bordered className="bg-white align-middle mb-0">
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
                <td key={p.key} className="text-end mono">{fmt(payments[p.key])}</td>
              ))}
              <td className="text-end mono table-light">{fmt(paymentsTotal)}</td>
            </tr>
          </tbody>
        </Table>
      </div>

      <div className="table-responsive mb-4">
        <Table bordered className="bg-white align-middle mb-0" style={{ maxWidth: 480 }}>
          <thead className="table-light">
            <tr>
              <th>Cash reconciliation</th>
              <th className="text-end" style={{ width: 140 }}></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cash collected</td>
              <td className="text-end mono">{fmt(payments.cash)}</td>
            </tr>
            <tr>
              <td>Cash deposited to bank</td>
              <td className="text-end">
                <input
                  type="number" step="any" min={0} value={data.cashToBank || 0}
                  className="form-control form-control-sm text-end mono"
                  onChange={(e) => dispatch(setCashToBank(e.target.value))}
                />
              </td>
            </tr>
            <tr className="fw-bold table-light">
              <td>Difference (kept on hand / short)</td>
              <td className="text-end mono">{fmt(cashDifference)}</td>
            </tr>
          </tbody>
        </Table>
      </div>
      <p className="text-muted small mb-4" style={{ marginTop: -12 }}>
        Reference only — doesn't affect profit. A positive difference is cash still on hand; a
        negative one means more was banked than collected (or a shortfall to look into).
      </p>

      <h6 className="fw-bold mb-2">Sales by grade</h6>
      <div className="table-responsive mb-4">
        <Table bordered className="bg-white align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th></th>
              {grades.map((g) => <th key={g.key} className="text-end">{g.name}</th>)}
              <th className="text-end">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="fw-semibold">Total Sale</td>
              {grades.map((g) => (
                <td key={g.key} className="text-end mono">{fmt(revenue[g.key])}</td>
              ))}
              <td className="text-end mono fw-bold">{fmt(revenueTotal)}</td>
            </tr>
            <tr>
              <td className="fw-semibold">Profit</td>
              {grades.map((g) => (
                <td key={g.key} className="text-end mono">{fmt(profitByGrade[g.key])}</td>
              ))}
              <td className="text-end mono fw-bold">{fmt(profitTotal)}</td>
            </tr>
          </tbody>
        </Table>
      </div>

      <h6 className="fw-bold mb-2">Deductions</h6>
      <div className="table-responsive mb-4">
        <Table bordered className="bg-white align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Description</th>
              <th className="text-end">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(data.deductions || []).map((r, i) => {
              const calc = n(r.liters) && n(r.rate);
              const amt = calc ? n(r.liters) * n(r.rate) : n(r.amount);
              return (
                <tr key={i}>
                  <td>{r.name || '—'}</td>
                  <td className="text-end mono">{fmt(amt)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="fw-bold table-light">
              <td>Total</td>
              <td className="text-end mono">{fmt(ded)}</td>
            </tr>
          </tfoot>
        </Table>
      </div>

      <h6 className="fw-bold mb-2">Oil &amp; lubricants</h6>
      <div className="table-responsive mb-4">
        <Table bordered className="bg-white align-middle mb-0" style={{ maxWidth: 500 }}>
          <thead className="table-light">
            <tr>
              <th className="text-end">Cash</th>
              <th className="text-end">Card</th>
              <th className="text-end">Profit</th>
            </tr>
          </thead>
          <tbody>
            <tr className="fw-bold">
              <td className="text-end mono">{fmt(oilCash)}</td>
              <td className="text-end mono">{fmt(oilCard)}</td>
              <td className="text-end mono">{fmt(oil)}</td>
            </tr>
          </tbody>
        </Table>
      </div>

      <h6 className="fw-bold mb-2">Expenses</h6>
      <div className="table-responsive mb-4">
        <Table bordered className="bg-white align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Item</th>
              <th className="text-end">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(data.expenses || []).map((r, i) => (
              <tr key={i}>
                <td>{r.name || '—'}</td>
                <td className="text-end mono">{fmt(r.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="fw-bold table-light">
              <td>Total</td>
              <td className="text-end mono">{fmt(exp)}</td>
            </tr>
          </tfoot>
        </Table>
      </div>

      <h6 className="fw-bold mb-2">Evaporation &amp; leakage loss</h6>
      <div className="table-responsive mb-4">
        <Table bordered className="bg-white align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th></th>
              {grades.map((g) => <th key={g.key} className="text-end">{g.name}</th>)}
              <th className="text-end">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="fw-semibold">Loss (L)</td>
              {grades.map((g) => (
                <td key={g.key} className="text-end mono">{fmt(lossByGrade[g.key]?.litres, 0)}</td>
              ))}
              <td></td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="fw-bold table-light">
              <td colSpan={grades.length + 1}>Total loss value</td>
              <td className="text-end mono">{fmt(evaporationLoss)}</td>
            </tr>
          </tfoot>
        </Table>
      </div>
      <p className="text-muted small mb-4" style={{ marginTop: -12 }}>
        Calculated from book stock vs. actual stock — enter actual stock readings on the
        <strong> Tank Stock</strong> tab. This is already subtracted from <strong>Total fuel profit</strong> below.
      </p>

      <h6 className="fw-bold mb-2">Summary</h6>
      <div className="table-responsive mb-3">
        <Table bordered className="bg-white align-middle mb-0" style={{ maxWidth: 480 }}>
          <tbody>
            <tr>
              <td>Total fuel profit <span className="text-muted small">(after evaporation/leakage loss)</span></td>
              <td className="text-end mono">{fmt(fuel)}</td>
            </tr>
            <tr>
              <td>Oil &amp; lubricant profit</td>
              <td className="text-end mono">{fmt(oil)}</td>
            </tr>
            <tr className="table-light">
              <td className="fw-semibold">Total profit (fuel + oil)</td>
              <td className="text-end mono fw-semibold">{fmt(totalProfitPlusOil)}</td>
            </tr>
            <tr>
              <td>Deductions (commission &amp; fees)</td>
              <td className="text-end mono">{fmt(ded)}</td>
            </tr>
            <tr>
              <td>Expenses</td>
              <td className="text-end mono">{fmt(exp)}</td>
            </tr>
            <tr className="table-light">
              <td className="fw-semibold">Total losses (deductions + expenses)</td>
              <td className="text-end mono fw-semibold">{fmt(totalLosses)}</td>
            </tr>
            <tr className="fw-bold table-light">
              <td>Net profit</td>
              <td className="text-end mono">{fmt(net)}</td>
            </tr>
            <tr className="fw-bold">
              <td>
                Per one partner profit — split between{' '}
                <input
                  type="number" min={1} step={1} value={partners}
                  className="form-control form-control-sm d-inline-block text-center mono"
                  style={{ width: 60 }}
                  onChange={(e) => dispatch(setPartners(e.target.value))}
                />{' '}
                partner(s)
              </td>
              <td className="text-end mono">{fmt(net / partners)}</td>
            </tr>
          </tbody>
        </Table>
      </div>
    </div>
  );
}