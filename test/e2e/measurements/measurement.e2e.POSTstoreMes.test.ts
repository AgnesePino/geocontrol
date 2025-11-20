import request from "supertest";
import { app } from "@app";
import { generateToken } from "@services/authService";
import { beforeAllE2e, afterAllE2e, TEST_USERS } from "@test/e2e/lifecycle";
import { NetworkRepository } from "@repositories/NetworkRepository";
import { GatewayRepository } from "@repositories/GatewayRepository";
import { SensorRepository } from "@repositories/SensorRepository";
import { MeasurementRepository } from "@repositories/MeasurementRepository";

describe("POST /api/v1/networks/:networkCode/gateways/:gatewayMac/sensors/:sensorMac/measurements", () => {
  let token: string;
  const networkCode = "NET01";
  const gatewayMac = "71:B1:CE:01:C6:F0";
  const invalidNetworkCode = "INVALID_NET";
  const invalidGatewayMac = "00:00:00:00:00:00";
  const invalidSensorMac = "00:00:00:00:00:01";
  const sensorMac = "71:B1:CE:01:C6:A9";
  const measurement = [
      { createdAt: "2025-02-18T17:00:00+01:00", value: 1.8567 }
    ];

  beforeAll(async () => {
    await beforeAllE2e();
    token = generateToken(TEST_USERS.admin);
    const networkRepo = new NetworkRepository();
    await networkRepo.createNetwork(networkCode, 'Test Network', 'Test Description');
    const gatewayRepo = new GatewayRepository();
    await gatewayRepo.createGateway(gatewayMac, networkCode, 'Test Gateway 1');
    const sensorRepo = new SensorRepository();
    await sensorRepo.createSensor(gatewayMac, { macAddress: sensorMac });
  });

  afterAll(async () => {
    await afterAllE2e();
  });

  it("201 - inserisce una misura valida", async () => {
    const res = await request(app)
      .post(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}/sensors/${sensorMac}/measurements`)
      .set("Authorization", `Bearer ${token}`)
      .send(measurement);

    expect(res.status).toBe(201);
  });

  it("400 - errore dati mancanti o non validi", async () => {
    const fakeMeasurement = [
      null
    ];
    const res = await request(app)
      .post(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}/sensors/${sensorMac}/measurements`)
      .set("Authorization", `Bearer ${token}`)
      .send(fakeMeasurement);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("code", 400);
    expect(res.body).toHaveProperty("name", "Bad Request");
    expect(res.body).toHaveProperty("message");
  });

  it("400 - errore formato data non valido", async () => {
    const measurement = [
      { createdAt: "not-a-date", value: 1.8567 }
    ];
    const res = await request(app)
      .post(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}/sensors/${sensorMac}/measurements`)
      .set("Authorization", `Bearer ${token}`)
      .send(measurement);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("code", 400);
    expect(res.body).toHaveProperty("name", "Bad Request");
    expect(res.body).toHaveProperty("message");
  });

  it("401 - senza autenticazione", async () => {
    const res = await request(app)
      .post(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}/sensors/${sensorMac}/measurements`)
      .send(measurement);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("code", 401);
    expect(res.body).toHaveProperty("name", "Unauthorized");
    expect(res.body).toHaveProperty("message");
  });

  it("403 - utente senza permessi", async () => {
    const viewerToken = generateToken(TEST_USERS.viewer);
    const res = await request(app)
      .post(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}/sensors/${sensorMac}/measurements`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send(measurement);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("code", 403);
    expect(res.body).toHaveProperty("name", "InsufficientRightsError");
    expect(res.body).toHaveProperty("message");
  });

  it("404 - network non trovato", async () => {
    const res = await request(app)
      .post(`/api/v1/networks/${invalidNetworkCode}/gateways/${gatewayMac}/sensors/${sensorMac}/measurements`)
      .set("Authorization", `Bearer ${token}`)
      .send(measurement);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("code", 404);
    expect(res.body).toHaveProperty("name", "NotFoundError");
    expect(res.body).toHaveProperty("message");
  });

  it("404 - gateway non trovato", async () => {
    const res = await request(app)
      .post(`/api/v1/networks/${networkCode}/gateways/${invalidGatewayMac}/sensors/${sensorMac}/measurements`)
      .set("Authorization", `Bearer ${token}`)
      .send(measurement);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("code", 404);
    expect(res.body).toHaveProperty("name", "NotFoundError");
    expect(res.body).toHaveProperty("message");
  });

  it("404 - sensore non trovato", async () => {
    const res = await request(app)
      .post(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}/sensors/${invalidSensorMac}/measurements`)
      .set("Authorization", `Bearer ${token}`)
      .send(measurement);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("code", 404);
    expect(res.body).toHaveProperty("name", "NotFoundError");
    expect(res.body).toHaveProperty("message");
  });
});