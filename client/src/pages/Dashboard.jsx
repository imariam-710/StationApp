import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Container, Input, Label, Spinner } from 'reactstrap';
import TopMenu from '../components/TopMenu.jsx';
import DailySalesTab from '../components/tabs/DailySalesTab.jsx';
import PaymentsTab from '../components/tabs/PaymentsTab.jsx';
import StockTab from '../components/tabs/StockTab.jsx';
import FuelMarginTab from '../components/tabs/FuelMarginTab.jsx';
import OilTab from '../components/tabs/OilTab.jsx';
import OilStockTab from '../components/tabs/OilStockTab.jsx';
import DeductionsTab from '../components/tabs/DeductionsTab.jsx';
import ExpensesTab from '../components/tabs/ExpensesTab.jsx';
import SummaryTab from '../components/tabs/SummaryTab.jsx';
import AdminReportTab from '../components/tabs/AdminReportTab.jsx';
import {
  fetchMonth, saveMonth, fetchSettings, updateSettingsThunk,
  setCurrentMonth, setStationNameLocal,
} from '../features/ledger/ledgerSlice.js';

const TABS = {
  daily: DailySalesTab,
  payments: PaymentsTab,
  stock: StockTab,
  fuel: FuelMarginTab,
  oil: OilTab,
  oilStock: OilStockTab,
  deductions: DeductionsTab,
  expenses: ExpensesTab,
  summary: SummaryTab,
  admin: AdminReportTab,
};

export default function Dashboard() {
  const dispatch = useDispatch();
  const { currentMonth, data, stationName } = useSelector((s) => s.ledger);
  const [activeTab, setActiveTab] = useState('daily');
  const saveTimer = useRef(null);
  const skipNextSave = useRef(false);

  // Initial load
  useEffect(() => {
    dispatch(fetchSettings());
    skipNextSave.current = true;
    dispatch(fetchMonth(currentMonth));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave whenever the ledger data changes locally — but not right after
  // a fresh load or a save round-trip (guarded by skipNextSave / not
  // overwriting `data` on saveMonth.fulfilled — see ledgerSlice).
  useEffect(() => {
    if (!data) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      dispatch(saveMonth());
    }, 500);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const onMonthChange = (e) => {
    const m = e.target.value;
    if (!m) return;
    dispatch(setCurrentMonth(m));
    skipNextSave.current = true;
    dispatch(fetchMonth(m));
  };

  const onStationNameBlur = (e) => {
    dispatch(updateSettingsThunk(e.target.value));
  };

  const Active = TABS[activeTab];

  return (
    <div>
      <TopMenu activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="bg-white border-bottom">
        <Container className="d-flex flex-wrap justify-content-between align-items-end py-3 gap-3">
          <div>
            <Label className="text-uppercase small text-muted fw-bold mb-1">Station name</Label>
            <Input
              value={stationName}
              onChange={(e) => dispatch(setStationNameLocal(e.target.value))}
              onBlur={onStationNameBlur}
              className="station-name-input rounded-0 px-0"
              style={{ maxWidth: 340 }}
            />
          </div>
          <div className="d-flex gap-4 align-items-end flex-wrap">
            <div>
              <Label className="text-uppercase small text-muted fw-bold mb-1">Month</Label>
              <Input type="month" value={currentMonth} onChange={onMonthChange} style={{ width: 180 }} />
            </div>
          </div>
        </Container>
      </div>

      <Container fluid className="py-4" style={{ maxWidth: 1400 }}>
        {data ? (
          <Active />
        ) : (
          <div className="d-flex align-items-center gap-2 text-muted py-5">
            <Spinner size="sm" /> Loading…
          </div>
        )}
      </Container>
    </div>
  );
}