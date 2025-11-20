import { app } from "@app";
import request from "supertest";
import * as authService from "@services/authService";
import { measurementController } from "@routes/measurementRoutes";

describe("MeasurementRoutes Integration", () => {
    const token = "Bearer mockToken";
    let authSpy: jest.SpyInstance;

    beforeEach(() => {
        authSpy = jest.spyOn(authService, "processToken");
    });

    afterEach(() => {
        authSpy.mockRestore();
        jest.clearAllMocks();
    });

    describe("POST /api/v1/networks/:networkCode/gateways/:gatewayMac/sensors/:sensorMac/measurements", () => {
        let storeMeasurementSpy: jest.SpyInstance;

        beforeEach(() => {
            storeMeasurementSpy = jest.spyOn(measurementController, "storeMeasurement");
        });

        afterEach(() => {
            storeMeasurementSpy.mockRestore();
        });

        it("should store measurements and return 201", async () => {
            authSpy.mockResolvedValue(undefined);
            storeMeasurementSpy.mockResolvedValue(undefined);

            const measurements = [
                { value: 10, createdAt: "2024-01-01T00:00:00Z" },
                { value: 20, createdAt: "2024-01-01T01:00:00Z" },
            ];

            const response = await request(app)
                .post("/api/v1/networks/NET01/gateways/GW01/sensors/SEN01/measurements")
                .set("Authorization", token)
                .send(measurements);

            expect(response.status).toBe(201);
            expect(storeMeasurementSpy).toHaveBeenCalledTimes(2);
            expect(authService.processToken).toHaveBeenCalled();
        });

        it("should return 401 if not authenticated", async () => {
            const response = await request(app)
                .post("/api/v1/networks/NET01/gateways/GW01/sensors/SEN01/measurements")
                .send([{ value: 10, timestamp: "2024-01-01T00:00:00Z" }]);

            expect(response.status).toBe(401);
        });
    });

    describe("GET /api/v1/networks/:networkCode/gateways/:gatewayMac/sensors/:sensorMac/measurements", () => {
        let getMeasurementsFromSensorSpy: jest.SpyInstance;

        beforeEach(() => {
            getMeasurementsFromSensorSpy = jest.spyOn(measurementController, "getMeasurementsFromSensor");
        });

        afterEach(() => {
            getMeasurementsFromSensorSpy.mockRestore();
        });

        it("should return measurements for a sensor", async () => {
            authSpy.mockResolvedValue(undefined);
            const mockResult = [{ value: 10, timestamp: "2024-01-01T00:00:00Z" }];
            getMeasurementsFromSensorSpy.mockResolvedValue(mockResult);

            const response = await request(app)
                .get("/api/v1/networks/NET01/gateways/GW01/sensors/SEN01/measurements")
                .set("Authorization", token);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockResult);
            expect(getMeasurementsFromSensorSpy).toHaveBeenCalledWith(
                "NET01",
                "GW01",
                "SEN01",
                undefined,
                undefined
            );
        });
    });

    describe("GET /api/v1/networks/:networkCode/gateways/:gatewayMac/sensors/:sensorMac/stats", () => {
        let getStatsFromSensorSpy: jest.SpyInstance;

        beforeEach(() => {
            getStatsFromSensorSpy = jest.spyOn(measurementController, "getStatsFromSensor");
        });

        afterEach(() => {
            getStatsFromSensorSpy.mockRestore();
        });

        it("should return stats for a sensor", async () => {
            authSpy.mockResolvedValue(undefined);
            const mockStats = { min: 1, max: 10, avg: 5 };
            getStatsFromSensorSpy.mockResolvedValue(mockStats);

            const response = await request(app)
                .get("/api/v1/networks/NET01/gateways/GW01/sensors/SEN01/stats")
                .set("Authorization", token);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockStats);
            expect(getStatsFromSensorSpy).toHaveBeenCalled();
        });
    });

    describe("GET /api/v1/networks/:networkCode/gateways/:gatewayMac/sensors/:sensorMac/outliers", () => {
        let getOutliersFromSensorSpy: jest.SpyInstance;

        beforeEach(() => {
            getOutliersFromSensorSpy = jest.spyOn(measurementController, "getOutliersFromSensor");
        });

        afterEach(() => {
            getOutliersFromSensorSpy.mockRestore();
        });

        it("should return outliers for a sensor", async () => {
            authSpy.mockResolvedValue(undefined);
            const mockOutliers = [{ value: 100, timestamp: "2024-01-01T00:00:00Z" }];
            getOutliersFromSensorSpy.mockResolvedValue(mockOutliers);

            const response = await request(app)
                .get("/api/v1/networks/NET01/gateways/GW01/sensors/SEN01/outliers")
                .set("Authorization", token);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockOutliers);
            expect(getOutliersFromSensorSpy).toHaveBeenCalled();
        });
    });

    describe("GET /api/v1/networks/:networkCode/measurements", () => {
        let getMeasurementsFromNetworkSpy: jest.SpyInstance;

        beforeEach(() => {
            getMeasurementsFromNetworkSpy = jest.spyOn(measurementController, "getMeasurementsFromNetwork");
        });

        afterEach(() => {
            getMeasurementsFromNetworkSpy.mockRestore();
        });

        it("should return measurements for a network", async () => {
            authSpy.mockResolvedValue(undefined);
            const mockResult = [{ value: 10, createdAt: "2024-01-01T00:00:00Z" }];
            getMeasurementsFromNetworkSpy.mockResolvedValue(mockResult);

            const response = await request(app)
                .get("/api/v1/networks/NET01/measurements?sensorMacs=SEN01&sensorMacs=SEN02")
                .set("Authorization", token);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockResult);
            expect(getMeasurementsFromNetworkSpy).toHaveBeenCalledWith(
                "NET01",
                ["SEN01","SEN02"],
                undefined,
                undefined
            );
        });

    it("should handle missing sensorMacs (empty array)", async () => {
        authSpy.mockResolvedValue(undefined);
        getMeasurementsFromNetworkSpy.mockResolvedValue([]);
        const response = await request(app)
            .get("/api/v1/networks/NET01/measurements")
            .set("Authorization", token);

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
        expect(getMeasurementsFromNetworkSpy).toHaveBeenCalledWith(
            "NET01",
            [],
            undefined,
            undefined
        );
    });

    it("should handle sensorMacs as array with spaces", async () => {
        authSpy.mockResolvedValue(undefined);
        getMeasurementsFromNetworkSpy.mockResolvedValue([{ value: 2 }]);
        const response = await request(app)
            .get("/api/v1/networks/NET01/measurements")
            .query({ sensorMacs: ["  SEN01"] })
            .set("Authorization", token);

        expect(response.status).toBe(200);
        expect(response.body).toEqual([{ value: 2 }]);
        expect(getMeasurementsFromNetworkSpy).toHaveBeenCalledWith(
            "NET01",
            ["SEN01"],
            undefined,
            undefined
        );
    });

    it("should handle sensorMacs as comma separated string", async () => {
        authSpy.mockResolvedValue(undefined);
        getMeasurementsFromNetworkSpy.mockResolvedValue([{ value: 1 }]);
        const response = await request(app)
            .get("/api/v1/networks/NET01/measurements")
            .query({ sensorMacs: ["SEN01,SEN02"] })
            .set("Authorization", token);

        expect(response.status).toBe(200);
        expect(response.body).toEqual([{ value: 1 }]);
        expect(getMeasurementsFromNetworkSpy).toHaveBeenCalledWith(
            "NET01",
            ["SEN01", "SEN02"],
            undefined,
            undefined
        );
    });

    it("should handle sensorMacs as array with non-string values (branch coverage)", async () => {
        authSpy.mockResolvedValue(undefined);
        getMeasurementsFromNetworkSpy.mockResolvedValue([]);
        const response = await request(app)
            .get("/api/v1/networks/NET01/measurements")
            .query({ sensorMacs: [null] })
            .set("Authorization", token);

        expect(response.status).toBe(400);
    });

    it("should handle startDate and endDate", async () => {
        authSpy.mockResolvedValue(undefined);
        getMeasurementsFromNetworkSpy.mockResolvedValue([{ value: 3 }]);
        const response = await request(app)
            .get("/api/v1/networks/NET01/measurements?sensorMacs=SEN01")
            .query({
                startDate: "2024-01-01T00:00:00Z",
                endDate: "2024-01-02T00:00:00Z"
            })
            .set("Authorization", token);

        expect(response.status).toBe(200);
        expect(response.body).toEqual([{ value: 3 }]);
        expect(getMeasurementsFromNetworkSpy).toHaveBeenCalledWith(
            "NET01",
            ["SEN01"],
            new Date("2024-01-01T00:00:00Z"),
            new Date("2024-01-02T00:00:00Z")
        );
    });

    it("should handle errors thrown by controller", async () => {
        authSpy.mockResolvedValue(undefined);
        getMeasurementsFromNetworkSpy.mockImplementation(() => { throw new Error("fail"); });
        const response = await request(app)
            .get("/api/v1/networks/NET01/measurements?sensorMacs=SEN01")
            .set("Authorization", token);

        expect(response.status).toBe(500);
    });
});

    describe("GET /api/v1/networks/:networkCode/stats", () => {
        let getStatsFromNetworkSpy: jest.SpyInstance;

        beforeEach(() => {
            getStatsFromNetworkSpy = jest.spyOn(measurementController, "getStatsFromNetwork");
        });

        afterEach(() => {
            getStatsFromNetworkSpy.mockRestore();
        });

        it("should return stats for a network", async () => {
            authSpy.mockResolvedValue(undefined);
            const mockStats = [{ min: 1, max: 10, avg: 5 }];
            getStatsFromNetworkSpy.mockResolvedValue(mockStats);

            const response = await request(app)
                .get("/api/v1/networks/NET01/stats?sensorMacs=SEN01")
                .set("Authorization", token);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockStats);
            expect(getStatsFromNetworkSpy).toHaveBeenCalledWith(
                "NET01",
                ["SEN01"],
                undefined,
                undefined
            );
        });

        it("should return stats for all sensors if sensorMacs is missing", async () => {
            authSpy.mockResolvedValue(undefined);
            const mockStats = [{ min: 1, max: 10, avg: 5 }];
            getStatsFromNetworkSpy.mockResolvedValue(mockStats);

            const response = await request(app)
                .get("/api/v1/networks/NET01/stats")
                .set("Authorization", token);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockStats);
            expect(getStatsFromNetworkSpy).toHaveBeenCalledWith(
                "NET01",
                [],
                undefined,
                undefined
            );
        });
    });

    describe("GET /api/v1/networks/:networkCode/outliers", () => {
        let getOutliersFromNetworkSpy: jest.SpyInstance;

        beforeEach(() => {
            getOutliersFromNetworkSpy = jest.spyOn(measurementController, "getOutliersFromNetwork");
        });

        afterEach(() => {
            getOutliersFromNetworkSpy.mockRestore();
        });

        it("should return outliers for a network", async () => {
            authSpy.mockResolvedValue(undefined);
            const mockOutliers = [{ value: 100, timestamp: "2024-01-01T00:00:00Z" }];
            getOutliersFromNetworkSpy.mockResolvedValue(mockOutliers);

            const response = await request(app)
                .get("/api/v1/networks/NET01/outliers?sensorMacs=SEN01")
                .set("Authorization", token);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockOutliers);
            expect(getOutliersFromNetworkSpy).toHaveBeenCalledWith(
                "NET01",
                ["SEN01"],
                undefined,
                undefined
            );
        });

        it("should return outliers for all sensors if sensorMacs is missing", async () => {
            authSpy.mockResolvedValue(undefined);
            const mockOutliers = [{ value: 100, timestamp: "2024-01-01T00:00:00Z" }];
            getOutliersFromNetworkSpy.mockResolvedValue(mockOutliers);

            const response = await request(app)
                .get("/api/v1/networks/NET01/outliers")
                .set("Authorization", token);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockOutliers);
            expect(getOutliersFromNetworkSpy).toHaveBeenCalledWith(
                "NET01",
                [],
                undefined,
                undefined
            );
        });
    });
});