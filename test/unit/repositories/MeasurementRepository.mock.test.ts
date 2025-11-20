import { MeasurementRepository } from "@repositories/MeasurementRepository";
import { MeasurementDAO } from "@dao/MeasurementDAO";

const mockFind = jest.fn();
const mockSave = jest.fn();
const mockCreate = jest.fn();

jest.mock("@database", () => ({
  AppDataSource: {
    getRepository: () => ({
      find: mockFind,
      save: mockSave,
      create: mockCreate,
    }),
  },
}));

jest.mock("@repositories/SensorRepository", () => ({
  SensorRepository: jest.fn().mockImplementation(() => ({
    getSensorByMac: jest.fn(async (mac) => ({ macAddress: mac })),
  })),
}));

describe("MeasurementRepository: mocked database", () => {
  const repo = new MeasurementRepository();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getMeasurementsFromNetwork - all sensors", async () => {
    const dao1 = new MeasurementDAO();
    dao1.value = 10;
    dao1.createdAt = new Date();
    dao1.sensor = { macAddress: "A" } as any;

    const dao2 = new MeasurementDAO();
    dao2.value = 20;
    dao2.createdAt = new Date();
    dao2.sensor = { macAddress: "B" } as any;

    mockFind.mockResolvedValue([dao1, dao2]);

    const result = await repo.getMeasurementsFromNetwork("NET");
    expect(mockFind).toHaveBeenCalled();
    expect(result).toEqual([dao1, dao2]);
  });

  it("getMeasurementsFromNetwork - specific sensors", async () => {
    const dao = new MeasurementDAO();
    dao.value = 42;
    dao.createdAt = new Date();
    dao.sensor = { macAddress: "X" } as any;

    mockFind.mockResolvedValue([dao]);

    const result = await repo.getMeasurementsFromNetwork("NET", ["X"]);
    expect(mockFind).toHaveBeenCalled();
    expect(result).toEqual([dao]);
  });

  it("storeMeasurement", async () => {
    const measurement = { createdAt: new Date(), value: 5 };
    const createdDao = { ...measurement, sensor: { macAddress: "S" } };

    mockCreate.mockReturnValue(createdDao);
    mockSave.mockResolvedValue(createdDao);

    const result = await repo.storeMeasurement("NET", "GW", "S", measurement as any);

    expect(mockCreate).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalledWith(createdDao);
    expect(result).toEqual(createdDao);
  });

  it("getMeasurementsFromSensor", async () => {
    const dao = new MeasurementDAO();
    dao.value = 99;
    dao.createdAt = new Date();
    dao.sensor = { macAddress: "S" } as any;

    mockFind.mockResolvedValue([dao]);

    const result = await repo.getMeasurementsFromSensor("NET", "GW", "S");
    expect(mockFind).toHaveBeenCalled();
    expect(result).toEqual([dao]);
  });
});