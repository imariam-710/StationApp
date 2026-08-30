import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Row, Col, Card, CardBody, Table } from 'reactstrap';
import { updateGrade } from '../../features/ledger/ledgerSlice.js';
import { stockSummary, dailyRunningStock, stockLossByGrade, stockLossTotal, fmt } from '../../utils/calc.js';

export default function StockTab() {
  const dispatch = useDispatch();
  const grades = useSelector((s) => s.ledger.data?.grades) || [];
  const dailySales = useSelector((s) => s.ledger.data?.dailySales) || [];
  const summary = stockSummary(grades, dailySales);
  const running = dailyRunningStock(grades, dailySales);
  const loss = stockLossByGrade(grades, dailySales);
  const lossTotal = stockLossTotal(grades, dailySales);

  return (
    <div>
      <h4 className="mb-1">Tank stock</h4>
      <p className="text-muted small mb-3">
        Opening stock carries forward automatically from last month's closing stock when you
        switch to a new month. Add this month's deliveries below — closing (book) stock (opening
        + deliveries − litres sold) becomes next month's opening stock on its own.
      </p>

      <Row className="g-3 mb-4">
        {grades.map((g, i) => {
          const s = summary[g.key] || { opening: 0, deliveries: 0, available: 0, sold: 0, closing: 0 };
          return (
            <Col md={3} sm={6} key={g.key}>
              <Card className="h-100">
                <CardBody>
                  <h6 className="fw-bold mb-3">{g.name}</h6>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted">Opening stock</small>
                    <input
                      type="number"
                      step="any"
                      className="form-control form-control-sm text-end"
                      style={{ width: 100 }}
                      value={g.openingStock || 0}
                      onChange={(e) => dispatch(updateGrade({ index: i, field: 'openingStock', value: e.target.value }))}
                    />
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted">Deliveries this month</small>
                    <input
                      type="number"
                      step="any"
                      className="form-control form-control-sm text-end"
                      style={{ width: 100 }}
                      value={g.deliveries || 0}
                      onChange={(e) => dispatch(updateGrade({ index: i, field: 'deliveries', value: e.target.value }))}
                    />
                  </div>
                  <div className="small text-muted mt-2">
                    Available: <b className="text-dark mono">{fmt(s.available, 0)}</b>
                  </div>
                  <div className="small text-muted">
                    Sold this month: <b className="text-dark mono">{fmt(s.sold, 0)}</b>
                  </div>
                  <div className="d-flex justify-content-between border-top pt-2 mt-2 fw-bold">
                    <span>Book stock</span>
                    <span className="mono">{fmt(s.closing, 0)}</span>
                  </div>
                </CardBody>
              </Card>
            </Col>
          );
        })}
      </Row>

      <h6 className="fw-bold mb-2">Actual stock &amp; evaporation / leakage loss</h6>
      <p className="text-muted small mb-2">
        Enter what's physically measured in the tank at month end. The gap between book stock
        and actual stock is counted as evaporation/leakage loss and flows into the Summary tab.
      </p>
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
              <td className="fw-semibold">Book stock (L)</td>
              {grades.map((g) => (
                <td key={g.key} className="text-end mono">{fmt(loss[g.key]?.book, 0)}</td>
              ))}
              <td></td>
            </tr>
            <tr>
              <td className="fw-semibold">Actual stock (L)</td>
              {grades.map((g, i) => (
                <td key={g.key} className="text-end">
                  <input
                    type="number"
                    step="any"
                    className="form-control form-control-sm text-end"
                    value={g.actualStock || 0}
                    onChange={(e) => dispatch(updateGrade({ index: i, field: 'actualStock', value: e.target.value }))}
                  />
                </td>
              ))}
              <td></td>
            </tr>
            <tr>
              <td className="fw-semibold">Loss (L)</td>
              {grades.map((g) => (
                <td key={g.key} className="text-end mono">{fmt(loss[g.key]?.litres, 0)}</td>
              ))}
              <td></td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="fw-bold table-light">
              <td colSpan={grades.length + 1}>Total evaporation / leakage loss (value)</td>
              <td className="text-end mono">{fmt(lossTotal)}</td>
            </tr>
          </tfoot>
        </Table>
      </div>

      <h6 className="fw-bold mb-2">Stock remaining after each day's sales</h6>
      <div className="table-responsive">
        <Table bordered className="bg-white align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ width: 130 }}>Date</th>
              {grades.map((g) => (
                <th key={g.key} className="text-end">{g.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {running.map((r, i) => (
              <tr key={i}>
                <td className="text-muted small">{r.date || '—'}</td>
                {grades.map((g) => (
                  <td key={g.key} className="text-end mono">{fmt(r.remaining[g.key], 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}