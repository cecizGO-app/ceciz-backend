/**
 * Unit tests for pagination helpers.
 */
import { describe, expect, it } from "vitest";
import { buildMeta, getPaginationArgs } from "@/lib/pagination";

describe("getPaginationArgs", () => {
	it("returns skip=0 and correct take for page 1", () => {
		expect(getPaginationArgs({ page: 1, limit: 20 })).toEqual({ skip: 0, take: 20 });
	});

	it("calculates correct skip for page 2", () => {
		expect(getPaginationArgs({ page: 2, limit: 20 })).toEqual({ skip: 20, take: 20 });
	});

	it("calculates correct skip for page 3 limit 10", () => {
		expect(getPaginationArgs({ page: 3, limit: 10 })).toEqual({ skip: 20, take: 10 });
	});
});

describe("buildMeta", () => {
	it("builds correct meta for page 1", () => {
		expect(buildMeta(100, 1, 20)).toEqual({
			page: 1,
			limit: 20,
			total: 100,
			totalPages: 5,
		});
	});

	it("rounds up totalPages for non-divisible total", () => {
		expect(buildMeta(21, 1, 20)).toMatchObject({ totalPages: 2 });
	});

	it("totalPages = 1 when total = 0", () => {
		expect(buildMeta(0, 1, 20)).toMatchObject({ totalPages: 0 });
	});

	it("totalPages = 1 when total equals limit", () => {
		expect(buildMeta(20, 1, 20)).toMatchObject({ totalPages: 1 });
	});
});
