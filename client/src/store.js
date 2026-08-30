import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/auth/authSlice.js';
import ledgerReducer from './features/ledger/ledgerSlice.js';

const store = configureStore({
  reducer: {
    auth: authReducer,
    ledger: ledgerReducer,
  },
});

export default store;
