import * as networkController from "@controllers/networkController";
import { NetworkDAO } from "@models/dao/NetworkDAO";
import { NetworkRepository } from "@repositories/NetworkRepository";

jest.mock("@repositories/NetworkRepository");

describe("NetworkController integration", () => {
  it("getNetworkByCode: returns mapped DTO without gateways", async () => {
    const fakeNetworkDAO: NetworkDAO = {
      id: 1,
      code: "NET123",
      name: "Test Network",
      description: "Network for testing",
      gateways: []
    };

    const expectedDTO = {
      code: "NET123",
      name: "Test Network",
      description: "Network for testing"
    };

    const mockRepoInstance = {
      getNetworkByCode: jest.fn().mockResolvedValue(fakeNetworkDAO)
    };

    (NetworkRepository as jest.Mock).mockImplementation(() => mockRepoInstance);
    (networkController as any).networkRepo = mockRepoInstance;

    const result = await networkController.getNetworkByCode("NET123");

    expect(result).toEqual(expectedDTO);
    expect(result).not.toHaveProperty("gateways");
  });

  it("getAllNetworks: returns mapped list", async () => {
    const fakeDAOList: NetworkDAO[] = [
      {
        id: 1,
        code: "NET1",
        name: "Network 1",
        description: "Description 1",
        gateways: []
      }
    ];

    const mockRepoInstance = {
      getAllNetworks: jest.fn().mockResolvedValue(fakeDAOList)
    };

    (NetworkRepository as jest.Mock).mockImplementation(() => mockRepoInstance);
    (networkController as any).networkRepo = mockRepoInstance;

    const result = await networkController.getAllNetworks();

    expect(result).toEqual([
      {
        code: "NET1",
        name: "Network 1",
        description: "Description 1"
      }
    ]);
  });

  it("createNetwork: calls repository with correct args", async () => {
    const dto = {
      code: "NET2",
      name: "Network 2",
      description: "Test create"
    };

    const mockRepoInstance = {
      createNetwork: jest.fn().mockResolvedValue(undefined)
    };

    (NetworkRepository as jest.Mock).mockImplementation(() => mockRepoInstance);
    (networkController as any).networkRepo = mockRepoInstance;

    await networkController.createNetwork(dto);

    expect(mockRepoInstance.createNetwork).toHaveBeenCalledWith(
      dto.code,
      dto.name,
      dto.description
    );
  });

  it("updateNetwork: strips gateways and updates", async () => {
    const updates = {
      name: "Updated Name",
      gateways: []
    };

    const mockRepoInstance = {
      updateNetwork: jest.fn().mockResolvedValue(undefined)
    };

    (NetworkRepository as jest.Mock).mockImplementation(() => mockRepoInstance);
    (networkController as any).networkRepo = mockRepoInstance;

    await networkController.updateNetwork("NET3", updates);

    expect(mockRepoInstance.updateNetwork).toHaveBeenCalledWith(
      "NET3",
      { name: "Updated Name" }
    );
  });

  it("updateNetwork: ignores undefined gateways", async () => {
    const updates = {
      name: "Updated Title",
      gateways: undefined
    };

    const mockRepoInstance = {
      updateNetwork: jest.fn().mockResolvedValue(undefined)
    };

    (NetworkRepository as jest.Mock).mockImplementation(() => mockRepoInstance);
    (networkController as any).networkRepo = mockRepoInstance;

    await networkController.updateNetwork("NET5", updates);

    expect(mockRepoInstance.updateNetwork).toHaveBeenCalledWith(
      "NET5",
      { name: "Updated Title" }
    );
  });

  it("updateNetwork: accepts partial update with only description", async () => {
    const updates = {
      description: "Just this field"
    };

    const mockRepoInstance = {
      updateNetwork: jest.fn().mockResolvedValue(undefined)
    };

    (NetworkRepository as jest.Mock).mockImplementation(() => mockRepoInstance);
    (networkController as any).networkRepo = mockRepoInstance;

    await networkController.updateNetwork("NET6", updates);

    expect(mockRepoInstance.updateNetwork).toHaveBeenCalledWith(
      "NET6",
      { description: "Just this field" }
    );
  });

  it("deleteNetwork: calls repository delete", async () => {
    const mockRepoInstance = {
      deleteNetwork: jest.fn().mockResolvedValue(undefined)
    };

    (NetworkRepository as jest.Mock).mockImplementation(() => mockRepoInstance);
    (networkController as any).networkRepo = mockRepoInstance;

    await networkController.deleteNetwork("NET4");

    expect(mockRepoInstance.deleteNetwork).toHaveBeenCalledWith("NET4");
  });
});
