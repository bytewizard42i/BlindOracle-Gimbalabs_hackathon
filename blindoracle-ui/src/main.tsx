import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { App } from './App.js';

const oracleTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0a0a14',
      paper: '#14141f',
    },
    primary: {
      main: '#9d4edd', // deep violet — mysterious, premium
      light: '#c77dff',
      dark: '#7b2cbf',
    },
    secondary: {
      main: '#ffd60a', // gold — oracle accent
    },
    text: {
      primary: '#f5f3f7',
      secondary: '#a09caf',
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", sans-serif',
    h1: { fontFamily: '"Cinzel", serif', fontWeight: 900, letterSpacing: '0.02em' },
    h2: { fontFamily: '"Cinzel", serif', fontWeight: 700, letterSpacing: '0.02em' },
    h3: { fontFamily: '"Cinzel", serif', fontWeight: 600 },
    h4: { fontFamily: '"Cinzel", serif', fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={oracleTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
