import request from "supertest";
import { app } from "@app";
import { generateToken } from "@services/authService";
import { beforeAllE2e, afterAllE2e, TEST_USERS } from "@test/e2e/lifecycle";
import { NetworkRepository } from "../../../src/repositories/NetworkRepository";

describe("POST /networks (e2e)", () => {
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

  it("should create a new network with admin token", async () => {
    const res = await request(app)
      .post("/api/v1/networks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: "NET100",
        name: "AdminNetwork",
        description: "Created by Admin"
      });

    expect(res.status).toBe(201);
  });

  it("should create a new network with operator token", async () => {
    const res = await request(app)
      .post("/api/v1/networks")
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({
        code: "NET101",
        name: "OperatorNetwork",
        description: "Created by Operator"
      });

    expect(res.status).toBe(201);
  });

  it("should return 403 if viewer tries to create network", async () => {
    const res = await request(app)
      .post("/api/v1/networks")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({
        code: "NET102",
        name: "Forbidden",
        description: "Viewer cannot create"
      });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("code", 403);
    expect(res.body).toHaveProperty("name", "InsufficientRightsError");
  });

  it("should return 401 if token is missing", async () => {
    const res = await request(app)
      .post("/api/v1/networks")
      .send({
        code: "NET103",
        name: "NoToken",
        description: "Missing token"
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("code", 401);
    expect(res.body).toHaveProperty("name", "Unauthorized");
  });

  it("should return 409 if code already exists", async () => {
    await request(app)
      .post("/api/v1/networks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: "NET104",
        name: "AlreadyExists",
        description: "Initial"
      });

    const res = await request(app)
      .post("/api/v1/networks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: "NET104",
        name: "Conflict",
        description: "Duplicate"
      });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("code", 409);
    expect(res.body).toHaveProperty("name", "ConflictError");
  });

  it("should return 400 for invalid input", async () => {
    const res = await request(app)
      .post("/api/v1/networks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({}); 

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("code", 400);
    expect(res.body.name).toMatch(/Bad\s?Request/i);
  });

  it("should return 400 if code is only whitespace (trigger line 67)", async () => {
    const res = await request(app)
      .post("/api/v1/networks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: "   ",
        name: "InvalidCode",
        description: "This should trigger trim validation"
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("code", 400);
    expect(res.body.name).toMatch(/Bad Request|Error/i);
    expect(res.body).toHaveProperty("message", "Invalid input data");
  });


  it("should return 500 on internal server error", async () => {
    const spy = jest
      .spyOn(NetworkRepository.prototype, "createNetwork")
      .mockRejectedValueOnce(new Error("Simulated DB error"));

    const res = await request(app)
      .post("/api/v1/networks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: "NET105",
        name: "CrashTest",
        description: "Trigger 500"
      });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("code", 500);
    expect(res.body).toHaveProperty("name", "InternalServerError");
    expect(res.body).toHaveProperty("message", "Simulated DB error");

    spy.mockRestore();
  });
});
