import NepaliDate from "nepali-date-converter";
import type { MonthInfo, NepaliDate as NepaliDateType } from "../types/app.types";

/**
 * Finds the total days in a month using a recursive approach to eliminate 'let' and 'for' loops.
 * The library overflows days to the next month, which we use as the termination signal.
 */
const findDaysInMonth = (year: number, month: number, day = 1): number => {
	const checkDate = new NepaliDate(year, month, day);
	// If day > 32 or the month is different, then (day - 1) was the total.
	return day > 32 || checkDate.getMonth() !== month
		? day - 1
		: findDaysInMonth(year, month, day + 1);
};

export const getMonthDays = (year: number, month: number): MonthInfo => {
	const firstDay = new NepaliDate(year, month, 1);
	const startWeekday = firstDay.getDay(); // 0 to 6

	return {
		year,
		month,
		startWeekday,
		daysInMonth: findDaysInMonth(year, month),
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
	return mapping[monthIndex % 12] || "";
};

export const getCurrentDate = (): NepaliDateType => {
	const now = new NepaliDate();
	return {
		year: now.getYear(),
		month: now.getMonth(),
		day: now.getDate(),
	};
};
