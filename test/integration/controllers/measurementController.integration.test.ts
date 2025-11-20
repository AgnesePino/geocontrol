import { MeasurementController } from "@controllers/measurementController";
import type { Measurement as MeasurementDTO } from "@dto/Measurement";
import type { Stats as StatsDTO } from "@dto/Stats";
import { calculateStatistics } from "@services/measurementService";
import { parseISODateParamToUTC, parseStringArrayParam } from "../../../src/utils";

describe("MeasurementController Integration Tests (DI only)", () => {
    const fakeMeasurementDAO = {
        id: 1,
        value: 42,
        createdAt: new Date().toISOString(),
        sensor: { macAddress: "11:22:33:44:55:01" },
    };
    const fakeMeasurementDTO: MeasurementDTO = {
        value: 42,
        createdAt: new Date(),
        isOutlier: false,
    };
    const fakeStats: StatsDTO = {
        mean: 42,
        variance: 0,
        lowerThreshold: 40,
        upperThreshold: 44,
    };

    it("should instantiate MeasurementController with all dependencies", () => {
        const mockMeasurementRepo = {
            getMeasurementsFromSensor: jest.fn(),
            getMeasurementsFromNetwork: jest.fn(),
            storeMeasurement: jest.fn(),
        };
        const mockMapperService = {
            createMeasurementsDTO: jest.fn(),
            mapMeasurementDAOToDTO: jest.fn(),
        };
        const mockStatsService = {
            calculateStatistics: jest.fn(),
        };
        const mockExistenceService = {
            withExistingNetwork: jest.fn(),
            withExistingNetworkGatewayAndSensor: jest.fn(),
        };
        const mockSensorController = {
            getAllSensorsOfNetwork: jest.fn(),
        };

        const controller = new MeasurementController(
            mockMeasurementRepo as any,
            mockMapperService,
            mockStatsService,
            mockExistenceService,
            mockSensorController
        );

        expect(controller).toBeInstanceOf(MeasurementController);
    });

    it("should instantiate MeasurementController with default dependencies", () => {
        const controller = new MeasurementController();
        expect(controller).toBeInstanceOf(MeasurementController);
    });

    let measurementRepo: any;
    let mapperService: any;
    let statsService: any;
    let existenceService: any;
    let sensorController: any;

    beforeEach(() => {
        measurementRepo = {
            repo: {}, // mock property required by MeasurementRepository
            getMeasurementsFromSensor: jest.fn(),
            getMeasurementsFromNetwork: jest.fn(),
            storeMeasurement: jest.fn(),
        };
        mapperService = {
            mapMeasurementDAOToDTO: jest.fn(),
            createMeasurementsDTO: jest.fn(),
        };
        statsService = {
            calculateStatistics: jest.fn(),
        };
        existenceService = {
            withExistingNetwork: jest.fn((n, cb) => cb()),
            withExistingNetworkGatewayAndSensor: jest.fn((n, g, s, cb) => cb()),
        };
        sensorController = {
            getAllSensorsOfNetwork: jest.fn(),
        };
        jest.clearAllMocks();
    });

    describe("getMeasurementsFromSensor", () => {
        it("should return measurements for a sensor", async () => {
            measurementRepo.getMeasurementsFromSensor.mockResolvedValue([fakeMeasurementDAO]);
            mapperService.mapMeasurementDAOToDTO.mockReturnValue(fakeMeasurementDTO);
            statsService.calculateStatistics.mockReturnValue(fakeStats);
            mapperService.createMeasurementsDTO.mockReturnValue({
                sensorMacAddress: "11:22:33:44:55:01",
                stats: fakeStats,
                measurements: [fakeMeasurementDTO],
            });

            const controller = new MeasurementController(
                measurementRepo,
                mapperService,
                statsService,
                existenceService,
                sensorController
            );

            const result = await controller.getMeasurementsFromSensor(
                "NET001", "GW001", "11:22:33:44:55:01"
            );

            expect(result.sensorMacAddress).toBe("11:22:33:44:55:01");
            expect(result.measurements).toHaveLength(1);
            expect(mapperService.createMeasurementsDTO).toHaveBeenCalled();
        });

        it("should return empty DTO if no measurements", async () => {
            measurementRepo.getMeasurementsFromSensor.mockResolvedValue([]);
            mapperService.mapMeasurementDAOToDTO.mockReturnValue(undefined);

            const controller = new MeasurementController(
                measurementRepo,
                mapperService,
                statsService,
                existenceService,
                sensorController
            );

            const result = await controller.getMeasurementsFromSensor(
                "NET001", "GW001", "11:22:33:44:55:01"
            );

            expect(result).toHaveProperty("sensorMacAddress");
            expect(result).toHaveProperty("stats");
        });
    });

    describe("getMeasurementsFromNetwork", () => {
        it("should return measurements for all sensors in a network", async () => {
            measurementRepo.getMeasurementsFromNetwork.mockResolvedValue([fakeMeasurementDAO]);
            mapperService.mapMeasurementDAOToDTO.mockReturnValue(fakeMeasurementDTO);
            statsService.calculateStatistics.mockReturnValue(fakeStats);
            mapperService.createMeasurementsDTO.mockReturnValue({
                sensorMacAddress: "11:22:33:44:55:01",
                stats: fakeStats,
                measurements: [fakeMeasurementDTO],
            });
            sensorController.getAllSensorsOfNetwork.mockResolvedValue([
                { macAddress: "11:22:33:44:55:01" },
            ]);

            const controller = new MeasurementController(
                measurementRepo,
                mapperService,
                statsService,
                existenceService,
                sensorController
            );

            const result = await controller.getMeasurementsFromNetwork("NET001");

            expect(Array.isArray(result)).toBe(true);
            expect(result[0].sensorMacAddress).toBe("11:22:33:44:55:01");
        });

        it("should return empty DTOs for each sensorMac if no measurements are found for any sensorMac", async () => {
            measurementRepo.getMeasurementsFromNetwork.mockResolvedValue([]);

            const controller = new MeasurementController(
                measurementRepo,
                mapperService,
                statsService,
                existenceService,
                sensorController
            );

            const sensorMacs = ["11:22:33:44:55:01", "11:22:33:44:55:02", "11:22:33:44:55:03"];
            const result = await controller.getMeasurementsFromNetwork("NET001", sensorMacs);

            expect(result).toEqual([
                { sensorMacAddress: "11:22:33:44:55:01" },
                { sensorMacAddress: "11:22:33:44:55:02" },
                { sensorMacAddress: "11:22:33:44:55:03" },
            ]);
        });

        it("should return empty DTOs if no measurements", async () => {
            measurementRepo.getMeasurementsFromNetwork.mockResolvedValue([]);
            sensorController.getAllSensorsOfNetwork.mockResolvedValue([
                { macAddress: "11:22:33:44:55:01" },
                { macAddress: "11:22:33:44:55:02" },
            ]);

            const controller = new MeasurementController(
                measurementRepo,
                mapperService,
                statsService,
                existenceService,
                sensorController
            );

            const result = await controller.getMeasurementsFromNetwork("NET001");

            expect(result).toEqual([
                { sensorMacAddress: "11:22:33:44:55:01" },
                { sensorMacAddress: "11:22:33:44:55:02" },
            ]);
        });
    });

    describe("getStatsFromSensor", () => {
        it("should return stats for a sensor", async () => {
           const mockRepo = {
                getMeasurementsFromSensor: jest.fn().mockResolvedValue(
                    [fakeMeasurementDAO]),
                getMeasurementsFromNetwork: jest.fn(),
                storeMeasurement: jest.fn(),
            } as unknown as typeof measurementRepo;

            mapperService.mapMeasurementDAOToDTO.mockReturnValue(fakeMeasurementDTO);
            statsService.calculateStatistics.mockReturnValue(fakeStats);
            mapperService.createMeasurementsDTO.mockReturnValue({
                sensorMacAddress: "11:22:33:44:55:01",
                stats: fakeStats,
                measurements: [fakeMeasurementDTO],
            });

            const controller = new MeasurementController(
                mockRepo,
                mapperService,
                statsService,
                existenceService,
                sensorController
            );

            const result = await controller.getStatsFromSensor(
                "NET001", "GW001", "11:22:33:44:55:01"
            );
            expect(result).toEqual(fakeStats);
        });

        it("should return zeroed stats if no stats present", async () => {
                const mockRepo = {
                    getMeasurementsFromSensor: jest.fn().mockResolvedValue([]),
                    getMeasurementsFromNetwork: jest.fn(),
                    storeMeasurement: jest.fn(),
                } as unknown as typeof measurementRepo;

                const controller = new MeasurementController(
                    mockRepo,
                    mapperService,
                    statsService,
                    existenceService,
                    sensorController
                );

                const result = await controller.getStatsFromSensor(
                    "NET001", "GW001", "11:22:33:44:55:01"
                );
                expect(result).toEqual({
                    mean: 0,
                    variance: 0,
                    lowerThreshold: 0,
                    upperThreshold: 0,
                });
            });
        });

    describe("getOutliersFromNetwork", () => {
        it("should return undefined if getMeasurementsFromNetwork returns undefined", async () => {
            jest.spyOn(MeasurementController.prototype, "getMeasurementsFromNetwork").mockResolvedValue(undefined);

            const controller = new MeasurementController(
                measurementRepo,
                mapperService,
                statsService,
                existenceService,
                sensorController
            );

            const result = await controller.getOutliersFromNetwork("NET001");
            expect(result).toBeUndefined();

            (MeasurementController.prototype.getMeasurementsFromNetwork as jest.Mock).mockRestore();
        });

        it("should return [] if getMeasurementsFromNetwork returns an empty array", async () => {
            jest.spyOn(MeasurementController.prototype, "getMeasurementsFromNetwork").mockResolvedValue([]);

            const controller = new MeasurementController(
                measurementRepo,
                mapperService,
                statsService,
                existenceService,
                sensorController
            );

            const result = await controller.getOutliersFromNetwork("NET001");
            expect(result).toEqual([]);

            (MeasurementController.prototype.getMeasurementsFromNetwork as jest.Mock).mockRestore();
        });
    });

    describe("getOutliersFromSensor", () => {
        it("should return only outlier measurements", async () => {
            const mockRepo = {
                getMeasurementsFromSensor: jest.fn().mockResolvedValue([fakeMeasurementDAO]),
                getMeasurementsFromNetwork: jest.fn(),
                storeMeasurement: jest.fn(),
            } as unknown as typeof measurementRepo;

            mapperService.mapMeasurementDAOToDTO.mockReturnValue({ ...fakeMeasurementDTO, isOutlier: true });
            statsService.calculateStatistics.mockReturnValue(fakeStats);
            mapperService.createMeasurementsDTO.mockReturnValue({
                sensorMacAddress: "11:22:33:44:55:01",
                stats: fakeStats,
                measurements: [{ ...fakeMeasurementDTO, isOutlier: true }, { ...fakeMeasurementDTO, isOutlier: false }],
            });

            const controller = new MeasurementController(
                mockRepo,
                mapperService,
                statsService,
                existenceService,
                sensorController
            );

            const result = await controller.getOutliersFromSensor(
                "NET001", "GW001", "11:22:33:44:55:01"
            );
            expect(result.measurements).toEqual([{ ...fakeMeasurementDTO, isOutlier: true }]);
        });

        it("should return empty DTO if no measurements", async () => {
            const mockRepo = {
                getMeasurementsFromSensor: jest.fn().mockResolvedValue([]), // <-- restituisci array vuoto
                getMeasurementsFromNetwork: jest.fn(),
                storeMeasurement: jest.fn(),
            } as unknown as typeof measurementRepo;

            mapperService.mapMeasurementDAOToDTO.mockReturnValue(undefined);
            statsService.calculateStatistics.mockReturnValue(undefined);
            mapperService.createMeasurementsDTO.mockReturnValue(undefined);

            const controller = new MeasurementController(
                mockRepo,
                mapperService,
                statsService,
                existenceService,
                sensorController
            );
            const result = await controller.getOutliersFromSensor(
                "NET001", "GW001", "11:22:33:44:55:01"
            );
            expect(result).toEqual({ sensorMacAddress: "11:22:33:44:55:01" });
        });
    });

    describe("storeMeasurement", () => {
        it("should store a measurement", async () => {
            measurementRepo.storeMeasurement.mockResolvedValue(undefined);

            const controller = new MeasurementController(
                measurementRepo,
                mapperService,
                statsService,
                existenceService,
                sensorController
            );

            await controller.storeMeasurement(
                "NET001", "GW001", "11:22:33:44:55:01", fakeMeasurementDTO
            );

            expect(measurementRepo.storeMeasurement).toHaveBeenCalledWith(
                "NET001", "GW001", "11:22:33:44:55:01", fakeMeasurementDTO
            );
        });
    });

    describe("calculateStatistics", () => {
        const measurements = [
            { value: 10, createdAt: new Date(), isOutlier: false },
            { value: 20, createdAt: new Date(), isOutlier: false },
        ];

        it("should return all stats as 0 if measurements is empty", () => {
            const result = calculateStatistics([]);
            expect(result).toEqual({
                mean: 0,
                lowerThreshold: 0,
                upperThreshold: 0,
                variance: 0,
            });
        });

        it("should include startDate if provided", () => {
            const startDate = new Date("2024-01-01T00:00:00Z");
            const result = calculateStatistics(measurements, startDate);
            expect(result.startDate).toEqual(startDate);
            expect(result.endDate).toBeUndefined();
        });

        it("should include endDate if provided", () => {
            const endDate = new Date("2024-01-02T00:00:00Z");
            const result = calculateStatistics(measurements, undefined, endDate);
            expect(result.endDate).toEqual(endDate);
            expect(result.startDate).toBeUndefined();
        });

        it("should include both startDate and endDate if both are provided", () => {
            const startDate = new Date("2024-01-01T00:00:00Z");
            const endDate = new Date("2024-01-02T00:00:00Z");
            const result = calculateStatistics(measurements, startDate, endDate);
            expect(result.startDate).toEqual(startDate);
            expect(result.endDate).toEqual(endDate);
        });

        it("should not include startDate or endDate if not provided", () => {
            const result = calculateStatistics(measurements);
            expect(result.startDate).toBeUndefined();
            expect(result.endDate).toBeUndefined();
        });
    });

    describe("parseISODateParamToUTC", () => {
        it("should parse a valid ISO string", () => {
            const date = new Date("2024-01-01T12:00:00Z");
            const result = parseISODateParamToUTC("2024-01-01T12:00:00Z");
            expect(result?.toISOString()).toBe(date.toISOString());
        });

        it("should return undefined for invalid date string", () => {
            expect(parseISODateParamToUTC("not-a-date")).toBeUndefined();
        });

        it("should return undefined for non-string input", () => {
            expect(parseISODateParamToUTC(123)).toBeUndefined();
            expect(parseISODateParamToUTC(undefined)).toBeUndefined();
        });
    });

    describe("parseStringArrayParam", () => {
        it("should parse comma separated string", () => {
            expect(parseStringArrayParam("a,b,c")).toEqual(["a", "b", "c"]);
        });

        it("should trim spaces and filter empty", () => {
            expect(parseStringArrayParam(" a , , b ,c ")).toEqual(["a", "b", "c"]);
        });

        it("should parse array of strings", () => {
            expect(parseStringArrayParam(["a", " b ", "c", 5])).toEqual(["a", "b", "c"]);
        });

        it("should return undefined for non-string/array", () => {
            expect(parseStringArrayParam(123)).toBeUndefined();
            expect(parseStringArrayParam(undefined)).toBeUndefined();
        });
    });
});