import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button } from 'reactstrap';
import { addDeductionRow, updateDeductionRow, deleteDeductionRow } from '../../features/ledger/ledgerSlice.js';
import { deductionsTotal, n, fmt } from '../../utils/calc.js';

export default function DeductionsTab() {
  const dispatch = useDispatch();
  const deductions = useSelector((s) => s.ledger.data?.deductions) || [];
  const total = deductionsTotal(deductions);

  return (
    <div>
      <h4 className="mb-1">Deductions — commissions &amp; fees</h4>
      <p className="text-muted small mb-3">
        Card sale commission, Shell-demanded commission, or any per-litre fee. Fill in litres &amp; rate
        to calculate automatically, or type the amount directly.
      </p>
      <div className="table-responsive">
        <Table bordered className="bg-white align-middle mb-2">
          <thead className="table-light">
            <tr>
              <th>Description</th>
              <th className="text-end" style={{ width: 100 }}>Litres</th>
              <th className="text-end" style={{ width: 90 }}>Rate</th>
              <th className="text-end" style={{ width: 110 }}>Amount</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {deductions.map((r, i) => {
              const calc = n(r.liters) && n(r.rate);
              const amt = calc ? n(r.liters) * n(r.rate) : n(r.amount);
              return (
                <tr key={i}>
                  <td>
                    <input
                      className="form-control form-control-sm"
                      value={r.name || ''}
                      onChange={(e) => dispatch(updateDeductionRow({ index: i, field: 'name', value: e.target.value }))}
                    />
                  </td>
                  <td className="text-end">
                    <input
                      type="number" step="any" className="form-control form-control-sm text-end"
                      value={r.liters || 0}
                      onChange={(e) => dispatch(updateDeductionRow({ index: i, field: 'liters', value: e.target.value }))}
                    />
                  </td>
                  <td className="text-end">
                    <input
                      type="number" step="any" className="form-control form-control-sm text-end"
                      value={r.rate || 0}
                      onChange={(e) => dispatch(updateDeductionRow({ index: i, field: 'rate', value: e.target.value }))}
                    />
                  </td>
                  <td className="text-end">
                    {calc ? (
                      <input type="text" readOnly className="form-control form-control-sm text-end bg-light" value={fmt(amt)} />
                    ) : (
                      <input
                        type="number" step="any" className="form-control form-control-sm text-end"
                        value={r.amount || 0}
                        onChange={(e) => dispatch(updateDeductionRow({ index: i, field: 'amount', value: e.target.value }))}
                      />
                    )}
                  </td>
                  <td className="text-center">
                    <Button close aria-label="Delete row" onClick={() => dispatch(deleteDeductionRow(i))} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="fw-bold table-light">
              <td colSpan={3}>Total deductions</td>
              <td className="text-end mono">{fmt(total)}</td>
              <td></td>
            </tr>
          </tfoot>
        </Table>
      </div>
      <Button color="primary" outline size="sm" onClick={() => dispatch(addDeductionRow())}>
        + Add deduction
      </Button>
    </div>
  );
}