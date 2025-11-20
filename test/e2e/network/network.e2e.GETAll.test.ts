import request from "supertest";
import { app } from "@app";
import { generateToken } from "@services/authService";
import { beforeAllE2e, afterAllE2e, TEST_USERS } from "@test/e2e/lifecycle";
import { NetworkRepository } from "../../../src/repositories/NetworkRepository";

describe("GET /networks (e2e)", () => {
  let adminToken: string;
  let operatorToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    await beforeAllE2e();
    adminToken = generateToken(TEST_USERS.admin);
    operatorToken = generateToken(TEST_USERS.operator);
    viewerToken = generateToken(TEST_USERS.viewer);
  });

  afterAll(async () => {
    await afterAllE2e();
  });

  it("should return 200 and a list of all networks for Admin", async () => {
    const res = await request(app)
      .get("/api/v1/networks")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      const network = res.body[0];
      expect(network).toHaveProperty("code");
      expect(network).toHaveProperty("name");
      expect(network).toHaveProperty("description");
      expect(network).toHaveProperty("gateways");
      expect(Array.isArray(network.gateways)).toBe(true);
    }
  });

  it("should return 200 for Operator role", async () => {
    const res = await request(app)
      .get("/api/v1/networks")
      .set("Authorization", `Bearer ${operatorToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should return 200 for Viewer role", async () => {
    const res = await request(app)
      .get("/api/v1/networks")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should return 401 if token is missing", async () => {
    const res = await request(app).get("/api/v1/networks");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("code", 401);
    expect(res.body).toHaveProperty("name", "Unauthorized");
    expect(res.body).toHaveProperty("message");
  });

  it("should return 401 if token is invalid", async () => {
    const res = await request(app)
      .get("/api/v1/networks")
      .set("Authorization", "Bearer invalid-token");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("code", 401);
    expect(res.body).toHaveProperty("name", "UnauthorizedError");
    expect(res.body).toHaveProperty("message");
  });

  it("should return 500 if internal server error occurs", async () => {
    const spy = jest
      .spyOn(NetworkRepository.prototype, "getAllNetworks")
      .mockRejectedValueOnce(new Error("Simulated DB error"));

    const res = await request(app)
      .get("/api/v1/networks")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("code", 500);
    expect(res.body).toHaveProperty("name", "InternalServerError");
    expect(res.body).toHaveProperty("message", "Simulated DB error");

    spy.mockRestore();
  });
});
