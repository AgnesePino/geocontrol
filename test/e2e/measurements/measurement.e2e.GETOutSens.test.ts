import request from "supertest";
import { app } from "@app";
import { generateToken } from "@services/authService";
import { beforeAllE2e, afterAllE2e, TEST_USERS } from "@test/e2e/lifecycle";
import { NetworkRepository } from "@repositories/NetworkRepository";
import { GatewayRepository } from "@repositories/GatewayRepository";
import { SensorRepository } from "@repositories/SensorRepository";
import { MeasurementRepository } from "@repositories/MeasurementRepository";

describe("GET /api/v1/networks/:networkCode/gateways/:gatewayMac/sensors/:sensorMac/outliers", () => {
  let token: string;
  const networkCode = "NET01";
  const gatewayMac = "71:B1:CE:01:C6:F0";
  const invalidNetworkCode = "INVALID_NET";
  const invalidGatewayMac = "00:00:00:00:00:00";
  const invalidSensorMac = "00:00:00:00:00:01";
  const sensorMac = "71:B1:CE:01:C6:A9";

  beforeAll(async () => {
    await beforeAllE2e();
    token = generateToken(TEST_USERS.admin);
    const networkRepo = new NetworkRepository();
    await networkRepo.createNetwork(networkCode, 'Test Network', 'Test Description');
    const gatewayRepo = new GatewayRepository();
    await gatewayRepo.createGateway(gatewayMac, networkCode, 'Test Gateway 1');
    const sensorRepo = new SensorRepository();
    await sensorRepo.createSensor(gatewayMac, { macAddress: sensorMac });
    const measurementRepo = new MeasurementRepository();
    await measurementRepo.storeMeasurement(networkCode, gatewayMac, sensorMac, { createdAt: new Date(), value: 100 }); // outlier
    await measurementRepo.storeMeasurement(networkCode, gatewayMac, sensorMac, { createdAt: new Date(), value: 25 });  // normale
  });

  afterAll(async () => {
    await afterAllE2e();
  });

  it("200 - restituisce solo gli outlier del sensore", async () => {
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}/sensors/${sensorMac}/outliers`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("sensorMacAddress", sensorMac);
    if (res.body.measurements !== undefined) {
      expect(Array.isArray(res.body.measurements)).toBe(true);
      for (const m of res.body.measurements) {
        expect(m).toHaveProperty("isOutlier", true);
      }
    }
  });

  it("200 - restituisce outlier filtrati per data", async () => {
    const startDate = "2025-02-18T15:00:00+01:00";
    const endDate = "2025-02-18T18:00:00+01:00";
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}/sensors/${sensorMac}/outliers`)
      .query({ startDate, endDate })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("sensorMacAddress", sensorMac);
    if (res.body.measurements !== undefined) {
      expect(Array.isArray(res.body.measurements)).toBe(true);
    }
  });

  it("200 - restituisce solo sensorMacAddress", async () => {
    const sensorRepo = new SensorRepository();
    const sensorMacNoOutlier = "AA:BB:CC:DD:EE:03";
    await sensorRepo.createSensor(gatewayMac, { macAddress: sensorMacNoOutlier });

    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}/sensors/${sensorMacNoOutlier}/outliers`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("sensorMacAddress", sensorMacNoOutlier);
    expect(res.body).not.toHaveProperty("measurements");
  });

  it("400 - errore formato startDate non valido", async () => {
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}/sensors/${sensorMac}/outliers`)
      .query({ startDate: "not-a-date" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("code", 400);
    expect(res.body).toHaveProperty("name", "Bad Request");
    expect(res.body).toHaveProperty("message");
  });

  it("400 - errore formato endDate non valido", async () => {
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}/sensors/${sensorMac}/outliers`)
      .query({ endDate: "not-a-date" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("code", 400);
    expect(res.body).toHaveProperty("name", "Bad Request");
    expect(res.body).toHaveProperty("message");
  });

  it("401 - senza autenticazione", async () => {
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}/sensors/${sensorMac}/outliers`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("code", 401);
    expect(res.body).toHaveProperty("name", "Unauthorized");
    expect(res.body).toHaveProperty("message");
  });

  it("404 - network non trovato", async () => {
    const res = await request(app)
      .get(`/api/v1/networks/${invalidNetworkCode}/gateways/${gatewayMac}/sensors/${sensorMac}/outliers`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("code", 404);
    expect(res.body).toHaveProperty("name", "NotFoundError");
    expect(res.body).toHaveProperty("message");
  });

  it("404 - gateway non trovato", async () => {
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/gateways/${invalidGatewayMac}/sensors/${sensorMac}/outliers`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("code", 404);
    expect(res.body).toHaveProperty("name", "NotFoundError");
    expect(res.body).toHaveProperty("message");
  });

  it("404 - sensore non trovato", async () => {
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}/sensors/${invalidSensorMac}/outliers`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("code", 404);
    expect(res.body).toHaveProperty("name", "NotFoundError");
    expect(res.body).toHaveProperty("message");
  });
});