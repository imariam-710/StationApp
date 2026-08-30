import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button } from 'reactstrap';
import {
  addDailyRow, updateDailyRow, deleteDailyRow,
  addEntry, updateEntry, deleteEntry, updateGrade,
} from '../../features/ledger/ledgerSlice.js';
import { FUEL_KEYS, PAYMENT_TYPES, totalLiters, revenueByGrade, n, fmt } from '../../utils/calc.js';

const FUEL_LABELS = {
  super: 'Super',
  regular: 'Regular',
  diesel: 'Diesel',
  vpower: 'V-Power',
};

export default function DailySalesTab() {
  const dispatch = useDispatch();
  const grades = useSelector((s) => s.ledger.data?.grades) || [];
  const dailySales = useSelector((s) => s.ledger.data?.dailySales) || [];
  const liters = totalLiters(dailySales);
  const revenue = revenueByGrade(dailySales, grades);
  const grandRevenue = FUEL_KEYS.reduce((sum, k) => sum + (revenue[k] || 0), 0);

  return (
    <div>
      <h4 className="mb-1">Daily pump sales</h4>
      <p className="text-muted small mb-3">
        Set this month's cash and card price per litre for each fuel below — they're often
        different. For each day, add one row per sale; the same fuel can appear more than once
        if it was sold via different payment methods (or just sold several times). Each sale
        automatically uses whatever cash/card price is set above at the moment it's added —
        <strong> changing the price above only affects new sales from now on, not ones already
        entered</strong>. Amounts flow straight into the <strong>Payments</strong> tab.
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

      <div className="table-responsive">
        <Table bordered className="bg-white align-middle mb-2">
          <thead className="table-light">
            <tr>
              <th style={{ width: 140 }}>Date</th>
              <th style={{ width: 160 }}>Fuel</th>
              <th className="text-end" style={{ width: 100 }}>Litres</th>
              <th style={{ width: 150 }}>Paid via</th>
              <th className="text-end" style={{ width: 120 }}>Amount</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {dailySales.map((day, di) => {
              const entries = day.entries || [];
              const rowCount = Math.max(entries.length, 1);
              return (
                <React.Fragment key={di}>
                  {(entries.length ? entries : [null]).map((entry, ei) => {
                    const amount = entry ? n(entry.liters) * n(entry.price) : 0;
                    return (
                      <tr key={ei} className={ei === 0 ? 'border-top border-2' : ''}>
                        {ei === 0 && (
                          <td rowSpan={rowCount} className="align-middle">
                            <input
                              type="date"
                              className="form-control form-control-sm"
                              value={day.date || ''}
                              onChange={(e) => dispatch(updateDailyRow({ index: di, field: 'date', value: e.target.value }))}
                            />
                          </td>
                        )}
                        {entry ? (
                          <>
                            <td>
                              <select
                                className="form-select form-select-sm"
                                value={entry.fuel}
                                onChange={(e) => dispatch(updateEntry({ dayIndex: di, entryIndex: ei, field: 'fuel', value: e.target.value }))}
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
                                onChange={(e) => dispatch(updateEntry({ dayIndex: di, entryIndex: ei, field: 'liters', value: e.target.value }))}
                              />
                            </td>
                            <td>
                              <select
                                className="form-select form-select-sm"
                                value={entry.paymentType}
                                onChange={(e) => dispatch(updateEntry({ dayIndex: di, entryIndex: ei, field: 'paymentType', value: e.target.value }))}
                              >
                                {PAYMENT_TYPES.map((p) => (
                                  <option key={p.key} value={p.key}>{p.label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="text-end mono text-muted">{fmt(amount)}</td>
                            <td className="text-center">
                              <Button close aria-label="Delete sale" onClick={() => dispatch(deleteEntry({ dayIndex: di, entryIndex: ei }))} />
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
                  <tr>
                    <td colSpan={6} className="bg-light">
                      <div className="d-flex justify-content-between align-items-center py-1">
                        <Button color="link" size="sm" className="p-0 text-decoration-none" onClick={() => dispatch(addEntry({ dayIndex: di }))}>
                          + Add sale for this day
                        </Button>
                        <Button close aria-label="Delete day" onClick={() => dispatch(deleteDailyRow(di))} />
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </Table>
      </div>
      <Button color="primary" outline size="sm" onClick={() => dispatch(addDailyRow())} className="mb-4">
        + Add day
      </Button>

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