export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE doctor_availability_date_schedules (
      doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
      available_on DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      slot_duration_minutes SMALLINT NOT NULL CHECK (slot_duration_minutes BETWEEN 10 AND 240),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (doctor_id, available_on),
      CHECK (end_time > start_time)
    );

    CREATE TABLE doctor_availability_date_slots (
      doctor_id UUID NOT NULL,
      available_on DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      is_available BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (doctor_id, available_on, start_time),
      FOREIGN KEY (doctor_id, available_on)
        REFERENCES doctor_availability_date_schedules (doctor_id, available_on) ON DELETE CASCADE,
      CHECK (end_time > start_time)
    );

    CREATE INDEX doctor_availability_date_slots_open_idx
      ON doctor_availability_date_slots (doctor_id, available_on, start_time)
      WHERE is_available = TRUE;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP TABLE doctor_availability_date_slots;
    DROP TABLE doctor_availability_date_schedules;
  `);
}
