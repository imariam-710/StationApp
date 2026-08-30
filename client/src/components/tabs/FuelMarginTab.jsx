import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Row, Col, Card, CardBody } from 'reactstrap';
import { updateGrade } from '../../features/ledger/ledgerSlice.js';
import { totalLiters, revenueByGrade, fuelProfitByGrade, stockLossByGrade, fmt } from '../../utils/calc.js';

export default function FuelMarginTab() {
  const dispatch = useDispatch();
  const grades = useSelector((s) => s.ledger.data?.grades) || [];
  const dailySales = useSelector((s) => s.ledger.data?.dailySales) || [];
  const liters = totalLiters(dailySales);
  const revenue = revenueByGrade(dailySales, grades);
  const profitByGrade = fuelProfitByGrade(grades, dailySales);
  const lossByGrade = stockLossByGrade(grades, dailySales);

  let sumProfit = 0;

  return (
    <div>
      <h4 className="mb-1">Fuel margin</h4>
      <p className="text-muted small mb-3">
        Buying price, and the cash/card selling prices per litre for each grade this month —
        the same prices shown on the <strong>Daily Sales</strong> tab; change them in either
        place. Changing a price here only sets what NEW sales will use — sales already entered
        keep whatever price they were made at, so past figures never shift under you. Margin
        profit below already accounts for evaporation/leakage loss (set actual stock on the
        <strong> Tank Stock</strong> tab).
      </p>
      <Row className="g-3 mb-4">
        {grades.map((g, i) => {
          const l = liters[g.key] || 0;
          const rev = revenue[g.key] || 0;
          const lossValue = lossByGrade[g.key]?.value || 0;
          const profit = profitByGrade[g.key] || 0;
          sumProfit += profit;
          return (
            <Col md={3} sm={6} key={g.key}>
              <Card className="h-100">
                <CardBody>
                  <h6 className="fw-bold mb-3">{g.name}</h6>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted">Buying price /L</small>
                    <input
                      type="number"
                      step="any"
                      className="form-control form-control-sm text-end"
                      style={{ width: 100 }}
                      value={g.buy || 0}
                      onChange={(e) => dispatch(updateGrade({ index: i, field: 'buy', value: e.target.value }))}
                    />
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted">Selling Cash price /L</small>
                    <input
                      type="number"
                      step="any"
                      className="form-control form-control-sm text-end"
                      style={{ width: 100 }}
                      value={g.priceCash || 0}
                      onChange={(e) => dispatch(updateGrade({ index: i, field: 'priceCash', value: e.target.value }))}
                    />
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted">Selling Card price /L</small>
                    <input
                      type="number"
                      step="any"
                      className="form-control form-control-sm text-end"
                      style={{ width: 100 }}
                      value={g.priceCard || 0}
                      onChange={(e) => dispatch(updateGrade({ index: i, field: 'priceCard', value: e.target.value }))}
                    />
                  </div>
                  <div className="small text-muted mt-2">
                    Litres sold: <b className="text-dark mono">{fmt(l, 0)}</b>
                  </div>
                  <div className="small text-muted">
                    Revenue: <b className="text-dark mono">{fmt(rev)}</b>
                  </div>
                  <div className="small text-danger">
                    Evaporation/leakage loss: <b className="mono">-{fmt(lossValue)}</b>
                  </div>
                  <div className="d-flex justify-content-between border-top pt-2 mt-2 fw-bold">
                    <span>Margin profit</span>
                    <span className="mono">{fmt(profit)}</span>
                  </div>
                </CardBody>
              </Card>
            </Col>
          );
        })}
      </Row>
      <div className="bg-white border rounded p-3 d-flex justify-content-between align-items-center">
        <span className="fw-semibold">Total fuel margin profit this month</span>
        <span className="fw-bold fs-5 text-primary mono">{fmt(sumProfit)} OMR</span>
      </div>
    </div>
  );
}