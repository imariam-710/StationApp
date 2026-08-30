import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button } from 'reactstrap';
import { addExpenseRow, updateExpenseRow, deleteExpenseRow } from '../../features/ledger/ledgerSlice.js';
import { expensesTotal, fmt } from '../../utils/calc.js';

export default function ExpensesTab() {
  const dispatch = useDispatch();
  const expenses = useSelector((s) => s.ledger.data?.expenses) || [];
  const total = expensesTotal(expenses);

  return (
    <div>
      <h4 className="mb-1">Monthly expenses</h4>
      <p className="text-muted small mb-3">Electricity, rent, salaries and other fixed costs for the month.</p>
      <div className="table-responsive">
        <Table bordered className="bg-white align-middle mb-2">
          <thead className="table-light">
            <tr>
              <th>Item</th>
              <th className="text-end" style={{ width: 140 }}>Amount</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((r, i) => (
              <tr key={i}>
                <td>
                  <input
                    className="form-control form-control-sm"
                    value={r.name || ''}
                    onChange={(e) => dispatch(updateExpenseRow({ index: i, field: 'name', value: e.target.value }))}
                  />
                </td>
                <td className="text-end">
                  <input
                    type="number" step="any" className="form-control form-control-sm text-end"
                    value={r.amount || 0}
                    onChange={(e) => dispatch(updateExpenseRow({ index: i, field: 'amount', value: e.target.value }))}
                  />
                </td>
                <td className="text-center">
                  <Button close aria-label="Delete row" onClick={() => dispatch(deleteExpenseRow(i))} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="fw-bold table-light">
              <td>Total expenses</td>
              <td className="text-end mono">{fmt(total)}</td>
              <td></td>
            </tr>
          </tfoot>
        </Table>
      </div>
      <Button color="primary" outline size="sm" onClick={() => dispatch(addExpenseRow())}>
        + Add expense
      </Button>
    </div>
  );
}