import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatPhone,
  formatZipCode,
  formatSquareFeet,
} from "./format";

describe("formatCurrency", () => {
  it("formats positive amounts correctly", () => {
    expect(formatCurrency(100)).toBe("$100.00");
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats decimal amounts correctly", () => {
    expect(formatCurrency(99.9)).toBe("$99.90");
    expect(formatCurrency(99.99)).toBe("$99.99");
  });
});

describe("formatPhone", () => {
  it("formats 10-digit phone numbers", () => {
    expect(formatPhone("4805550100")).toBe("(480) 555-0100");
    expect(formatPhone("1234567890")).toBe("(123) 456-7890");
  });

  it("returns original string for non-standard formats", () => {
    expect(formatPhone("123456")).toBe("123456");
    expect(formatPhone("12345678901")).toBe("12345678901");
  });

  it("handles phone numbers with existing formatting", () => {
    expect(formatPhone("(480) 555-0100")).toBe("(480) 555-0100");
    expect(formatPhone("480-555-0100")).toBe("(480) 555-0100");
  });
});

describe("formatZipCode", () => {
  it("formats 5-digit zip codes", () => {
    expect(formatZipCode("85234")).toBe("85234");
  });

  it("formats 9-digit zip codes with dash", () => {
    expect(formatZipCode("852341234")).toBe("85234-1234");
  });

  it("returns original string for non-standard formats", () => {
    expect(formatZipCode("8523")).toBe("8523");
    expect(formatZipCode("ABC")).toBe("ABC");
  });
});

describe("formatSquareFeet", () => {
  it("formats square footage with commas", () => {
    expect(formatSquareFeet(1500)).toBe("1,500 sq ft");
    expect(formatSquareFeet(2500)).toBe("2,500 sq ft");
    expect(formatSquareFeet(10000)).toBe("10,000 sq ft");
  });

  it("handles small values", () => {
    expect(formatSquareFeet(500)).toBe("500 sq ft");
    expect(formatSquareFeet(0)).toBe("0 sq ft");
  });
});
