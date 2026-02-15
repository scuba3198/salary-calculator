import React from 'react';
import { useAppStore } from '../store';
import { getMonthDays, getNepaliMonthName } from '../utils/nepali-calendar';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Calendar = () => {
    const {
        viewYear, setViewYear,
        viewMonth, setViewMonth,
        toggleDate, isMarked, currentDate,
        isSyncing
    } = useAppStore();

    const { startWeekday, daysInMonth } = getMonthDays(viewYear, viewMonth);

    // Weekday headers
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const handlePrev = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(viewYear - 1);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const handleNext = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(viewYear + 1);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    // Generate grid items
    const days: React.ReactNode[] = [];
    // Empty slots for start offset
    for (let i = 0; i < startWeekday; i++) {
        days.push(<div key={`empty-${i}`} className="calendar-day disabled" />);
    }
    // Details
    for (let d = 1; d <= daysInMonth; d++) {
        const isActive = isMarked(viewYear, viewMonth, d);
        const isToday = viewYear === currentDate.year && viewMonth === currentDate.month && d === currentDate.day;
        const isSaturday = (startWeekday + d - 1) % 7 === 6;

        days.push(
            <div
                key={d}
                className={`calendar-day ${isActive ? 'active' : ''} ${isToday ? 'today' : ''} ${isSaturday ? 'is-holiday' : ''}`}
                onClick={() => toggleDate(viewYear, viewMonth, d)}
            >
                {d}
            </div>
        );
    }

    return (
        <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <button onClick={handlePrev}><ChevronLeft /></button>
                <h2>
                    {getNepaliMonthName(viewMonth)} {viewYear}
                    {isSyncing && <span style={{ fontSize: '0.8rem', marginLeft: '1rem', color: 'var(--accent-color)', fontWeight: 'normal' }}>Syncing...</span>}
                </h2>
                <button onClick={handleNext}><ChevronRight /></button>
            </div>

            <div className="calendar-grid">
                {weekDays.map(day => (
                    <div key={day} className="calendar-header">{day}</div>
                ))}
            </div>
            <div className="calendar-grid" style={{ marginTop: '0.5rem' }}>
                {days}
            </div>
        </div>
    );
};

export default Calendar;
