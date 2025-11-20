import {
	Entity,
	Column,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
} from "typeorm";
import { GatewayDAO } from "@models/dao/GatewayDAO";
import { MeasurementDAO } from "@models/dao/MeasurementDAO";
import { emptyStringToNullTransformer } from "@utils";

@Entity("sensors")
export class SensorDAO {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ unique: true })
	macAddress: string;

	@Column({
		nullable: true,
		default: null,
		transformer: emptyStringToNullTransformer,
	})
	name: string | null;

	@Column({
		nullable: true,
		default: null,
		transformer: emptyStringToNullTransformer,
	})
	description: string | null;

	@Column({
		nullable: true,
		default: null,
		transformer: emptyStringToNullTransformer,
	})
	variable: string | null;

	@Column({
		nullable: true,
		default: null,
		transformer: emptyStringToNullTransformer,
	})
	unit: string | null;

	@ManyToOne(
		() => GatewayDAO,
		(gateway) => gateway.sensors,
		// If a gateway is deleted, all its sensors are deleted too
		{ cascade: true, onDelete: "CASCADE" },
	)
	gateway: GatewayDAO;

	@OneToMany(
		() => MeasurementDAO,
		(measurement) => measurement.sensor,
	)
	measurements: Array<MeasurementDAO>;
}
