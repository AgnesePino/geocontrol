import type { Network as NetworkDTO } from "@dto/Network";
import { NetworkRepository } from "@repositories/NetworkRepository";
import { mapNetworkDAOToDTO } from "@services/mapperService";
import type { NetworkDAO } from "@models/dao/NetworkDAO";

export const networkRepo = new NetworkRepository();

export async function getAllNetworks(): Promise<NetworkDTO[]> {
	return (await networkRepo.getAllNetworks()).map(mapNetworkDAOToDTO);
}

export async function getNetworkByCode(code: string): Promise<NetworkDTO> {
	return mapNetworkDAOToDTO(await networkRepo.getNetworkByCode(code));
}

export async function createNetwork(networkDto: NetworkDTO): Promise<void> {
	await networkRepo.createNetwork(
		networkDto.code,
		networkDto.name,
		networkDto.description,
	);
}

export async function updateNetwork(
	code: string,
	updates: Partial<NetworkDTO>,
): Promise<void> {
	const { gateways, ...safeUpdates } = updates;
	await networkRepo.updateNetwork(code, safeUpdates as Partial<NetworkDAO>);
}

export async function deleteNetwork(code: string): Promise<void> {
	await networkRepo.deleteNetwork(code);
}
