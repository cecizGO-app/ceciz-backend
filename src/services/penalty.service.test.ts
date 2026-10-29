/**
 * Unit tests for penalty.service.ts
 * These are pure function tests — no database required.
 */
import { describe, expect, it } from "vitest";
import {
	calcOverdueDays,
	calcPenalty,
	toWibDay,
} from "@/services/penalty.service";

// Helper: create a UTC date that represents a specific WIB calendar day
function wibDate(year: number, month: number, day: number, hour = 0): Date {
	// WIB = UTC+7, so WIB midnight = UTC 17:00 the previous day
	return new Date(Date.UTC(year, month - 1, day, hour - 7));
}

describe("toWibDay", () => {
	it("converts UTC midnight to WIB day boundary", () => {
		// UTC 2024-01-15 00:00 = WIB 2024-01-15 07:00 → WIB day = 2024-01-15
		const utc = new Date("2024-01-15T00:00:00Z");
		const day = toWibDay(utc);
		expect(day.toISOString()).toBe("2024-01-15T00:00:00.000Z");
	});

	it("UTC 17:00 = WIB midnight → same WIB day", () => {
		// UTC 2024-01-14T17:00 = WIB 2024-01-15T00:00
		const utc = new Date("2024-01-14T17:00:00Z");
		const day = toWibDay(utc);
		expect(day.toISOString()).toBe("2024-01-15T00:00:00.000Z");
	});

	it("UTC 16:59 = WIB 23:59 → previous WIB day", () => {
		// UTC 2024-01-14T16:59 = WIB 2024-01-14T23:59
		const utc = new Date("2024-01-14T16:59:00Z");
		const day = toWibDay(utc);
		expect(day.toISOString()).toBe("2024-01-14T00:00:00.000Z");
	});
});

describe("calcOverdueDays", () => {
	it("returns 0 when now is before deadline", () => {
		const deadline = new Date("2024-03-10T17:00:00Z"); // WIB 2024-03-11 midnight
		const now = new Date("2024-03-09T17:00:00Z"); // WIB 2024-03-10 midnight
		expect(calcOverdueDays(deadline, now)).toBe(0);
	});

	it("returns 0 when now is exactly on deadline day (WIB)", () => {
		const deadline = new Date("2024-03-10T17:00:00Z"); // WIB 2024-03-11
		const now = new Date("2024-03-10T17:00:00Z"); // WIB 2024-03-11
		expect(calcOverdueDays(deadline, now)).toBe(0);
	});

	it("returns 1 when overdue by 1 WIB day", () => {
		const deadline = new Date("2024-03-10T17:00:00Z"); // WIB 2024-03-11
		const now = new Date("2024-03-11T17:00:00Z"); // WIB 2024-03-12
		expect(calcOverdueDays(deadline, now)).toBe(1);
	});

	it("returns 5 when overdue by 5 WIB days", () => {
		const deadline = new Date("2024-03-10T17:00:00Z"); // WIB 2024-03-11
		const now = new Date("2024-03-15T17:00:00Z"); // WIB 2024-03-16
		expect(calcOverdueDays(deadline, now)).toBe(5);
	});

	it("handles midnight WIB boundary correctly (no partial-day overage)", () => {
		// Deadline = WIB 2024-01-20 midnight = UTC 2024-01-19T17:00
		const deadline = new Date("2024-01-19T17:00:00Z");
		// Now = WIB 2024-01-20 23:59 = UTC 2024-01-20T16:59
		const now = new Date("2024-01-20T16:59:00Z");
		// Same WIB day as deadline → 0 overdue days
		expect(calcOverdueDays(deadline, now)).toBe(0);
	});
});

describe("calcPenalty", () => {
	it("returns 0 when not overdue", () => {
		const deadline = new Date("2024-03-10T17:00:00Z"); // WIB 2024-03-11
		const now = new Date("2024-03-09T17:00:00Z"); // WIB 2024-03-10
		expect(calcPenalty(deadline, 2000, false, now)).toBe(0);
	});

	it("returns correct penalty for 3 overdue days", () => {
		const deadline = new Date("2024-03-10T17:00:00Z"); // WIB 2024-03-11
		const now = new Date("2024-03-13T17:00:00Z"); // WIB 2024-03-14 → 3 days over
		expect(calcPenalty(deadline, 2000, false, now)).toBe(6000);
	});

	it("returns 0 when waived even if overdue", () => {
		const deadline = new Date("2024-03-10T17:00:00Z");
		const now = new Date("2024-03-15T17:00:00Z"); // 5 days overdue
		expect(calcPenalty(deadline, 2000, true, now)).toBe(0);
	});

	it("uses penaltyPerDay=0 → always 0", () => {
		const deadline = new Date("2024-03-10T17:00:00Z");
		const now = new Date("2024-03-15T17:00:00Z");
		expect(calcPenalty(deadline, 0, false, now)).toBe(0);
	});

	it("calculates penalty with custom penaltyPerDay", () => {
		const deadline = new Date("2024-03-10T17:00:00Z"); // WIB 2024-03-11
		const now = new Date("2024-03-12T17:00:00Z"); // WIB 2024-03-13 → 2 days
		expect(calcPenalty(deadline, 5000, false, now)).toBe(10000);
	});
});
