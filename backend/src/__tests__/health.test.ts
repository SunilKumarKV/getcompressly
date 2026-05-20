import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../config/prisma.js";

vi.spyOn(prisma, "$queryRaw").mockResolvedValue([{ "?column?": 1 }] as never);

describe("health route", () => {
  it("returns ok", async () => {
    const response = await request(createApp()).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });
});
