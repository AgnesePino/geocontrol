import request from "supertest";
import { app } from "@app";
import { generateToken } from "@services/authService";
import { beforeAllE2e, afterAllE2e, TEST_USERS } from "@test/e2e/lifecycle";
import { NetworkRepository } from "../../../src/repositories/NetworkRepository";

describe("GET /networks/:networkCode (e2e)", () => {
  let adminToken: string;
  let operatorToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    await beforeAllE2e();
    adminToken = generateToken(TEST_USERS.admin);
    operatorToken = generateToken(TEST_USERS.operator);
    viewerToken = generateToken(TEST_USERS.viewer);

    await request(app)
      .post("/api/v1/networks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: "NET01",
        name: "Alp Monitor",
        description: "Alpine Weather Monitoring Network"
      });
  });

  afterAll(async () => {
    await afterAllE2e();
  });

  it("should return 200 and the specific network (Admin)", async () => {
    const res = await request(app)
      .get("/api/v1/networks/NET01")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: "NET01",
      name: expect.any(String),
      description: expect.any(String)
    });

    if ("gateways" in res.body) {
      expect(Array.isArray(res.body.gateways)).toBe(true);
    }
  });

  it("should return 200 for Operator role", async () => {
    const res = await request(app)
      .get("/api/v1/networks/NET01")
      .set("Authorization", `Bearer ${operatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe("NET01");
  });

  it("should return 200 for Viewer role", async () => {
    const res = await request(app)
      .get("/api/v1/networks/NET01")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe("NET01");
  });

  it("should return 401 if token is missing", async () => {
    const res = await request(app).get("/api/v1/networks/NET01");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("code", 401);
    expect(res.body).toHaveProperty("name", "Unauthorized");
  });

  it("should return 401 if token is invalid", async () => {
    const res = await request(app)
      .get("/api/v1/networks/NET01")
      .set("Authorization", "Bearer invalid");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("code", 401);
    expect(res.body).toHaveProperty("name", "UnauthorizedError");
  });

  it("should return 404 if the network does not exist", async () => {
    const res = await request(app)
      .get("/api/v1/networks/NOT_FOUND")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("code", 404);
    expect(res.body).toHaveProperty("name", "NotFoundError");
  });

  it("should return 500 if internal server error occurs", async () => {
    const spy = jest
      .spyOn(NetworkRepository.prototype, "getNetworkByCode")
      .mockRejectedValueOnce(new Error("Simulated DB error"));

    const res = await request(app)
      .get("/api/v1/networks/NET01")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("code", 500);
    expect(res.body).toHaveProperty("name", "InternalServerError");
    expect(res.body).toHaveProperty("message", "Simulated DB error");

    spy.mockRestore();
  });
});
