import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button } from 'reactstrap';
import {
  updateDayPumpReading, updateDayShellCardLiters, updateDayField,
} from '../../features/ledger/ledgerSlice.js';
import {
  FUEL_KEYS, dailyPumpSalesLiters, dailyPaymentTotals, dailyRunningStock, n, fmt,
} from '../../utils/calc.js';

const FUEL_LABELS = {
  super: 'Super',
  regular: 'Regular',
  diesel: 'Diesel',
  vpower: 'V/Power',
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
  const monthlyPumps = useSelector((s) => s.ledger.data?.pumps) || [];
  const currentMonth = useSelector((s) => s.ledger.currentMonth);

  const [dayIndex, setDayIndex] = useState(() => defaultDayIndex(dailySales, currentMonth));

  // Jump back to today's page whenever the viewed month changes (switching
  // months, or the very first load) — matches opening the Excel ledger to
  // today's day-tab.
  useEffect(() => {
    setDayIndex(defaultDayIndex(dailySales, currentMonth));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  const lastIndex = Math.max(dailySales.length - 1, 0);
  const clampedIndex = Math.min(Math.max(dayIndex, 0), lastIndex);
  const day = dailySales[clampedIndex] || {
    date: '', pumps: [], shellCardLiters: {}, subsidyAmount: 0, siteCredit: 0, other: 0,
    telephoneCard: 0, visaCard: 0,
  };
  const dayPumps = day.pumps || [];
  const shellCardLiters = day.shellCardLiters || {};
  const isToday = currentMonth === todayMonthStr() && day.date === todayDateStr();

  const priceByFuel = {};
  grades.forEach((g) => { priceByFuel[g.key] = n(g.priceCash); });

  const pumpSales = dailyPumpSalesLiters(dailySales, monthlyPumps);
  const dayPumpResult = pumpSales[clampedIndex] || { totals: {}, liters: {} };

  const amountByFuel = {};
  FUEL_KEYS.forEach((k) => { amountByFuel[k] = (dayPumpResult.liters[k] || 0) * (priceByFuel[k] || 0); });

  const dayPayments = dailyPaymentTotals(dailySales, grades, monthlyPumps)[clampedIndex] || {
    cash: 0, card: 0, subsidy: 0, siteCredit: 0, chitties: 0, telephoneCard: 0, totalSale: 0,
  };
  const cashToBank = Math.max(dayPayments.cash - n(day.visaCard), 0);

  const running = dailyRunningStock(grades, dailySales, monthlyPumps);
  const remaining = running[clampedIndex]?.remaining || {};

  const goTo = (idx) => setDayIndex(Math.min(Math.max(idx, 0), lastIndex));

  return (
    <div>
      <h4 className="mb-1">Daily pump sales</h4>
      <p className="text-muted small mb-3">
        One page per day of the month, just like the station's Excel ledger (Day 1, Day 2, Day 3
        …). Everything highlighted is filled in by hand, same as the paper sheet's yellow cells;
        everything else is calculated for you. Cash/card prices are set on the{' '}
        <strong>Fuel Margin</strong> tab.
      </p>

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

      <div className="table-responsive mb-0">
        <Table bordered className="bg-white align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: 90 }}>Pump No</th>
              {FUEL_KEYS.map((k) => <th key={k} className="text-end">{FUEL_LABELS[k]}</th>)}
            </tr>
          </thead>
          <tbody>
            {dayPumps.map((p, pi) => (
              <tr key={p.pumpNo}>
                <td className="fw-semibold">{p.pumpNo}</td>
                {FUEL_KEYS.map((k) => (
                  <td key={k} className="text-end">
                    <input
                      type="number" step="any" className="form-control form-control-sm text-end bg-warning-subtle"
                      value={p[k] || 0}
                      onChange={(e) => dispatch(updateDayPumpReading({ dayIndex: clampedIndex, pumpIndex: pi, fuel: k, value: e.target.value }))}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr className="table-light fw-bold">
              <td>Total</td>
              {FUEL_KEYS.map((k) => (
                <td key={k} className="text-end mono">{fmt(dayPumpResult.totals[k], 0)}</td>
              ))}
            </tr>
            <tr>
              <td className="fw-semibold">Sales Lt.</td>
              {FUEL_KEYS.map((k) => (
                <td key={k} className="text-end mono text-muted">{fmt(dayPumpResult.liters[k], 0)}</td>
              ))}
            </tr>
            <tr>
              <td className="fw-semibold">Amount</td>
              {FUEL_KEYS.map((k) => (
                <td key={k} className="text-end mono text-muted">{fmt(amountByFuel[k])}</td>
              ))}
            </tr>
            <tr>
              <td className="fw-semibold">Shell card (Lt.)</td>
              {FUEL_KEYS.map((k) => (
                <td key={k} className="text-end">
                  <input
                    type="number" step="any" className="form-control form-control-sm text-end bg-warning-subtle"
                    value={shellCardLiters[k] || 0}
                    onChange={(e) => dispatch(updateDayShellCardLiters({ dayIndex: clampedIndex, fuel: k, value: e.target.value }))}
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </Table>
      </div>
      <p className="text-muted small mb-4">
        Enter each pump's meter reading per fuel — Total, Sales Lt. and Amount are calculated for
        you. Shell card (Lt.) is the litres sold via Shell fleet card this day, entered by hand.
      </p>

      <h6 className="fw-bold mb-2">Payment breakdown — day {clampedIndex + 1}</h6>
      <div className="table-responsive mb-2">
        <Table bordered className="bg-white align-middle" style={{ maxWidth: 420 }}>
          <tbody>
            <tr className="fw-bold table-light">
              <td>Total sale</td>
              <td className="text-end mono">{fmt(dayPayments.totalSale)}</td>
            </tr>
            <tr>
              <td>Sub</td>
              <td className="text-end">
                <input
                  type="number" step="any" className="form-control form-control-sm text-end bg-warning-subtle"
                  value={day.subsidyAmount || 0}
                  onChange={(e) => dispatch(updateDayField({ dayIndex: clampedIndex, field: 'subsidyAmount', value: e.target.value }))}
                />
              </td>
            </tr>
            <tr>
              <td>Shell card credit</td>
              <td className="text-end mono text-muted">{fmt(dayPayments.card)}</td>
            </tr>
            <tr>
              <td>Site credit</td>
              <td className="text-end">
                <input
                  type="number" step="any" className="form-control form-control-sm text-end bg-warning-subtle"
                  value={day.siteCredit || 0}
                  onChange={(e) => dispatch(updateDayField({ dayIndex: clampedIndex, field: 'siteCredit', value: e.target.value }))}
                />
              </td>
            </tr>
            <tr>
              <td>Other</td>
              <td className="text-end">
                <input
                  type="number" step="any" className="form-control form-control-sm text-end bg-warning-subtle"
                  value={day.other || 0}
                  onChange={(e) => dispatch(updateDayField({ dayIndex: clampedIndex, field: 'other', value: e.target.value }))}
                />
              </td>
            </tr>
            <tr>
              <td>Telephone card</td>
              <td className="text-end">
                <input
                  type="number" step="any" className="form-control form-control-sm text-end bg-warning-subtle"
                  value={day.telephoneCard || 0}
                  onChange={(e) => dispatch(updateDayField({ dayIndex: clampedIndex, field: 'telephoneCard', value: e.target.value }))}
                />
              </td>
            </tr>
            <tr>
              <td>Cash</td>
              <td className="text-end mono text-muted">{fmt(dayPayments.cash)}</td>
            </tr>
            <tr>
              <td>Visa card</td>
              <td className="text-end">
                <input
                  type="number" step="any" className="form-control form-control-sm text-end bg-warning-subtle"
                  value={day.visaCard || 0}
                  onChange={(e) => dispatch(updateDayField({ dayIndex: clampedIndex, field: 'visaCard', value: e.target.value }))}
                />
              </td>
            </tr>
            <tr>
              <td>Cash to bank</td>
              <td className="text-end mono text-muted">{fmt(cashToBank)}</td>
            </tr>
          </tbody>
        </Table>
      </div>
      <p className="text-muted small mb-4">
        Total sale, Shell card credit, Cash and Cash to bank are calculated for you. Sub, Site
        credit, Other, Telephone card and Visa card are entered by hand, same as the station's own
        ledger — <strong>Cash</strong> is whatever's left of the Total sale once those are taken
        out, same as counting the till.
      </p>

      <h6 className="fw-bold mb-2">Tank stock — end of day {clampedIndex + 1}</h6>
      <div className="table-responsive">
        <Table bordered className="bg-white align-middle" style={{ maxWidth: 420 }}>
          <tbody>
            {grades.map((g) => (
              <tr key={g.key}>
                <td className="fw-semibold">{g.name}</td>
                <td className="text-end mono">{fmt(remaining[g.key], 0)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
