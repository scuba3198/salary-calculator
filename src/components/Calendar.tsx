import { ChevronLeft, ChevronRight } from "lucide-react";
import type React from "react";
import { useAppStore } from "../store";
import { getMonthDays, getNepaliMonthName } from "../utils/nepali-calendar";

const Calendar = () => {
	const {
		viewYear,
		setViewYear,
		viewMonth,
		setViewMonth,
		toggleDate,
		isMarked,
		currentDate,
		isSyncing,
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
		const isToday =
			viewYear === currentDate.year && viewMonth === currentDate.month && d === currentDate.day;
		const isSaturday = (startWeekday + d - 1) % 7 === 6;

		days.push(
			<button
				type="button"
				key={d}
				className={`calendar-day ${isActive ? "active" : ""} ${isToday ? "today" : ""} ${isSaturday ? "is-holiday" : ""}`}
				onClick={() => toggleDate(viewYear, viewMonth, d)}
			>
				{d}
			</button>,
		);
	}

	return (
		<div>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "2rem",
					paddingBottom: "1rem",
					borderBottom: "1px solid var(--border-light)",
				}}
			>
				<button type="button" onClick={handlePrev} className="icon-btn">
					<ChevronLeft size={32} strokeWidth={1} />
				</button>
				<div
					style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}
				>
					<h2
						style={{
							fontSize: "3rem",
							lineHeight: "1",
							textTransform: "uppercase",
							letterSpacing: "0.02em",
						}}
					>
						{getNepaliMonthName(viewMonth)}
					</h2>
					<span
						style={{
							fontFamily: "var(--font-body)",
							letterSpacing: "0.2em",
							opacity: 0.5,
							textTransform: "uppercase",
							fontSize: "0.9rem",
						}}
					>
						{viewYear}
						{isSyncing && (
							<span style={{ color: "var(--accent)", marginLeft: "0.5rem" }}>[SYNC]</span>
						)}
					</span>
				</div>
				<button type="button" onClick={handleNext} className="icon-btn">
					<ChevronRight size={32} strokeWidth={1} />
				</button>
			</div>

			<div className="calendar-grid">
				{weekDays.map((day) => (
					<div key={day} className="calendar-header">
						{day}
					</div>
				))}
			</div>
			<div className="calendar-grid">{days}</div>
		</div>
	);
};

export default Calendar;
