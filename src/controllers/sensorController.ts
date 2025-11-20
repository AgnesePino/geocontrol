import { SensorRepository } from "@repositories/SensorRepository";
import type { Sensor as SensorDTO } from "@dto/Sensor";
import { mapSensorDAOToDTO } from "@services/mapperService";
import {
	withExistingNetwork,
	withExistingNetworkAndGateway,
} from "@services/existenceService";

export const sensorRepo = new SensorRepository();

export async function getAllSensorsOfNetwork(
	networkCode: string,
): Promise<SensorDTO[]> {
	return await withExistingNetwork(networkCode, async () => {
		const daos = await sensorRepo.getAllSensorsOfNetwork(networkCode);
		return daos.map(mapSensorDAOToDTO);
	});
}

export async function getAllSensorsOfGateway(
	networkCode: string,
	gatewayMac: string,
): Promise<SensorDTO[]> {
	return await withExistingNetworkAndGateway(
		networkCode,
		gatewayMac,
		async () => {
			const daos = await sensorRepo.getAllSensorsOfGateway(gatewayMac);
			return daos.map(mapSensorDAOToDTO);
		},
	);
}

export async function getSensorByMac(
	networkCode: string,
	gatewayMac: string,
	sensorMac: string,
): Promise<SensorDTO> {
	return await withExistingNetworkAndGateway(
		networkCode,
		gatewayMac,
		async () => {
			const dao = await sensorRepo.getSensorByMac(sensorMac);
			return mapSensorDAOToDTO(dao);
		},
	);
}

export async function createSensor(
	networkCode: string,
	gatewayMac: string,
	sensorDto: SensorDTO,
): Promise<void> {
	await withExistingNetworkAndGateway(networkCode, gatewayMac, () => {
		return sensorRepo.createSensor(gatewayMac, sensorDto);
	});
}

export async function updateSensor(
	networkCode: string,
	gatewayMac: string,
	sensorMac: string,
	updatedSensor: SensorDTO,
): Promise<void> {
	await withExistingNetworkAndGateway(networkCode, gatewayMac, () => {
		return sensorRepo.updateSensor(sensorMac, updatedSensor);
	});
}

export async function deleteSensor(
	networkCode: string,
	gatewayMac: string,
	sensorMac: string,
): Promise<void> {
	await withExistingNetworkAndGateway(networkCode, gatewayMac, () => {
		return sensorRepo.deleteSensor(sensorMac);
	});
}
