import { describe, expect, it } from "vitest";
import { createBatchSchema, updateBatchSchema } from "./batches.schema.js";

describe("batches.schema validation", () => {
	it("allows hargaAsli = 0 when admin adds empty rows or uses bulk Total PC selector", () => {
		const payload = {
			countryCode: "CH",
			batchNumber: 5,
			batchDate: "2026-11-24",
			title: "WTS Album Chenle Digipack Ver",
			shippingFee: 15,
			feeGo: 25000,
			feeRekap: 6000,
			feeNyelem: 2000,
			rateHarian: 2250,
			rateSeller: 2200,
			feeWh: 15000,
			feeProxy: 10000,
			items: [
				{
					buyerId: "b_01",
					buyerName: "Nadia Putri",
					description: "Chenle Set A",
					hargaAsli: 85,
					pcs: 1,
				},
				{
					buyerId: "b_02",
					description: "",
					hargaAsli: 0,
					pcs: 1,
				},
			],
		};

		const parsed = createBatchSchema.safeParse(payload);
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.items?.[1]?.hargaAsli).toBe(0);
			expect(parsed.data.items?.[1]?.description).toBe("Item");
		}
	});

	it("treats rateHarian = 0 or empty string as null instead of throwing 400", () => {
		const payload = {
			countryCode: "INA",
			batchNumber: 1,
			batchDate: "2026-11-24",
			title: "Batch Ready INA",
			rateHarian: 0,
			rateSeller: "",
		};

		const parsed = createBatchSchema.safeParse(payload);
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.rateHarian).toBeNull();
			expect(parsed.data.rateSeller).toBeNull();
		}
	});

	it("rejects negative hargaAsli", () => {
		const parsed = updateBatchSchema.safeParse({
			items: [
				{
					buyerId: "b_01",
					description: "Test",
					hargaAsli: -10,
					pcs: 1,
				},
			],
		});
		expect(parsed.success).toBe(false);
	});
});
