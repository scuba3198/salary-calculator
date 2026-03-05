import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAppState, dispatch } from "../hooks/useAppRuntime";
import { getMonthDays, getNepaliMonthName } from "../utils/nepali-calendar";

const Calendar = () => {
	const state = useAppState();
	const { viewYear, viewMonth, markedDates, currentDate, isSyncing } = state;

	const { startWeekday, daysInMonth } = getMonthDays(viewYear, viewMonth);
	const monthName = getNepaliMonthName(viewMonth);

	const isMarked = (y: number, m: number, d: number) => !!markedDates[`${y}-${m + 1}-${d}`];

	const handlePrev = () => {
		if (viewMonth === 0) {
			dispatch({ _tag: "SetViewMonth", month: 11 });
			dispatch({ _tag: "SetViewYear", year: viewYear - 1 });
		} else {
			dispatch({ _tag: "SetViewMonth", month: viewMonth - 1 });
		}
	};

	const handleNext = () => {
		if (viewMonth === 11) {
			dispatch({ _tag: "SetViewMonth", month: 0 });
			dispatch({ _tag: "SetViewYear", year: viewYear + 1 });
		} else {
			dispatch({ _tag: "SetViewMonth", month: viewMonth + 1 });
		}
	};

	const onToggle = (day: number) => {
		dispatch({ _tag: "ToggleDate", year: viewYear, month: viewMonth, day });
	};

	const isToday = (day: number) =>
		currentDate.year === viewYear && currentDate.month === viewMonth && currentDate.day === day;

	return (
		<div className="calendar-panel">
			<div className="calendar-header">
				<div className="calendar-title">
					<h2>{monthName}</h2>
					<span>{viewYear} BS</span>
				</div>
				<div className="calendar-nav">
					<button type="button" onClick={handlePrev} className="icon-btn" title="Previous Month">
						<ChevronLeft size={20} />
					</button>
					<button type="button" onClick={handleNext} className="icon-btn" title="Next Month">
						<ChevronRight size={20} />
					</button>
				</div>
			</div>

			<div className="calendar-grid">
				{["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
					<div key={d} className="weekday-label">
						{d}
					</div>
				))}

				{Array.from({ length: startWeekday }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: stable for a given view month
					<div key={`empty-${viewYear}-${viewMonth}-${i}`} className="calendar-day disabled" />
				))}

				{Array.from({ length: daysInMonth }).map((_, i) => {
					const day = i + 1;
					const marked = isMarked(viewYear, viewMonth, day);
					const today = isToday(day);

					return (
						<button
							key={`${viewYear}-${viewMonth}-${day}`}
							type="button"
							onClick={() => onToggle(day)}
							disabled={isSyncing}
							className={`calendar-day ${marked ? "marked" : ""} ${today ? "today" : ""}`}
							style={{ cursor: isSyncing ? "wait" : "pointer" }}
						>
							<span className="day-number">{day}</span>
							{marked && <div className="mark-indicator" />}
						</button>
					);
				})}
			</div>
		</div>
	);
};

export default Calendar;
