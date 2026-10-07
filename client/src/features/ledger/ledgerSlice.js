import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios.js';

const todayMonth = new Date().toISOString().slice(0, 7);
const FUEL_KEYS = ['super', 'regular', 'diesel', 'vpower'];

function numOrZero(v) {
  const x = parseFloat(v);
  return isNaN(x) ? 0 : x;
}

function emptyShellCardLiters() {
  return { super: 0, regular: 0, diesel: 0, vpower: 0 };
}

function emptyDay() {
  return {
    date: '',
    entries: [],
    pumps: [],
    shellCardLiters: emptyShellCardLiters(),
    subsidyAmount: 0,
    siteCredit: 0,
    other: 0,
    telephoneCard: 0,
    visaCard: 0,
    cashToBank: 0,
  };
}

function daysInMonth(month) {
  const [y, mo] = month.split('-').map(Number);
  return new Date(y, mo, 0).getDate();
}

// Keep a day's pump-reading rows lined up with the month's current pump
// list (same pump numbers, same order) — adding or removing a pump on the
// Pump Meters tab carries through to every day's cross-check table too.
function syncDayPumps(day, monthlyPumps) {
  const byPumpNo = {};
  (day.pumps || []).forEach((p) => { byPumpNo[p.pumpNo] = p; });
  day.pumps = (monthlyPumps || []).map((mp) => {
    const existing = byPumpNo[mp.pumpNo];
    return existing || { pumpNo: mp.pumpNo, super: 0, regular: 0, diesel: 0, vpower: 0 };
  });
}

// Make sure `data.dailySales` has exactly one entry per calendar day of
// `month`, in order — one page per day, same as the station's own Excel
// ledger (DAY 1, DAY 2, DAY 3 … tabs). Any sales already entered are kept,
// matched back onto their day by date; nothing is lost. Each day's pump
// cross-check rows are also kept in sync with the month's pump list.
function ensureDailySalesForMonth(data, month) {
  if (!data || !month) return;
  const dim = daysInMonth(month);
  const byDate = {};
  (data.dailySales || []).forEach((day) => {
    if (day && day.date) byDate[day.date] = day;
  });
  const rebuilt = [];
  for (let d = 1; d <= dim; d++) {
    const date = `${month}-${String(d).padStart(2, '0')}`;
    const day = byDate[date] || emptyDay();
    day.date = date;
    if (!Array.isArray(day.pumps)) day.pumps = [];
    if (!day.shellCardLiters || typeof day.shellCardLiters !== 'object') {
      day.shellCardLiters = emptyShellCardLiters();
    }
    FUEL_KEYS.forEach((k) => {
      if (typeof day.shellCardLiters[k] !== 'number') day.shellCardLiters[k] = 0;
    });
    if (typeof day.subsidyAmount !== 'number') day.subsidyAmount = 0;
    if (typeof day.siteCredit !== 'number') day.siteCredit = 0;
    if (typeof day.other !== 'number') day.other = 0;
    if (typeof day.telephoneCard !== 'number') day.telephoneCard = 0;
    if (typeof day.visaCard !== 'number') day.visaCard = 0;
    if (typeof day.cashToBank !== 'number') day.cashToBank = 0;
    syncDayPumps(day, data.pumps);
    rebuilt.push(day);
  }
  data.dailySales = rebuilt;
}

export const fetchMonth = createAsyncThunk('ledger/fetchMonth', async (month) => {
  const res = await api.get(`/months/${month}`);
  return res.data;
});

export const saveMonth = createAsyncThunk('ledger/saveMonth', async (_, { getState }) => {
  const { currentMonth, data } = getState().ledger;
  const res = await api.put(`/months/${currentMonth}`, data);
  return res.data;
});

export const fetchSettings = createAsyncThunk('ledger/fetchSettings', async () => {
  const res = await api.get('/settings');
  return res.data;
});

export const updateSettingsThunk = createAsyncThunk('ledger/updateSettings', async (stationName) => {
  const res = await api.put('/settings', { stationName });
  return res.data;
});

const initialState = {
  currentMonth: todayMonth,
  data: null,
  stationName: 'Station Name',
  status: 'idle', // idle | loading | saving | saved | error
  error: null,
};

