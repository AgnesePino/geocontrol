import request from "supertest";
import { app } from "@app";
import { generateToken } from "@services/authService";
import { beforeAllE2e, afterAllE2e, TEST_USERS } from "@test/e2e/lifecycle";
import { NetworkRepository } from "../../../src/repositories/NetworkRepository";

describe("DELETE /networks/:networkCode (e2e)", () => {
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
        code: "NETDEL",
        name: "To be deleted",
        description: "This will be removed"
      });
  });

  afterAll(async () => {
    await afterAllE2e();
  });

  it("should delete a network with admin token", async () => {
    await request(app)
      .post("/api/v1/networks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: "DELADMIN",
        name: "Admin's network"
      });

    const res = await request(app)
      .delete("/api/v1/networks/DELADMIN")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it("should delete a network with operator token", async () => {
    await request(app)
      .post("/api/v1/networks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: "DELOP",
        name: "Operator's network"
      });

    const res = await request(app)
      .delete("/api/v1/networks/DELOP")
      .set("Authorization", `Bearer ${operatorToken}`);

    expect(res.status).toBe(204);
  });

  it("should return 401 if token is missing", async () => {
    const res = await request(app).delete("/api/v1/networks/NETDEL");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("code", 401);
    expect(res.body).toHaveProperty("name", "Unauthorized");
  });

  it("should return 403 if viewer tries to delete", async () => {
    const viewerToken = generateToken(TEST_USERS.viewer);

    const res = await request(app)
      .delete("/api/v1/networks/NETDEL")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("code", 403);
    expect(res.body).toHaveProperty("name", "InsufficientRightsError");
  });

  it("should return 404 if network does not exist", async () => {
    const res = await request(app)
      .delete("/api/v1/networks/NONEXISTENT")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("code", 404);
    expect(res.body).toHaveProperty("name", "NotFoundError");
  });

  it("should return 405 if networkCode is malformed", async () => {
    const res = await request(app)
      .delete("/api/v1/networks/") 
      .set("Authorization", `Bearer ${adminToken}`);
    expect([405]).toContain(res.status);
  });

  it("should return 500 if internal server error occurs", async () => {
    const spy = jest
      .spyOn(NetworkRepository.prototype, "deleteNetwork")
      .mockRejectedValueOnce(new Error("Simulated DB error"));

    const res = await request(app)
      .delete("/api/v1/networks/NETDEL")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("code", 500);
    expect(res.body).toHaveProperty("name", "InternalServerError");

    spy.mockRestore();
  });
});
