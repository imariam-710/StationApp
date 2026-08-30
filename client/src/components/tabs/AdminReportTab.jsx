import React from 'react';
import { useSelector } from 'react-redux';
import { Table, Button, Alert } from 'reactstrap';
import {
  revenueByGrade, fuelProfitByGrade, fuelProfitTotal, buyAmountByGrade, totalLiters,
  oilProfitTotal, oilCashTotal, oilCardTotal, deductionsTotal, expensesTotal,
  stockLossByGrade, stockLossTotal, cardReductionByGrade, cardReductionTotal,
  n, fmt, monthLabel,
} from '../../utils/calc.js';
import { downloadAdminReportPDF } from '../../utils/pdfReport.js';

export default function AdminReportTab() {
  const user = useSelector((s) => s.auth.user);
  const data = useSelector((s) => s.ledger.data);
  const currentMonth = useSelector((s) => s.ledger.currentMonth);
  const stationName = useSelector((s) => s.ledger.stationName);

  if (user?.role !== 'admin') {
    return (
      <Alert color="warning" className="mb-0">
        This report is only available to admin accounts.
      </Alert>
    );
  }

  if (!data) return null;

  const grades = data.grades || [];
  const liters = totalLiters(data.dailySales);
  const revenue = revenueByGrade(data.dailySales, grades);
  const buyAmount = buyAmountByGrade(grades, data.dailySales);
  const profitByGrade = fuelProfitByGrade(grades, data.dailySales);
  const fuel = fuelProfitTotal(grades, data.dailySales);
  const oil = oilProfitTotal(data.oilProducts);
  const oilCash = oilCashTotal(data.oilProducts);
  const oilCard = oilCardTotal(data.oilProducts);
  const ded = deductionsTotal(data.deductions);
  const exp = expensesTotal(data.expenses);
  const lossByGrade = stockLossByGrade(grades, data.dailySales);
  const evaporationLoss = stockLossTotal(grades, data.dailySales);
  const cardReductionByGradeMap = cardReductionByGrade(grades, data.dailySales);
  const cardReduction = cardReductionTotal(grades, data.dailySales);
  const totalProfitPlusOil = fuel + oil;
  const totalLosses = ded + exp + cardReduction;
  const net = totalProfitPlusOil - totalLosses;
  const partners = data.partners || 1;

  const buyAmountTotal = grades.reduce((s, g) => s + (buyAmount[g.key] || 0), 0);
  const revenueTotal = grades.reduce((s, g) => s + (revenue[g.key] || 0), 0);
  const profitTotal = grades.reduce((s, g) => s + (profitByGrade[g.key] || 0), 0);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <h4 className="mb-0">Admin Report — {monthLabel(currentMonth)}</h4>
        <Button
          color="primary"
          outline
          size="sm"
          onClick={() => downloadAdminReportPDF({ stationName, currentMonth, data })}
        >
          ⬇ Download PDF
        </Button>
      </div>
      <p className="text-muted small mb-4">
        Full cost breakdown — buying prices and margins included. Visible to admin accounts only.
      </p>

      <h6 className="fw-bold mb-2">Fuel cost &amp; margin by grade</h6>
      <div className="table-responsive mb-4">
        <Table bordered className="bg-white align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Grade</th>
              <th className="text-end">Litres Sold</th>
              <th className="text-end">Buy Price /L</th>
              <th className="text-end">Buying Amount</th>
              <th className="text-end">Selling Amount</th>
              <th className="text-end">Profit</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((g) => (
              <tr key={g.key}>
                <td>{g.name}</td>
                <td className="text-end mono">{fmt(liters[g.key], 0)}</td>
                <td className="text-end mono">{fmt(g.buy)}</td>
                <td className="text-end mono">{fmt(buyAmount[g.key])}</td>
                <td className="text-end mono">{fmt(revenue[g.key])}</td>
                <td className="text-end mono">{fmt(profitByGrade[g.key])}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="fw-bold table-light">
              <td colSpan={3}>Total</td>
              <td className="text-end mono">{fmt(buyAmountTotal)}</td>
              <td className="text-end mono">{fmt(revenueTotal)}</td>
              <td className="text-end mono">{fmt(profitTotal)}</td>
            </tr>
          </tfoot>
        </Table>
      </div>

      <h6 className="fw-bold mb-2">Deductions</h6>
      <div className="table-responsive mb-4">
        <Table bordered className="bg-white align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Description</th>
              <th className="text-end">Litres</th>
              <th className="text-end">Rate</th>
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
                  <td className="text-end mono">{n(r.liters) ? fmt(r.liters, 0) : '—'}</td>
                  <td className="text-end mono">{n(r.rate) ? fmt(r.rate) : '—'}</td>
                  <td className="text-end mono">{fmt(amt)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="fw-bold table-light">
              <td colSpan={3}>Total</td>
              <td className="text-end mono">{fmt(ded)}</td>
            </tr>
          </tfoot>
        </Table>
      </div>

      <h6 className="fw-bold mb-2">Card reduction</h6>
      <p className="text-muted small mb-2">
        Applied to litres sold via <strong>Card</strong> payment this month, per grade. Rate is
        fully automatic — it's the card price minus the cash price for that grade (the premium
        charged on card sales), pulled straight from <strong>Daily Sales</strong> / <strong>Fuel Margin</strong>.
      </p>
      <div className="table-responsive mb-4">
        <Table bordered className="bg-white align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Grade</th>
              <th className="text-end">Litres</th>
              <th className="text-end">Rate (card − cash)</th>
              <th className="text-end">Amount</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((g) => {
              const c = cardReductionByGradeMap[g.key] || { litres: 0, rate: 0, amount: 0 };
              return (
                <tr key={g.key}>
                  <td>{g.name}</td>
                  <td className="text-end mono">{fmt(c.litres, 0)}</td>
                  <td className="text-end mono text-muted">{fmt(c.rate)}</td>
                  <td className="text-end mono">{fmt(c.amount)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="fw-bold table-light">
              <td colSpan={3}>Total</td>
              <td className="text-end mono">{fmt(cardReduction)}</td>
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

      <h6 className="fw-bold mb-2">Evaporation &amp; leakage loss</h6>
      <div className="table-responsive mb-4">
        <Table bordered className="bg-white align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Grade</th>
              <th className="text-end">Book Stock (L)</th>
              <th className="text-end">Actual Stock (L)</th>
              <th className="text-end">Loss (L)</th>
              <th className="text-end">Rate (buy price)</th>
              <th className="text-end">Value</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((g) => {
              const l = lossByGrade[g.key] || { book: 0, actual: 0, litres: 0, value: 0 };
              return (
                <tr key={g.key}>
                  <td>{g.name}</td>
                  <td className="text-end mono">{fmt(l.book, 0)}</td>
                  <td className="text-end mono">{fmt(l.actual, 0)}</td>
                  <td className="text-end mono">{fmt(l.litres, 0)}</td>
                  <td className="text-end mono">{fmt(g.buy)}</td>
                  <td className="text-end mono">{fmt(l.value)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="fw-bold table-light">
              <td colSpan={5}>Total loss value</td>
              <td className="text-end mono">{fmt(evaporationLoss)}</td>
            </tr>
          </tfoot>
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

      <h6 className="fw-bold mb-2">Summary</h6>
      <div className="table-responsive">
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
              <td>Deductions</td>
              <td className="text-end mono">{fmt(ded)}</td>
            </tr>
            <tr>
              <td>Card reduction</td>
              <td className="text-end mono">{fmt(cardReduction)}</td>
            </tr>
            <tr>
              <td>Expenses</td>
              <td className="text-end mono">{fmt(exp)}</td>
            </tr>
            <tr className="table-light">
              <td className="fw-semibold">Total losses</td>
              <td className="text-end mono fw-semibold">{fmt(totalLosses)}</td>
            </tr>
            <tr className="fw-bold table-light">
              <td>Net profit</td>
              <td className="text-end mono">{fmt(net)}</td>
            </tr>
            <tr className="fw-bold">
              <td>Per one partner profit ({partners} partner(s))</td>
              <td className="text-end mono">{fmt(net / partners)}</td>
            </tr>
          </tbody>
        </Table>
      </div>
    </div>
  );
}