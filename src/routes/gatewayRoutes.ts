import { authenticateUser } from "@middlewares/authMiddleware";
import { Router } from "express";
import {
	getAllGateways,
	createGateway,
	getGatewayByMac,
	updateGateway,
	deleteGateway,
} from "@controllers/gatewayController";
import { UserType } from "@models/UserType";
import { GatewayFromJSON } from "@models/dto/Gateway";

const router = Router({ mergeParams: true });

// Get all gateways (Any authenticated user)
router.get("/", authenticateUser(), async (req, res, next) => {
	try {
		const { networkCode } = req.params;
		const result = await getAllGateways(networkCode);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
});

// Create a new gateway (Admin & Operator)
router.post(
	"/",
	authenticateUser([UserType.Admin, UserType.Operator]),
	async (req, res, next) => {
		try {
			const { networkCode } = req.params;
			await createGateway(GatewayFromJSON(req.body), networkCode);
			res.status(201).send();
		} catch (error) {
			next(error);
		}
	},
);

// Get a specific gateway (Any authenticated user)
router.get("/:gatewayMac", authenticateUser(), async (req, res, next) => {
	try {
		const { networkCode, gatewayMac } = req.params;
		const result = await getGatewayByMac(networkCode, gatewayMac);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
});

// Update a gateway (Admin & Operator)
router.patch(
	"/:gatewayMac", 
	authenticateUser([UserType.Admin, UserType.Operator]),
	async (req, res, next) => {
		try {
			const { networkCode, gatewayMac } = req.params;
			await updateGateway(networkCode, gatewayMac, GatewayFromJSON(req.body));
			res.status(204).send();
		} catch (error) {
			next(error);
		}
	},
);

// Delete a gateway (Admin & Operator)
router.delete(
	"/:gatewayMac",
	authenticateUser([UserType.Admin, UserType.Operator]),
	async (req, res, next) => {
		try {
			const { networkCode, gatewayMac } = req.params;
			await deleteGateway(networkCode, gatewayMac);
			res.status(204).send();
		} catch (error) {
			next(error);
		}
	},
);

export default router;
