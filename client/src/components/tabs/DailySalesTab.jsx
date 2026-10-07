import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button } from 'reactstrap';
import {
  addEntry, updateEntry, deleteEntry, updateGrade,
} from '../../features/ledger/ledgerSlice.js';
import {
  FUEL_KEYS, PAYMENT_TYPES, totalLiters, revenueByGrade, dailyRunningStock, n, fmt,
} from '../../utils/calc.js';

const FUEL_LABELS = {
  super: 'Super',
  regular: 'Regular',
  diesel: 'Diesel',
  vpower: 'V-Power',
};

function todayMonthStr() {
  return new Date().toISOString().slice(0, 7);
}
function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

// Default the visible page to today's date when viewing the current
// calendar month, otherwise to day 1 of the month being viewed — same as
// opening the station's Excel ledger to today's sheet tab.
function defaultDayIndex(dailySales, currentMonth) {
  if (currentMonth === todayMonthStr()) {
    const idx = dailySales.findIndex((d) => d.date === todayDateStr());
    if (idx >= 0) return idx;
  }
  return 0;
}

function dayLabel(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DailySalesTab() {
  const dispatch = useDispatch();
  const grades = useSelector((s) => s.ledger.data?.grades) || [];
  const dailySales = useSelector((s) => s.ledger.data?.dailySales) || [];
  const currentMonth = useSelector((s) => s.ledger.currentMonth);

  const [dayIndex, setDayIndex] = useState(() => defaultDayIndex(dailySales, currentMonth));

  // Jump back to today's page whenever the viewed month changes (switching
  // months, or the very first load) — matches opening the Excel ledger to
  // today's day-tab.
  useEffect(() => {
    setDayIndex(defaultDayIndex(dailySales, currentMonth));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  const liters = totalLiters(dailySales);
  const revenue = revenueByGrade(dailySales, grades);
  const grandRevenue = FUEL_KEYS.reduce((sum, k) => sum + (revenue[k] || 0), 0);
  const running = dailyRunningStock(grades, dailySales);

  const lastIndex = Math.max(dailySales.length - 1, 0);
  const clampedIndex = Math.min(Math.max(dayIndex, 0), lastIndex);
  const day = dailySales[clampedIndex] || { date: '', entries: [] };
  const entries = day.entries || [];
  const remaining = running[clampedIndex]?.remaining || {};
  const isToday = currentMonth === todayMonthStr() && day.date === todayDateStr();

  const goTo = (idx) => setDayIndex(Math.min(Math.max(idx, 0), lastIndex));

  return (
    <div>
      <h4 className="mb-1">Daily pump sales</h4>
      <p className="text-muted small mb-3">
        One page per day of the month, just like the station's Excel ledger (Day 1, Day 2, Day 3
        …). Set this month's cash and card price per litre for each fuel below — they're often
        different. For the day shown, add one row per sale; the same fuel can appear more than
        once if it was sold via different payment methods (or just sold several times). Each sale
        automatically uses whatever cash/card price is set above at the moment it's added —
        <strong> changing the price above only affects new sales from now on, not ones already
        entered</strong>. Amounts flow straight into the <strong>Payments</strong> tab, and
        remaining tank stock below updates automatically.
      </p>

      <div className="d-flex flex-wrap gap-3 mb-4">
        {grades.map((g, i) => (
          <div key={g.key} className="border rounded bg-white px-3 py-2">
            <div className="fw-semibold small mb-2">{g.name}</div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="text-muted small" style={{ width: 62 }}>Cash /L</span>
              <input
                type="number" step="any" className="form-control form-control-sm text-end"
                style={{ width: 90 }}
                value={g.priceCash || 0}
                onChange={(e) => dispatch(updateGrade({ index: i, field: 'priceCash', value: e.target.value }))}
              />
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small" style={{ width: 62 }}>Card /L</span>
              <input
                type="number" step="any" className="form-control form-control-sm text-end"
                style={{ width: 90 }}
                value={g.priceCard || 0}
                onChange={(e) => dispatch(updateGrade({ index: i, field: 'priceCard', value: e.target.value }))}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Button color="primary" outline size="sm" onClick={() => goTo(clampedIndex - 1)} disabled={clampedIndex <= 0}>
          &lsaquo; Prev day
        </Button>
        <select
          className="form-select form-select-sm"
          style={{ width: 'auto' }}
          value={clampedIndex}
          onChange={(e) => goTo(+e.target.value)}
        >
          {dailySales.map((d, i) => {
            const todays = currentMonth === todayMonthStr() && d.date === todayDateStr();
            return (
              <option key={i} value={i}>
                Day {i + 1} — {dayLabel(d.date)}{todays ? ' (today)' : ''}
              </option>
            );
          })}
        </select>
        <Button color="primary" outline size="sm" onClick={() => goTo(clampedIndex + 1)} disabled={clampedIndex >= lastIndex}>
          Next day &rsaquo;
        </Button>
        <Button color="success" outline size="sm" onClick={() => goTo(defaultDayIndex(dailySales, currentMonth))}>
          Today
        </Button>
      </div>

      <h5 className="mb-2">
        Day {clampedIndex + 1} — {dayLabel(day.date)}{isToday && <span className="badge bg-success ms-2">Today</span>}
      </h5>

      <div className="table-responsive">
        <Table bordered className="bg-white align-middle mb-2">
          <thead className="table-light">
            <tr>
              <th style={{ width: 160 }}>Fuel</th>
              <th className="text-end" style={{ width: 100 }}>Litres</th>
              <th style={{ width: 150 }}>Paid via</th>
              <th className="text-end" style={{ width: 120 }}>Amount</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {(entries.length ? entries : [null]).map((entry, ei) => {
              const amount = entry ? n(entry.liters) * n(entry.price) : 0;
              return (
                <tr key={ei}>
                  {entry ? (
                    <>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          value={entry.fuel}
                          onChange={(e) => dispatch(updateEntry({ dayIndex: clampedIndex, entryIndex: ei, field: 'fuel', value: e.target.value }))}
                        >
                          {FUEL_KEYS.map((k) => (
                            <option key={k} value={k}>{FUEL_LABELS[k]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="text-end">
                        <input
                          type="number" step="any" className="form-control form-control-sm text-end"
                          value={entry.liters || 0}
                          onChange={(e) => dispatch(updateEntry({ dayIndex: clampedIndex, entryIndex: ei, field: 'liters', value: e.target.value }))}
                        />
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          value={entry.paymentType}
                          onChange={(e) => dispatch(updateEntry({ dayIndex: clampedIndex, entryIndex: ei, field: 'paymentType', value: e.target.value }))}
                        >
                          {PAYMENT_TYPES.map((p) => (
                            <option key={p.key} value={p.key}>{p.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="text-end mono text-muted">{fmt(amount)}</td>
                      <td className="text-center">
                        <Button close aria-label="Delete sale" onClick={() => dispatch(deleteEntry({ dayIndex: clampedIndex, entryIndex: ei }))} />
                      </td>
                    </>
                  ) : (
                    <td colSpan={4} className="text-muted small fst-italic">
                      No sales entered for this day yet.
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
      <Button
        color="link" size="sm" className="p-0 text-decoration-none mb-4"
        onClick={() => dispatch(addEntry({ dayIndex: clampedIndex }))}
      >
        + Add sale for this day
      </Button>

      <h6 className="fw-bold mb-2">Remaining in tank stock — end of day {clampedIndex + 1}</h6>
      <div className="table-responsive mb-4">
        <Table bordered className="bg-white align-middle" style={{ maxWidth: 560 }}>
          <thead className="table-light">
            <tr>
              {grades.map((g) => <th key={g.key} className="text-end">{g.name}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              {grades.map((g) => (
                <td key={g.key} className="text-end mono">{fmt(remaining[g.key], 0)}</td>
              ))}
            </tr>
          </tbody>
        </Table>
      </div>

      <h6 className="fw-bold mb-2">Totals this month</h6>
      <div className="table-responsive">
        <Table bordered className="bg-white align-middle" style={{ maxWidth: 560 }}>
          <thead className="table-light">
            <tr>
              <th>Fuel</th>
              <th className="text-end">Litres Sold</th>
              <th className="text-end">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {FUEL_KEYS.map((k) => (
              <tr key={k}>
                <td>{FUEL_LABELS[k]}</td>
                <td className="text-end mono">{fmt(liters[k], 0)}</td>
                <td className="text-end mono">{fmt(revenue[k])}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="fw-bold table-light">
              <td>Total</td>
              <td className="text-end mono">{fmt(FUEL_KEYS.reduce((s, k) => s + (liters[k] || 0), 0), 0)}</td>
              <td className="text-end mono">{fmt(grandRevenue)}</td>
            </tr>
          </tfoot>
        </Table>
      </div>
    </div>
  );
}
