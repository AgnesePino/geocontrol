import { Entity, Column, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { SensorDAO } from "@models/dao/SensorDAO";

@Entity("measurements")
export class MeasurementDAO {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	createdAt: Date;

	@Column("float")
	value: number;

	@ManyToOne(
		() => SensorDAO,
		(sensor) => sensor.measurements,
		// If a sensor is deleted, all its measurements are deleted too
		{ cascade: true, onDelete: "CASCADE" },
	)
	sensor: SensorDAO;
}
