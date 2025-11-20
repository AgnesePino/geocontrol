import type { GatewayDAO } from "@models/dao/GatewayDAO";
import { GatewayRepository } from "@repositories/GatewayRepository";
import type { Gateway as GatewayDTO } from "@dto/Gateway";
import { withExistingNetwork } from "@services/existenceService";
import { mapGatewayDAOToDTO } from "@services/mapperService";

export const gatewayRepo = new GatewayRepository();

export async function getAllGateways(
	networkCode: string,
): Promise<GatewayDTO[]> {
	return await withExistingNetwork(networkCode, async () => {
		return (await gatewayRepo.getAllGateways(networkCode)).map(
			mapGatewayDAOToDTO,
		);
	});
}

export async function createGateway(
	gatewayDto: GatewayDTO,
	networkCode: string,
): Promise<void> {
	await withExistingNetwork(networkCode, () => {
		return gatewayRepo.createGateway(
			gatewayDto.macAddress,
			networkCode,
			gatewayDto.name,
			gatewayDto.description,
		);
	});
}

export async function getGatewayByMac(
	networkCode: string,
	gatewayMac: string,
): Promise<GatewayDTO> {
	return await withExistingNetwork(networkCode, async () => {
		return mapGatewayDAOToDTO(await gatewayRepo.getGatewayByMac(gatewayMac));
	});
}

export async function updateGateway(
	networkCode: string,
	gatewayMac: string,
	updates: Partial<GatewayDTO>,
): Promise<void> {
	await withExistingNetwork(networkCode, () => {
		return gatewayRepo.updateGateway(
			gatewayMac,
			updates as Partial<GatewayDAO>,
		);
	});
}

export async function deleteGateway(
	networkCode: string,
	gatewayMac: string,
): Promise<void> {
	await withExistingNetwork(networkCode, () => {
		return gatewayRepo.deleteGateway(gatewayMac);
	});
}
