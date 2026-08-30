import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button } from 'reactstrap';
import { addOilRow, updateOilRow, deleteOilRow } from '../../features/ledger/ledgerSlice.js';
import { oilProfitTotal, oilCashTotal, oilCardTotal, oilQty, n, fmt } from '../../utils/calc.js';

const OIL_GRADE_OPTIONS = [
  'Hilux Ultra 4L', 'Hilux Ultra 1L',
  'Hilux HX7 4L', 'Hilux HX7 1L',
  'Hilux HX5 4L', 'Hilux HX5 1L',
  'Hilux HX3 4L', 'Hilux HX3 1L',
  'Rimula RX4 20L', 'Rimula RX4 4L',
  'Rimula R2 5L', 'Rimula R2 4L', 'Rimula R2 1L',
  'Spirax 90 4L', 'Spirax 140 4L',
  'ATF 4L', 'ATF 1L',
  'Engine Coolant 4L', 'Engine Coolant 1L',
  'Brake Oils 4L',
];

export default function OilTab() {
  const dispatch = useDispatch();
  const oilProducts = useSelector((s) => s.ledger.data?.oilProducts) || [];
  const totalProfit = oilProfitTotal(oilProducts);
  const totalCash = oilCashTotal(oilProducts);
  const totalCard = oilCardTotal(oilProducts);

  return (
    <div>
      <h4 className="mb-1">Oil &amp; lubricant sales</h4>
      <p className="text-muted small mb-3">
        Buying price, selling price, and how many were sold by cash vs. card this month, per product.
        Total sold, cash collected, and profit are all calculated automatically.
      </p>

      <datalist id="oilGradeOptions">
        {OIL_GRADE_OPTIONS.map((name) => <option value={name} key={name} />)}
      </datalist>

      <div className="table-responsive">
        <Table bordered className="bg-white align-middle mb-2">
          <thead className="table-light">
            <tr>
              <th>Grade</th>
              <th className="text-end" style={{ width: 100 }}>Buy price</th>
              <th className="text-end" style={{ width: 100 }}>Sell price</th>
              <th className="text-end" style={{ width: 90 }}>Profit /unit</th>
              <th className="text-end" style={{ width: 90 }}>No. cash sale</th>
              <th className="text-end" style={{ width: 90 }}>No. card sale</th>
              <th className="text-end" style={{ width: 90 }}>Total sale</th>
              <th className="text-end" style={{ width: 100 }}>Cash</th>
              <th className="text-end" style={{ width: 100 }}>Card</th>
              <th className="text-end" style={{ width: 100 }}>Profit</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {oilProducts.map((r, i) => {
              const unitProfit = n(r.sell) - n(r.buy);
              const totalQty = oilQty(r);
              const cash = n(r.qtyCash) * n(r.sell);
              const card = n(r.qtyCard) * n(r.sell);
              const profit = totalQty * unitProfit;
              return (
                <tr key={i}>
                  <td>
                    <input
                      className="form-control form-control-sm"
                      list="oilGradeOptions"
                      placeholder="Grade"
                      value={r.name || ''}
                      onChange={(e) => dispatch(updateOilRow({ index: i, field: 'name', value: e.target.value }))}
                    />
                  </td>
                  <td className="text-end">
                    <input
                      type="number" step="any" className="form-control form-control-sm text-end"
                      value={r.buy || 0}
                      onChange={(e) => dispatch(updateOilRow({ index: i, field: 'buy', value: e.target.value }))}
                    />
                  </td>
                  <td className="text-end">
                    <input
                      type="number" step="any" className="form-control form-control-sm text-end"
                      value={r.sell || 0}
                      onChange={(e) => dispatch(updateOilRow({ index: i, field: 'sell', value: e.target.value }))}
                    />
                  </td>
                  <td className="text-end mono text-muted">{fmt(unitProfit)}</td>
                  <td className="text-end">
                    <input
                      type="number" step="any" className="form-control form-control-sm text-end"
                      value={r.qtyCash || 0}
                      onChange={(e) => dispatch(updateOilRow({ index: i, field: 'qtyCash', value: e.target.value }))}
                    />
                  </td>
                  <td className="text-end">
                    <input
                      type="number" step="any" className="form-control form-control-sm text-end"
                      value={r.qtyCard || 0}
                      onChange={(e) => dispatch(updateOilRow({ index: i, field: 'qtyCard', value: e.target.value }))}
                    />
                  </td>
                  <td className="text-end mono text-muted">{fmt(totalQty, 0)}</td>
                  <td className="text-end mono text-muted">{fmt(cash)}</td>
                  <td className="text-end mono text-muted">{fmt(card)}</td>
                  <td className="text-end mono text-muted">{fmt(profit)}</td>
                  <td className="text-center">
                    <Button close aria-label="Delete row" onClick={() => dispatch(deleteOilRow(i))} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="fw-bold table-light">
              <td colSpan={7}>Total</td>
              <td className="text-end mono">{fmt(totalCash)}</td>
              <td className="text-end mono">{fmt(totalCard)}</td>
              <td className="text-end mono">{fmt(totalProfit)}</td>
              <td></td>
            </tr>
          </tfoot>
        </Table>
      </div>
      <Button color="primary" outline size="sm" onClick={() => dispatch(addOilRow())}>
        + Add product
      </Button>
    </div>
  );
}