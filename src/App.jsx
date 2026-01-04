import React from 'react';
import { AppProvider } from './store';
import Calendar from './components/Calendar';
import SalaryStats from './components/SalaryStats';

function App() {
  return (
    <AppProvider>
      <div className="app-container">
        <h1>Nepali Salary Calculator</h1>
        <p style={{ marginBottom: '2rem' }}>Track your work days and calculate your monthly earnings.</p>

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Calendar />
          <SalaryStats />
        </div>
      </div>
    </AppProvider>
  );
}

export default App;
