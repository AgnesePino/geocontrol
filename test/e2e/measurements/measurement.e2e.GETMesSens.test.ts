import request from "supertest";
import { app } from "@app";
import { generateToken } from "@services/authService";
import { beforeAllE2e, afterAllE2e, TEST_USERS } from "@test/e2e/lifecycle";
import { NetworkRepository } from "@repositories/NetworkRepository";
import { GatewayRepository } from "@repositories/GatewayRepository";
import { SensorRepository } from "@repositories/SensorRepository";
import { MeasurementRepository } from "@repositories/MeasurementRepository";

describe("GET /api/v1/networks/:networkCode/gateways/:gatewayMac/sensors/:sensorMac/measurements", () => {
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
    await measurementRepo.storeMeasurement(networkCode, gatewayMac, sensorMac, { createdAt: new Date(), value: 25 });
    
  });

  afterAll(async () => {
    await afterAllE2e();
  });

  it("200 - restituisce tutte le misure del sensore", async () => {
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}/sensors/${sensorMac}/measurements`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("sensorMacAddress", sensorMac);
    expect(res.body).toHaveProperty("measurements");
    expect(Array.isArray(res.body.measurements)).toBe(true);
  });

  it("200 - restituisce solo sensorMacAddress", async () => {
    const sensorRepo = new SensorRepository();
    const sensorMacNoMeasures = "AA:BB:CC:DD:EE:02";
    await sensorRepo.createSensor(gatewayMac, { macAddress: sensorMacNoMeasures });
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}/sensors/${sensorMacNoMeasures}/measurements`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("sensorMacAddress", sensorMacNoMeasures);
    expect(res.body).not.toHaveProperty("measurements");
  });

  it("200 - restituisce misure filtrate per data", async () => {
    const startDate = "2025-02-18T15:15:00+00:00";
    const endDate = "2025-02-18T17:25:00+00:00";
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}/sensors/${sensorMac}/measurements`)
      .query({ startDate, endDate })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("sensorMacAddress", sensorMac);
    if (res.body.measurements !== undefined) {
        expect(Array.isArray(res.body.measurements)).toBe(true);
    }
  });

  it("400 - errore formato startDate non valido", async () => {
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}/sensors/${sensorMac}/measurements`)
      .query({ startDate: "not-a-date" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("code", 400);
    expect(res.body).toHaveProperty("name", "Bad Request");
    expect(res.body).toHaveProperty("message");
  });

  it("400 - errore formato endDate non valido", async () => {
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}/sensors/${sensorMac}/measurements`)
      .query({ endDate: "not-a-date" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("code", 400);
    expect(res.body).toHaveProperty("name", "Bad Request");
    expect(res.body).toHaveProperty("message");
  });

  it("401 - senza autenticazione", async () => {
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}/sensors/${sensorMac}/measurements`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("code", 401);
    expect(res.body).toHaveProperty("name", "Unauthorized");
    expect(res.body).toHaveProperty("message");
  });

  it("404 - network non trovato", async () => {
    const res = await request(app)
      .get(`/api/v1/networks/${invalidNetworkCode}/gateways/${gatewayMac}/sensors/${sensorMac}/measurements`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("code", 404);
    expect(res.body).toHaveProperty("name", "NotFoundError");
    expect(res.body).toHaveProperty("message");
  });

  it("404 - gateway non trovato", async () => {
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/gateways/${invalidGatewayMac}/sensors/${sensorMac}/measurements`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("code", 404);
    expect(res.body).toHaveProperty("name", "NotFoundError");
    expect(res.body).toHaveProperty("message");
  });

  it("404 - sensore non trovato", async () => {
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}/sensors/${invalidSensorMac}/measurements`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("code", 404);
    expect(res.body).toHaveProperty("name", "NotFoundError");
    expect(res.body).toHaveProperty("message");
  });
});