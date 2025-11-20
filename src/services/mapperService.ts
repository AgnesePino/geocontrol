import type { Token as TokenDTO } from "@dto/Token";
import type { User as UserDTO } from "@dto/User";
import type { Gateway as GatewayDTO } from "@dto/Gateway";
import type { Network as NetworkDTO } from "@dto/Network";
import type { ErrorDTO } from "@models/dto/ErrorDTO";
import type { Sensor as SensorDTO } from "@dto/Sensor";
import type { Measurement as MeasurementDTO } from "@dto/Measurement";
import type { Stats as StatsDTO } from "@dto/Stats";
import type { Measurements as MeasurementsDTO } from "@dto/Measurements";

import type { UserDAO } from "@models/dao/UserDAO";
import type { NetworkDAO } from "@dao/NetworkDAO";
import type { GatewayDAO } from "@models/dao/GatewayDAO";

import type { UserType } from "@models/UserType";
import type { SensorDAO } from "@models/dao/SensorDAO";
import type { MeasurementDAO } from "@models/dao/MeasurementDAO";

// ERROR DTO

export function createErrorDTO(
	code: number,
	message?: string,
	name?: string,
): ErrorDTO {
	return removeNullAttributes({
		code,
		name,
		message,
	}) as ErrorDTO;
}

// TOKEN DTO

export function createTokenDTO(token: string): TokenDTO {
	return removeNullAttributes({
		token: token,
	}) as TokenDTO;
}

// USER DTO

export function createUserDTO(
	username: string,
	type: UserType,
	password?: string,
): UserDTO {
	return removeNullAttributes({
		username,
		type,
		password,
	}) as UserDTO;
}

export function mapUserDAOToDTO(userDAO: UserDAO): UserDTO {
	return createUserDTO(userDAO.username, userDAO.type);
}

// NETWORK DTO

export function mapNetworkDAOToDTO(NetworkDao: NetworkDAO): NetworkDTO {
	return removeNullAttributes({
		code: NetworkDao.code,
		name: NetworkDao.name,
		description: NetworkDao.description,
		// If gateways are not mapped, when showing a network,
		// it will show an empty array instead of not showing the gateways key at all.
		// If gateways are present, though, it will map them to GatewayDTOs.
		gateways: NetworkDao.gateways?.map(mapGatewayDAOToDTO),
	}) as NetworkDTO;
}

// GATEWAY DTO

export function mapGatewayDAOToDTO(gateway: GatewayDAO): GatewayDTO {
	return removeNullAttributes({
		macAddress: gateway.macAddress,
		name: gateway.name,
		description: gateway.description,
		// If network is not mapped, when showing a gateway,
		// it will show an empty object instead of not showing the network key at all.
		// If network is present, though, it will map it to NetworkDTO.
		sensors: gateway.sensors?.map(mapSensorDAOToDTO),
	}) as GatewayDTO;
}

// SENSOR DTO

export function mapSensorDAOToDTO(sensorDao: SensorDAO): SensorDTO {
	return removeNullAttributes({
		macAddress: sensorDao.macAddress,
		name: sensorDao.name,
		description: sensorDao.description,
		variable: sensorDao.variable,
		unit: sensorDao.unit,
	}) as SensorDTO;
}

// MEASUREMENT DTO

function createMeasurementDTO(createdAt: Date, value: number): MeasurementDTO {
	return removeNullAttributes({
		createdAt,
		value,
	}) as MeasurementDTO;
}

export function mapMeasurementDAOToDTO(
	measurement: MeasurementDAO,
): MeasurementDTO {
	return createMeasurementDTO(measurement.createdAt, measurement.value);
}

// MEASUREMENTS DTO

export function createMeasurementsDTO(
	sensorMacAddress: string,
	stats?: StatsDTO,
	measurements?: MeasurementDTO[],
): MeasurementsDTO {
	return removeNullAttributes({
		sensorMacAddress,
		stats,
		measurements,
	}) as MeasurementsDTO;
}

// PRIVATE FUNCTIONS

function removeNullAttributes<T>(dto: T): Partial<T> {
	return Object.fromEntries(
		Object.entries(dto).filter(
			([_, value]) =>
				value !== null &&
				value !== undefined &&
				(!Array.isArray(value) || value.length > 0),
		),
	) as Partial<T>;
}
