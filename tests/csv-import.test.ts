/** Tests for CSV import validation and round-tripping exports. */

import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { runMigrations } from "../scripts/migrate";
import { seed } from "@/lib/seed";
import { exportCsv, parseHoursSpec, runImport } from "@/lib/csv-import";

beforeAll(async () => {
  await runMigrations();
  await seed({ log: () => {} });
});

describe("opening hours spec", () => {
  it("parses days, closed days and past-midnight closing", () => {
    expect(parseHoursSpec("mon=10:00-23:00; tue=closed; sat=16:00-01:00")).toEqual({ mon: [["10:00", "23:00"]], tue: [], sat: [["16:00", "01:00"]] });
    expect(parseHoursSpec("")).toBeNull();
    expect(parseHoursSpec("monday 10-11")).toBe("invalid");
    expect(parseHoursSpec("mon=25:00-26:00")).toBe("invalid");
  });
});

describe("product import", () => {
  it("rejects the whole file and lists row numbers when any row is bad", async () => {
    const csv = [
      "slug,name,name_zh,category,size,size_label,volume_ml,price_bdt,status,featured,description",
      "taro-milk-tea,Taro Milk Tea,,milk-tea,M,Medium,500,170,active,no,",
      "Bad Slug,Oops,,milk-tea,M,,,170,active,,",
      "mango-tea,Mango Tea,,no-such-category,L,,,120,,,",
      "x-tea,X Tea,,fruit-tea,L,,,abc,,,",
    ].join("\n");
    const r = await runImport("products", csv, { apply: true });
    expect(r.applied).toBe(false);
    expect(r.errors.map((e) => e.row)).toEqual([3, 4, 5]);
    const [taro] = await db.select().from(schema.products).where(eq(schema.products.slug, "taro-milk-tea"));
    expect(taro).toBeUndefined(); // nothing written
  });

  it("previews without writing, then applies", async () => {
    const csv = "slug,name,category,size,price_bdt\ntaro-milk-tea,Taro Milk Tea,milk-tea,M,170\ntaro-milk-tea,Taro Milk Tea,milk-tea,S,120\nboba-milk-tea,Boba Milk Tea,milk-tea,M,185";
    const preview = await runImport("products", csv, { apply: false });
    expect(preview.errors).toEqual([]);
    expect(preview.applied).toBe(false);
    expect(await db.select().from(schema.products).where(eq(schema.products.slug, "taro-milk-tea"))).toHaveLength(0);

    const r = await runImport("products", csv, { apply: true });
    expect(r.applied).toBe(true);
    const taro = await db.query.products.findFirst({ where: eq(schema.products.slug, "taro-milk-tea"), with: { variants: true } });
    expect(taro!.variants.map((v) => [v.sizeCode, v.pricePaisa]).sort()).toEqual([
      ["M", 17000],
      ["S", 12000],
    ]);
    expect(taro!.verification.status).toBe("needs_verification");
    // new products start unavailable at every branch
    const bps = await db.select().from(schema.branchProducts).where(eq(schema.branchProducts.productId, taro!.id));
    expect(bps.length).toBeGreaterThan(0);
    expect(bps.every((b) => !b.isAvailable)).toBe(true);
    // existing product price updated
    const boba = await db.query.products.findFirst({ where: eq(schema.products.slug, "boba-milk-tea"), with: { variants: true } });
    expect(boba!.variants.find((v) => v.sizeCode === "M")!.pricePaisa).toBe(18500);
  });

  it("reports missing columns", async () => {
    const r = await runImport("products", "slug,name\nx,y", { apply: true });
    expect(r.errors[0].message).toMatch(/Missing column/);
  });
});

describe("branch & inventory import", () => {
  it("updates branch hours and pins, refusing points outside Bangladesh", async () => {
    const bad = "slug,name,area,latitude,longitude\nrampura,CHAJOY Rampura,Rampura,51.5,-0.12";
    expect((await runImport("branches", bad, { apply: true })).errors[0].message).toMatch(/Bangladesh/);
    const good = "slug,name,area,address_line,latitude,longitude,location_precision,phone,opening_hours\nrampura,CHAJOY Rampura,Rampura,\"Bayyinah Ideal School, DIT Road, Rampura\",23.7627,90.4206,exact,+8801700000000,mon=11:00-23:00";
    const r = await runImport("branches", good, { apply: true });
    expect(r.errors).toEqual([]);
    const [b] = await db.select().from(schema.branches).where(eq(schema.branches.slug, "rampura"));
    expect(b.locationPrecision).toBe("exact");
    expect(b.openingHours).toEqual({ mon: [["11:00", "23:00"]] });
  });

  it("sets branch availability, price overrides and stock", async () => {
    const csv = "branch_slug,product_slug,size,available,price_bdt,track_stock,stock_qty\nbadda,boba-milk-tea,S,yes,125,yes,12\nbadda,lemon-black-tea,L,no,,,";
    const r = await runImport("inventory", csv, { apply: true });
    expect(r.errors).toEqual([]);
    const [badda] = await db.select().from(schema.branches).where(eq(schema.branches.slug, "badda"));
    const boba = await db.query.products.findFirst({ where: eq(schema.products.slug, "boba-milk-tea"), with: { variants: true } });
    const s = boba!.variants.find((v) => v.sizeCode === "S")!;
    const [inv] = await db.select().from(schema.branchInventory).where(and(eq(schema.branchInventory.branchId, badda.id), eq(schema.branchInventory.variantId, s.id)));
    expect(inv).toMatchObject({ pricePaisa: 12500, trackStock: true, stockQty: 12 });
    const lemon = await db.query.products.findFirst({ where: eq(schema.products.slug, "lemon-black-tea") });
    const [bp] = await db.select().from(schema.branchProducts).where(and(eq(schema.branchProducts.branchId, badda.id), eq(schema.branchProducts.productId, lemon!.id)));
    expect(bp.isAvailable).toBe(false);
  });

  it("rejects unknown sizes and products", async () => {
    const r = await runImport("inventory", "branch_slug,product_slug,size\nbadda,boba-milk-tea,XL\nbadda,nope,S\nnowhere,boba-milk-tea,S", { apply: true });
    expect(r.errors.map((e) => e.row)).toEqual([2, 3, 4]);
  });
});

describe("export", () => {
  it("round-trips: an exported products file imports cleanly", async () => {
    const csv = await exportCsv("products");
    expect(csv.split(/\r?\n/)[0]).toBe("slug,name,name_zh,category,size,size_label,volume_ml,price_bdt,status,featured,description");
    expect(csv).toContain("jasmine-peach-green-tea,Jasmine Peach Green Tea,茉莉桃桃茶,fruit-tea,L");
    const r = await runImport("products", csv, { apply: false });
    expect(r.errors).toEqual([]);
  });
});
