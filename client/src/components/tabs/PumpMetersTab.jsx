import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button } from 'reactstrap';
import { addPump, deletePump, updatePumpMeter } from '../../features/ledger/ledgerSlice.js';
import { FUEL_KEYS, totalLiters, pumpLitersByGrade, n, fmt } from '../../utils/calc.js';

const FUEL_LABELS = {
  super: 'Super',
  regular: 'Regular',
  diesel: 'Diesel',
  vpower: 'V-Power',
};

export default function PumpMetersTab() {
  const dispatch = useDispatch();
  const pumps = useSelector((s) => s.ledger.data?.pumps) || [];
  const dailySales = useSelector((s) => s.ledger.data?.dailySales) || [];

  const dailyLiters = totalLiters(dailySales);
  const pumpLiters = pumpLitersByGrade(pumps);

  return (
    <div>
      <h4 className="mb-1">Pump meters</h4>
      <p className="text-muted small mb-3">
        Enter each pump's meter reading per fuel at the start and end of the month. Litres sold
        is calculated automatically (closing − opening). Opening readings carry forward
        automatically from last month's closing readings — meters are cumulative and never reset
        on their own. This is a cross-check against the <strong>Daily Sales</strong> total, not
        something that feeds into profit calculations.
      </p>

      <div className="table-responsive mb-3">
        <Table bordered className="bg-white align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th rowSpan={2} className="align-middle" style={{ width: 70 }}>Pump</th>
              {FUEL_KEYS.map((k) => (
                <th key={k} colSpan={3} className="text-center">{FUEL_LABELS[k]}</th>
              ))}
              <th rowSpan={2}></th>
            </tr>
            <tr>
              {FUEL_KEYS.map((k) => (
                <React.Fragment key={k}>
                  <th className="text-end small fw-normal">Opening</th>
                  <th className="text-end small fw-normal">Closing</th>
                  <th className="text-end small fw-normal">Litres</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {pumps.map((p, i) => (
              <tr key={i}>
                <td className="fw-semibold">{p.pumpNo}</td>
                {FUEL_KEYS.map((k) => {
                  const m = p[k] || { opening: 0, closing: 0 };
                  const litres = n(m.closing) - n(m.opening);
                  return (
                    <React.Fragment key={k}>
                      <td className="text-end">
                        <input
                          type="number" step="any" className="form-control form-control-sm text-end"
                          style={{ minWidth: 90 }}
                          value={m.opening || 0}
                          onChange={(e) => dispatch(updatePumpMeter({ index: i, fuel: k, field: 'opening', value: e.target.value }))}
                        />
                      </td>
                      <td className="text-end">
                        <input
                          type="number" step="any" className="form-control form-control-sm text-end"
                          style={{ minWidth: 90 }}
                          value={m.closing || 0}
                          onChange={(e) => dispatch(updatePumpMeter({ index: i, fuel: k, field: 'closing', value: e.target.value }))}
                        />
                      </td>
                      <td className="text-end mono text-muted">{litres > 0 ? fmt(litres, 0) : '—'}</td>
                    </React.Fragment>
                  );
                })}
                <td className="text-center">
                  <Button close aria-label="Delete pump" onClick={() => dispatch(deletePump(i))} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <Button color="primary" outline size="sm" onClick={() => dispatch(addPump())} className="mb-4">
        + Add pump
      </Button>

      <h6 className="fw-bold mb-2">Reconciliation vs. Daily Sales</h6>
      <div className="table-responsive">
        <Table bordered className="bg-white align-middle" style={{ maxWidth: 640 }}>
          <thead className="table-light">
            <tr>
              <th>Fuel</th>
              <th className="text-end">Pump Meter Litres</th>
              <th className="text-end">Daily Sales Litres</th>
              <th className="text-end">Difference</th>
            </tr>
          </thead>
          <tbody>
            {FUEL_KEYS.map((k) => {
              const diff = (pumpLiters[k] || 0) - (dailyLiters[k] || 0);
              return (
                <tr key={k}>
                  <td>{FUEL_LABELS[k]}</td>
                  <td className="text-end mono">{fmt(pumpLiters[k], 0)}</td>
                  <td className="text-end mono">{fmt(dailyLiters[k], 0)}</td>
                  <td className={`text-end mono ${Math.abs(diff) > 0.5 ? 'text-danger fw-bold' : 'text-muted'}`}>
                    {fmt(diff, 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
      <p className="text-muted small mt-2 mb-0">
        A non-zero difference means the pump meters and the Daily Sales entries don't agree for
        that fuel this month — worth double-checking either figure.
      </p>
    </div>
  );
}
