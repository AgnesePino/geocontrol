import request from "supertest";
import { app } from "@app";
import { generateToken } from "@services/authService";
import { beforeAllE2e, afterAllE2e, TEST_USERS } from "@test/e2e/lifecycle";
import { NetworkRepository } from "@repositories/NetworkRepository";
import { GatewayRepository } from "@repositories/GatewayRepository";
import { SensorRepository } from "@repositories/SensorRepository";
import { MeasurementRepository } from "@repositories/MeasurementRepository";

describe("GET /api/v1/networks/:networkCode/outliers", () => {
  let token: string;
  const networkCode = "NET01";
  const gatewayMac = "71:B1:CE:01:C6:F0";
  const invalidNetworkCode = "INVALID_NET";
  const sensorMac1 = "71:B1:CE:01:C6:A9";
  const sensorMac2 = "AA:BB:CC:DD:EE:02";

  beforeAll(async () => {
    await beforeAllE2e();
    token = generateToken(TEST_USERS.admin);
    const networkRepo = new NetworkRepository();
    await networkRepo.createNetwork(networkCode, 'Test Network', 'Test Description');
    const gatewayRepo = new GatewayRepository();
    await gatewayRepo.createGateway(gatewayMac, networkCode, 'Test Gateway 1');
    const sensorRepo = new SensorRepository();
    await sensorRepo.createSensor(gatewayMac, { macAddress: sensorMac1 });
    await sensorRepo.createSensor(gatewayMac, { macAddress: sensorMac2 });
    const measurementRepo = new MeasurementRepository();
    
    await measurementRepo.storeMeasurement(networkCode, gatewayMac, sensorMac1, { createdAt: new Date(), value: 100 }); // outlier
    await measurementRepo.storeMeasurement(networkCode, gatewayMac, sensorMac1, { createdAt: new Date(), value: 25 });  // normale
    await measurementRepo.storeMeasurement(networkCode, gatewayMac, sensorMac2, { createdAt: new Date(), value: -100 }); // outlier
    await measurementRepo.storeMeasurement(networkCode, gatewayMac, sensorMac2, { createdAt: new Date(), value: 30 });  // normale
  });

  afterAll(async () => {
    await afterAllE2e();
  });

  it("200 - restituisce solo gli outlier di tutti i sensori del network", async () => {
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/outliers`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const dto of res.body) {
      expect(dto).toHaveProperty("sensorMacAddress");
      expect(dto).toHaveProperty("measurements");
      
      if (dto.measurements && dto.measurements.length > 0) {
        for (const m of dto.measurements) {
          expect(m).toHaveProperty("isOutlier", true);
        }
      }
    }
  });

  it("200 - restituisce solo gli outlier dei sensori specificati", async () => {
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/outliers`)
      .query({ sensorMacs: [sensorMac1, sensorMac2].join(",") })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const dto of res.body) {
      expect([sensorMac1, sensorMac2]).toContain(dto.sensorMacAddress);
      expect(dto).toHaveProperty("measurements");
    }
  });

  it("200 - sensore senza misure", async () => {
    const sensorRepo = new SensorRepository();
    const sensorMacNoOutlier = "AA:BB:CC:DD:EE:03";
    await sensorRepo.createSensor(gatewayMac, { macAddress: sensorMacNoOutlier });

    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/outliers`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const sensoreSenzaOutlier = res.body.find(
      (dto: any) => dto.sensorMacAddress === sensorMacNoOutlier
    );
    expect(sensoreSenzaOutlier).toBeUndefined();
    expect(res.body.length).toBe(2);
  });

  it("200 - restituisce outlier filtrati per data", async () => {
    const startDate = "2025-02-18T15:00:00+01:00";
    const endDate = "2025-02-18T18:00:00+01:00";
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/outliers`)
      .query({ startDate, endDate })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("400 - errore formato startDate non valido", async () => {
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/outliers`)
      .query({ startDate: "not-a-date" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("code", 400);
    expect(res.body).toHaveProperty("name", "Bad Request");
    expect(res.body).toHaveProperty("message");
  });

  it("400 - errore formato endDate non valido", async () => {
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/outliers`)
      .query({ endDate: "not-a-date" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("code", 400);
    expect(res.body).toHaveProperty("name", "Bad Request");
    expect(res.body).toHaveProperty("message");
  });

  it("401 - senza autenticazione", async () => {
    const res = await request(app)
      .get(`/api/v1/networks/${networkCode}/outliers`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("code", 401);
    expect(res.body).toHaveProperty("name", "Unauthorized");
    expect(res.body).toHaveProperty("message");
  });

  it("404 - network non trovato", async () => {
    const res = await request(app)
      .get(`/api/v1/networks/${invalidNetworkCode}/outliers`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("code", 404);
    expect(res.body).toHaveProperty("name", "NotFoundError");
    expect(res.body).toHaveProperty("message");
  });
});