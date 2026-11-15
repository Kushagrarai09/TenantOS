import request from "supertest";
import { app } from "../src/app";

describe("TenantOS health endpoint", () => {
  it("returns a healthy response", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status");
  });
});