const ledgerSlice = createSlice({
  name: 'ledger',
  initialState,
  reducers: {
    setCurrentMonth(state, action) {
      state.currentMonth = action.payload;
    },
    setStationNameLocal(state, action) {
      state.stationName = action.payload;
    },

    // Also used for priceCash / priceCard / buy / openingStock / deliveries /
    // actualStock — any numeric field on a grade.
    updateGrade(state, { payload: { index, field, value } }) {
      state.data.grades[index][field] = numOrZero(value);
    },

    addDailyRow(state) {
      state.data.dailySales.push(emptyDay());
    },
    // Top-level field on a day: just the date.
    updateDailyRow(state, { payload: { index, field, value } }) {
      state.data.dailySales[index][field] = value;
    },
    deleteDailyRow(state, { payload: index }) {
      state.data.dailySales.splice(index, 1);
      if (state.data.dailySales.length === 0) state.data.dailySales.push(emptyDay());
    },

    // A day can have any number of sales — the same fuel can appear more
    // than once (e.g. sold partly for cash, partly by card, or just several
    // separate transactions through the day). The price is snapshotted from
    // the grade's current cash/card price right now, and stays fixed after
    // that — changing the grade's price later does NOT change what this
    // sale is worth. (You can still edit this entry's price directly if
    // needed, e.g. a one-off discount.)
    addEntry(state, { payload: { dayIndex } }) {
      const day = state.data.dailySales[dayIndex];
      if (!day.entries) day.entries = [];
      const fuel = FUEL_KEYS[0];
      const paymentType = 'cash';
      const grade = state.data.grades.find((g) => g.key === fuel);
      const price = grade ? numOrZero(grade.priceCash) : 0;
      day.entries.push({ fuel, liters: 0, paymentType, price });
    },
    updateEntry(state, { payload: { dayIndex, entryIndex, field, value } }) {
      const entry = state.data.dailySales[dayIndex]?.entries?.[entryIndex];
      if (!entry) return;
      if (field === 'fuel' || field === 'paymentType') {
        // Changing which fuel or payment method this sale used re-snapshots
        // the price from that fuel's CURRENT rate for that payment method —
        // this only affects this one entry, not any other sale.
        entry[field] = value;
        const grade = state.data.grades.find((g) => g.key === entry.fuel);
        const priceKey = entry.paymentType === 'card' ? 'priceCard' : 'priceCash';
        entry.price = grade ? numOrZero(grade[priceKey]) : 0;
      } else {
        // liters or a direct manual price override.
        entry[field] = numOrZero(value);
      }
    },
    deleteEntry(state, { payload: { dayIndex, entryIndex } }) {
      state.data.dailySales[dayIndex]?.entries?.splice(entryIndex, 1);
    },

    addOilRow(state) {
      state.data.oilProducts.push({ name: '', buy: 0, sell: 0, qtyCash: 0, qtyCard: 0 });
    },
    updateOilRow(state, { payload: { index, field, value } }) {
      state.data.oilProducts[index][field] = field === 'name' ? value : numOrZero(value);
    },
    deleteOilRow(state, { payload: index }) {
      state.data.oilProducts.splice(index, 1);
      if (state.data.oilProducts.length === 0) state.data.oilProducts.push({ name: '', buy: 0, sell: 0, qtyCash: 0, qtyCard: 0 });
    },

    addDeductionRow(state) {
      state.data.deductions.push({ name: '', liters: 0, rate: 0, amount: 0 });
    },
    updateDeductionRow(state, { payload: { index, field, value } }) {
      state.data.deductions[index][field] = field === 'name' ? value : numOrZero(value);
    },
    deleteDeductionRow(state, { payload: index }) {
      state.data.deductions.splice(index, 1);
      if (state.data.deductions.length === 0) state.data.deductions.push({ name: '', liters: 0, rate: 0, amount: 0 });
    },

    addExpenseRow(state) {
      state.data.expenses.push({ name: '', amount: 0 });
    },
    updateExpenseRow(state, { payload: { index, field, value } }) {
      state.data.expenses[index][field] = field === 'name' ? value : numOrZero(value);
    },
    deleteExpenseRow(state, { payload: index }) {
      state.data.expenses.splice(index, 1);
    },

    setPartners(state, action) {
      state.data.partners = Math.max(1, numOrZero(action.payload) || 1);
    },

    setCashToBank(state, action) {
      state.data.cashToBank = Math.max(0, numOrZero(action.payload));
    },

    // A grade's tank can be topped up more than once during the month —
    // each delivery is its own dated entry, and all of them count toward
    // that grade's stock (see Tank Stock tab).
    addDelivery(state, { payload: { gradeIndex } }) {
      const g = state.data.grades[gradeIndex];
      if (!g) return;
      if (!Array.isArray(g.deliveries)) g.deliveries = [];
      g.deliveries.push({ date: '', amount: 0 });
    },
    updateDelivery(state, { payload: { gradeIndex, deliveryIndex, field, value } }) {
      const d = state.data.grades[gradeIndex]?.deliveries?.[deliveryIndex];
      if (!d) return;
      d[field] = field === 'date' ? value : numOrZero(value);
    },
    deleteDelivery(state, { payload: { gradeIndex, deliveryIndex } }) {
      state.data.grades[gradeIndex]?.deliveries?.splice(deliveryIndex, 1);
    },

    addPump(state) {
      if (!state.data.pumps) state.data.pumps = [];
      const nextNo = state.data.pumps.length
        ? Math.max(...state.data.pumps.map((p) => p.pumpNo)) + 1
        : 1;
      state.data.pumps.push({
        pumpNo: nextNo,
        super: { opening: 0, closing: 0 },
        regular: { opening: 0, closing: 0 },
        diesel: { opening: 0, closing: 0 },
        vpower: { opening: 0, closing: 0 },
      });
      (state.data.dailySales || []).forEach((day) => syncDayPumps(day, state.data.pumps));
    },
    deletePump(state, { payload: index }) {
      state.data.pumps.splice(index, 1);
      (state.data.dailySales || []).forEach((day) => syncDayPumps(day, state.data.pumps));
    },
    // field is 'opening' or 'closing' on a given fuel's meter for that pump.
    updatePumpMeter(state, { payload: { index, fuel, field, value } }) {
      const pump = state.data.pumps?.[index];
      if (!pump) return;
      if (!pump[fuel]) pump[fuel] = { opening: 0, closing: 0 };
      pump[fuel][field] = numOrZero(value);
    },

    // One pump's meter reading for one specific fuel, on one specific day —
    // the day-sheet's "PUMP NO" cross-check table.
    updateDayPumpReading(state, { payload: { dayIndex, pumpIndex, fuel, value } }) {
      const pump = state.data.dailySales?.[dayIndex]?.pumps?.[pumpIndex];
      if (!pump) return;
      pump[fuel] = numOrZero(value);
    },

    // visaCard, subsidyAmount, siteCredit, other, or telephoneCard on a
    // specific day.
    updateDayField(state, { payload: { dayIndex, field, value } }) {
      const day = state.data.dailySales?.[dayIndex];
      if (!day) return;
      day[field] = numOrZero(value);
    },

    // Litres sold via Shell (fleet) card, for one fuel, on one specific day.
    updateDayShellCardLiters(state, { payload: { dayIndex, fuel, value } }) {
      const day = state.data.dailySales?.[dayIndex];
      if (!day) return;
      if (!day.shellCardLiters) day.shellCardLiters = emptyShellCardLiters();
      day.shellCardLiters[fuel] = numOrZero(value);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMonth.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMonth.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
        ensureDailySalesForMonth(state.data, action.meta.arg);
      })
      .addCase(fetchMonth.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message;
      })
      .addCase(saveMonth.pending, (state) => {
        state.status = 'saving';
      })
      .addCase(saveMonth.fulfilled, (state) => {
        // Intentionally does NOT overwrite state.data here — doing so would
        // change the `data` reference again and re-trigger the autosave
        // effect in Dashboard, causing a save loop.
        state.status = 'saved';
      })
      .addCase(saveMonth.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.stationName = action.payload.stationName;
      })
      .addCase(updateSettingsThunk.fulfilled, (state, action) => {
        state.stationName = action.payload.stationName;
      });
  },
});

export const {
  setCurrentMonth,
  setStationNameLocal,
  updateGrade,
  addDailyRow,
  updateDailyRow,
  deleteDailyRow,
  addEntry,
  updateEntry,
  deleteEntry,
  addOilRow,
  updateOilRow,
  deleteOilRow,
  addDeductionRow,
  updateDeductionRow,
  deleteDeductionRow,
  addExpenseRow,
  updateExpenseRow,
  deleteExpenseRow,
  setPartners,
  setCashToBank,
  addDelivery,
  updateDelivery,
  deleteDelivery,
  addPump,
  deletePump,
  updatePumpMeter,
  updateDayPumpReading,
  updateDayField,
  updateDayShellCardLiters,
} = ledgerSlice.actions;

export default ledgerSlice.reducer;
