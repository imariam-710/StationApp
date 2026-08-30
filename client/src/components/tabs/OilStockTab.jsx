import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table } from 'reactstrap';
import { updateOilRow } from '../../features/ledger/ledgerSlice.js';
import { oilStockSummary, fmt } from '../../utils/calc.js';

export default function OilStockTab() {
  const dispatch = useDispatch();
  const oilProducts = useSelector((s) => s.ledger.data?.oilProducts) || [];
  const summary = oilStockSummary(oilProducts);

  return (
    <div>
      <h4 className="mb-1">Oil &amp; lubricant stock</h4>
      <p className="text-muted small mb-3">
        Opening stock carries forward automatically from last month's closing stock (matched by
        product name) when you switch to a new month. Add this month's deliveries below —
        closing stock (opening + deliveries − units sold) becomes next month's opening stock
        on its own.
      </p>

      <div className="table-responsive">
        <Table bordered className="bg-white align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Grade</th>
              <th className="text-end" style={{ width: 100 }}>Opening</th>
              <th className="text-end" style={{ width: 100 }}>Deliveries</th>
              <th className="text-end" style={{ width: 100 }}>Available</th>
              <th className="text-end" style={{ width: 100 }}>Sold</th>
              <th className="text-end" style={{ width: 100 }}>Closing</th>
            </tr>
          </thead>
          <tbody>
            {oilProducts.map((r, i) => {
              const s = summary[i] || { available: 0, sold: 0, closing: 0 };
              return (
                <tr key={i}>
                  <td>{r.name || <span className="text-muted">—</span>}</td>
                  <td className="text-end">
                    <input
                      type="number"
                      step="any"
                      className="form-control form-control-sm text-end"
                      value={r.openingStock || 0}
                      onChange={(e) => dispatch(updateOilRow({ index: i, field: 'openingStock', value: e.target.value }))}
                    />
                  </td>
                  <td className="text-end">
                    <input
                      type="number"
                      step="any"
                      className="form-control form-control-sm text-end"
                      value={r.deliveries || 0}
                      onChange={(e) => dispatch(updateOilRow({ index: i, field: 'deliveries', value: e.target.value }))}
                    />
                  </td>
                  <td className="text-end mono text-muted">{fmt(s.available, 0)}</td>
                  <td className="text-end mono text-muted">{fmt(s.sold, 0)}</td>
                  <td className="text-end mono fw-bold">{fmt(s.closing, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
      <p className="text-muted small mt-2 mb-0">
        Add or remove products from the <strong>Oil &amp; Lubricants</strong> tab — rows here follow automatically.
      </p>
    </div>
  );
}