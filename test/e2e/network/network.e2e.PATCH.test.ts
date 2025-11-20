import request from "supertest";
import { app } from "@app";
import { generateToken } from "@services/authService";
import { beforeAllE2e, afterAllE2e, TEST_USERS } from "@test/e2e/lifecycle";
import { NetworkRepository } from "../../../src/repositories/NetworkRepository";

describe("PATCH /networks/:networkCode (e2e)", () => {
  let adminToken: string;
  let operatorToken: string;

  beforeAll(async () => {
    await beforeAllE2e();
    adminToken = generateToken(TEST_USERS.admin);
    operatorToken = generateToken(TEST_USERS.operator);

    await request(app)
      .post("/api/v1/networks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: "NET01",
        name: "Initial Network",
        description: "Original description"
      });
  });

  afterAll(async () => {
    await afterAllE2e();
  });

  it("should update a network with admin token", async () => {
    const res = await request(app)
      .patch("/api/v1/networks/NET01")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: "NEW01",
        name: "Updated Network",
        description: "Updated via PATCH"
      });

    expect(res.status).toBe(204);
  });

  it("should update a network with operator token", async () => {
    await request(app)
      .post("/api/v1/networks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: "NET02",
        name: "Another One",
        description: "Operator editable"
      });

    const res = await request(app)
      .patch("/api/v1/networks/NET02")
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({
        name: "Edited by operator",
        description: "Updated"
      });

    expect(res.status).toBe(204);
  });

  it("should return 401 if token is missing", async () => {
    const res = await request(app)
      .patch("/api/v1/networks/NET01")
      .send({
        name: "No token update"
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("code", 401);
    expect(res.body).toHaveProperty("name", "Unauthorized");
  });

  it("should return 403 if viewer tries to update", async () => {
    const viewerToken = generateToken(TEST_USERS.viewer);
    const res = await request(app)
      .patch("/api/v1/networks/NET01")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({
        name: "Should not update"
      });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("code", 403);
    expect(res.body).toHaveProperty("name", "InsufficientRightsError");
  });

  it("should return 404 if network does not exist", async () => {
    const res = await request(app)
      .patch("/api/v1/networks/UNKNOWN")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Non existent"
      });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("code", 404);
    expect(res.body).toHaveProperty("name", "NotFoundError");
  });

  it("should return 409 if new code is already in use", async () => {
    await request(app)
      .post("/api/v1/networks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: "NET03",
        name: "Code Owner",
        description: "Conflict test"
      });

    const res = await request(app)
      .patch("/api/v1/networks/NEW01")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: "NET03"
      });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("code", 409);
    expect(res.body).toHaveProperty("name", "ConflictError");
  });

  it("should return 400 for invalid input", async () => {
    const res = await request(app)
      .patch("/api/v1/networks/NET01")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: ""
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("code", 400);
    expect(res.body).toHaveProperty("name", "Bad Request");
  });

  it("should return 400 if the updated code is an empty string", async () => {
    await request(app)
      .post("/api/v1/networks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: "NETBAD",
        name: "To be tested",
        description: "Initial description"
      });

    const res = await request(app)
      .patch("/api/v1/networks/NETBAD")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: "   "
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("code", 400);
    expect(res.body.name).toMatch(/Bad Request|Error/i);
    expect(res.body).toHaveProperty("message", "Invalid input data");
  });

    it("should return 400 for invalid input", async () => {
    const res = await request(app)
      .patch("/api/v1/networks/NET01")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: "" 
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("code", 400);
    expect(res.body).toHaveProperty("name", "Bad Request");
  });

  
  it("should return 500 if internal server error occurs", async () => {
    const spy = jest
      .spyOn(NetworkRepository.prototype, "updateNetwork")
      .mockRejectedValueOnce(new Error("Simulated DB error"));

    const res = await request(app)
      .patch("/api/v1/networks/NET01")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Error test"
      });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("code", 500);
    expect(res.body).toHaveProperty("name", "InternalServerError");

    spy.mockRestore();
  });

  it("should ignore gateways and sensors in the request body", async () => {
    await request(app)
      .post("/api/v1/networks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: "NETIGN",
        name: "To be updated",
        description: "Testing nested fields"
      });

    const res = await request(app)
      .patch("/api/v1/networks/NETIGN")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Updated Ignored Fields",
        gateways: [
          {
            macAddress: "FA:KE:AD:DR:00:01",
            name: "NestedGateway",
            sensors: [
              {
                macAddress: "FA:KE:AD:DR:00:02",
                name: "FakeSensor",
                variable: "temperature",
                unit: "C"
              }
            ]
          }
        ]
      });

    expect(res.status).toBe(204);
  });


});