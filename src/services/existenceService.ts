import { getGatewayByMac } from "@controllers/gatewayController";
import { getNetworkByCode } from "@controllers/networkController";
import { getSensorByMac } from "@controllers/sensorController";

/**
 * Ensures the existence of a network, a gateway, and a sensor by their respective identifiers.
 * If any of them does not exist, an error of type 404 is thrown,
 * with an appropriate message, and the callback is not executed.
 *
 * @param networkCode - The network code to check for existence.
 * @param gatewayMac - The gateway MAC address to check for existence.
 * @param sensorMac - The sensor MAC address to check for existence.
 * @param callback - The callback function to execute if all three exist.
 *
 * @returns A promise that resolves to the result of the callback function.
 *
 * @throws NotFoundError - If any of the network, gateway, or sensor does not exist.
 */
export async function withExistingNetworkGatewayAndSensor<T>(
	networkCode: string,
	gatewayMac: string,
	sensorMac: string,
	callback: () => T | Promise<T>,
): Promise<T> {
	// First two are not actually needed, because the sensor check will throw an error if they don't exist.
	await getNetworkByCode(networkCode);
	await getGatewayByMac(networkCode, gatewayMac);
	await getSensorByMac(networkCode, gatewayMac, sensorMac);
	return callback();
}

/**
 * Ensures the existence of a network and a gateway by their respective identifiers.
 * If either the network or the gateway does not exist, an error of type 404 is thrown,
 * with an appropriate message, and the callback is not executed.
 *
 * @param networkCode - The network code to check for existence.
 * @param gatewayMac - The gateway MAC address to check for existence.
 * @param callback - The callback function to execute if both the network and gateway exist.
 *
 * @returns A promise that resolves to the result of the callback function.
 *
 * @throws NotFoundError - If either the network or the gateway does not exist.
 */
export async function withExistingNetworkAndGateway<T>(
	networkCode: string,
	gatewayMac: string,
	callback: () => T | Promise<T>,
): Promise<T> {
	// The first one is not actually needed, because the gateway check will throw an error if it doesn't exist.
	await getNetworkByCode(networkCode);
	await getGatewayByMac(networkCode, gatewayMac);
	return callback();
}

/**
 * Ensures the existence of a network by its code.
 * If the network does not exist, an error of type 404 is thrown,
 * with an appropriate message, and the callback is not executed.
 *
 * @param networkCode - The network code to check for existence.
 * @param callback - The callback function to execute if the network exists.
 *
 * @returns A promise that resolves to the result of the callback function.
 *
 * @throws NotFoundError - If the network does not exist.
 */
export async function withExistingNetwork<T>(
	networkCode: string,
	callback: () => T | Promise<T>,
): Promise<T> {
	await getNetworkByCode(networkCode);
	return callback();
}
