declare module "nepali-date-converter" {
	export default class NepaliDate {
		constructor();
		constructor(year: number, month: number, day: number);
		getYear(): number;
		getMonth(): number;
		getDate(): number;
		getDay(): number; // weekday 0-6
	}
}
