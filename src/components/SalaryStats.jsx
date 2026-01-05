import React from 'react';
import { useAppStore } from '../store';
import { DollarSign, Clock, Banknote } from 'lucide-react';

const SalaryStats = () => {
    const {
        hourlyRate, setHourlyRate,
        dailyHours, setDailyHours,
        tdsPercentage, setTdsPercentage,
        getMonthlyStats
    } = useAppStore();

    const stats = getMonthlyStats();

    return (
        <div className="stats-container">
            <div className="glass-card stat-box">
                <div className="flex-center mb-4">
                    <Banknote size={32} color="var(--success)" />
                </div>
                <h2>Monthly Total</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div className="text-xl" style={{ color: 'var(--text-secondary)' }}>
                        Total Days: <span style={{ color: 'var(--text-primary)' }}>{stats.daysWorked}</span>
                    </div>
                    <div className="text-xl" style={{ color: 'var(--text-secondary)' }}>
                        Total Hours: <span style={{ color: 'var(--text-primary)' }}>{stats.totalHours}</span>
                    </div>
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                            <span>Gross:</span> <span>Rs. {stats.grossSalary.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                            <span>TDS ({tdsPercentage}%):</span> <span>- Rs. {stats.tdsAmount.toLocaleString()}</span>
                        </div>
                    </div>

                    <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '0.5rem' }}>
                        <span style={{ fontSize: '3rem', fontWeight: 'bold', background: 'var(--success)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundImage: 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)' }}>
                            Rs. {stats.netSalary.toLocaleString()}
                        </span>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Net Salary</div>
                    </div>
                </div>
            </div>

            <div className="glass-card stat-box">
                <div className="flex-center mb-4">
                    <Clock size={32} color="var(--accent-color)" />
                </div>
                <h2>Settings</h2>
                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label>Hourly Rate (Rs)</label>
                        <input
                            type="number"
                            min="0"
                            value={hourlyRate || ''}
                            placeholder="0"
                            onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                            onChange={(e) => setHourlyRate(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                        />
                    </div>
                    <div>
                        <label>Daily Hours</label>
                        <input
                            type="number"
                            min="0"
                            max="24"
                            value={dailyHours || ''}
                            placeholder="0"
                            onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                            onChange={(e) => setDailyHours(e.target.value === '' ? 0 : Math.max(0, Math.min(24, Number(e.target.value))))}
                        />
                    </div>
                    <div>
                        <label>TDS (%)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={tdsPercentage ?? ''}
                            placeholder="0"
                            onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                            onChange={(e) => setTdsPercentage(e.target.value === '' ? '' : Math.max(0, Math.min(100, Number(e.target.value))))}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalaryStats;
