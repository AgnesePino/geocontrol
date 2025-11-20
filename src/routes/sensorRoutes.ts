import {
	createSensor,
	deleteSensor,
	getAllSensorsOfGateway,
	getSensorByMac,
	updateSensor,
} from "@controllers/sensorController";
import { authenticateUser } from "@middlewares/authMiddleware";
import { SensorFromJSON } from "@models/dto/Sensor";
import { UserType } from "@models/UserType";
import { Router } from "express";

const router = Router({ mergeParams: true });

// Get all sensors (Any authenticated user)
router.get("", authenticateUser(), async (req, res, next) => {
	try {
		const { networkCode, gatewayMac } = req.params;
		const result = await getAllSensorsOfGateway(networkCode, gatewayMac);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
});

// Create a new sensor (Admin & Operator)
router.post(
	"",
	authenticateUser([UserType.Admin, UserType.Operator]),
	async (req, res, next) => {
		try {
			const { networkCode, gatewayMac } = req.params;
			const sensorDto = SensorFromJSON(req.body);
			await createSensor(networkCode, gatewayMac, sensorDto);
			res.status(201).send();
		} catch (error) {
			next(error);
		}
	},
);

// Get a specific sensor (Any authenticated user)
router.get("/:sensorMac", authenticateUser(), async (req, res, next) => {
	try {
		const { networkCode, gatewayMac, sensorMac } = req.params;
		const sensor = await getSensorByMac(networkCode, gatewayMac, sensorMac);
		res.status(200).json(sensor);
	} catch (error) {
		next(error);
	}
});

// Update a sensor (Admin & Operator)
router.patch(
	"/:sensorMac",
	authenticateUser([UserType.Admin, UserType.Operator]),
	async (req, res, next) => {
		try {
			const { networkCode, gatewayMac, sensorMac } = req.params;
			const sensorDto = SensorFromJSON(req.body);
			await updateSensor(networkCode, gatewayMac, sensorMac, sensorDto);
			res.status(204).send();
		} catch (error) {
			next(error);
		}
	},
);

// Delete a sensor (Admin & Operator)
router.delete(
	"/:sensorMac",
	authenticateUser([UserType.Admin, UserType.Operator]),
	async (req, res, next) => {
		try {
			const { networkCode, gatewayMac, sensorMac } = req.params;
			await deleteSensor(networkCode, gatewayMac, sensorMac);
			res.status(204).send();
		} catch (error) {
			next(error);
		}
	},
);

export default router;
