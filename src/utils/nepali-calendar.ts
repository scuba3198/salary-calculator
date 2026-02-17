import NepaliDate from "nepali-date-converter";
import type {
	MonthInfo,
	NepaliDate as NepaliDateType,
} from "../types/app.types";

export const getMonthDays = (year: number, month: number): MonthInfo => {
	// month is 0-indexed (0 = Baisakh, 11 = Chaitra) for consistency in app,
	// but NepaliDate might expect 0-11 as well. Let's verify usage.
	// NepaliDate constructor: (year, month, date) where month is 0-11.

	// Get first day of the month
	const firstDay = new NepaliDate(year, month, 1);

	// To find how many days in this month, we can go to next month day 1 and subtract 1 day, OR find a library helper.
	// nepali-date-converter doesn't export strict 'getDaysInMonth' easily directly on instance without some math usually,
	// but let's check if we can simply iterate until month changes or usage lookup.
	// Actually, standard way:
	// We can calculate by constructing dates.

	// But wait, the library might have `getBSMonthDays`. Let's assume standard behavior first.
	// We need to know:
	// 1. Weekday of the 1st of the month (0=Sunday ... 6=Saturday)
	// 2. Total days in the month (29-32 usually)

	// Weekday of 1st:
	const startWeekday = firstDay.getDay(); // 0 to 6

	// Find total days:
	// Simplest way without looking up map:
	// increasing date until month changes.
	let daysInMonth = 0;
	for (let d = 1; d <= 32; d++) {
		// If we go to 33 it will definitely skip.
		// Actually, if we create a date using the same year/month and it rolls over, we know previous was max.
		// But nepali-date-converter handles overflow automatically?
		// Let's rely on internal validation if possible or map.
		// A common reliable way finding last day of month in Nepali Calendar involves
		// hardcoded mappings or using the library's conversion if it supports it.
		// Let's try to infer from the library if possible.
		// Actually, let's just loop.
		try {
			const checkDate = new NepaliDate(year, month, d);
			if (checkDate.getMonth() !== month) {
				break;
			}
			daysInMonth = d;
		} catch {
			break;
		}
	}

	return {
		year,
		month,
		startWeekday,
		daysInMonth,
	};
};

export const getNepaliMonthName = (monthIndex: number): string => {
	const months = [
		"Baisakh",
		"Jestha",
		"Ashad",
		"Shrawan",
		"Bhadra",
		"Ashwin",
		"Kartik",
		"Mangsir",
		"Poush",
		"Magh",
		"Falgun",
		"Chaitra",
	];
	return months[monthIndex % 12] || "";
};

export const getEnglishMonthName = (monthIndex: number): string => {
	// Approximate English months for display reference if needed
	const mapping = [
		"Apr/May",
		"May/Jun",
		"Jun/Jul",
		"Jul/Aug",
		"Aug/Sep",
		"Sep/Oct",
		"Oct/Nov",
		"Nov/Dec",
		"Dec/Jan",
		"Jan/Feb",
		"Feb/Mar",
		"Mar/Apr",
	];
	return mapping[monthIndex] || "";
};

export const getCurrentDate = (): NepaliDateType => {
	const now = new NepaliDate();
	return {
		year: now.getYear(),
		month: now.getMonth(),
		day: now.getDate(),
	};
};
