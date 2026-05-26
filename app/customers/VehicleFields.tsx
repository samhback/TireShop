import {
  colorOptions,
  driveTypeOptions,
  engineSuggestions,
  fuelTypeOptions,
  stateOptions,
  transmissionDetailSuggestions,
  transmissionTypeOptions,
} from "@/lib/vehicleOptions";

type VehicleFieldsProps = {
  idPrefix?: string;
};

function fieldId(idPrefix: string, name: string) {
  return idPrefix ? `${idPrefix}-${name}` : name;
}

export function VehicleFields({ idPrefix = "" }: VehicleFieldsProps) {
  return (
    <>
      <div className="field">
        <label htmlFor={fieldId(idPrefix, "year")}>Year</label>
        <input id={fieldId(idPrefix, "year")} name="year" required />
      </div>

      <div className="field">
        <label htmlFor={fieldId(idPrefix, "make")}>Make</label>
        <input id={fieldId(idPrefix, "make")} name="make" required />
      </div>

      <div className="field">
        <label htmlFor={fieldId(idPrefix, "model")}>Model</label>
        <input id={fieldId(idPrefix, "model")} name="model" required />
      </div>

      <div className="field">
        <label htmlFor={fieldId(idPrefix, "trim")}>Trim</label>
        <input id={fieldId(idPrefix, "trim")} name="trim" />
      </div>

      <div className="field">
        <label htmlFor={fieldId(idPrefix, "vin")}>VIN</label>
        <input id={fieldId(idPrefix, "vin")} name="vin" />
      </div>

      <div className="field">
        <label htmlFor={fieldId(idPrefix, "licensePlate")}>License Plate</label>
        <input id={fieldId(idPrefix, "licensePlate")} name="licensePlate" />
      </div>

      <div className="field">
        <label htmlFor={fieldId(idPrefix, "plateState")}>Plate State</label>
        <select
          defaultValue="OK"
          id={fieldId(idPrefix, "plateState")}
          name="plateState"
        >
          {stateOptions.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={fieldId(idPrefix, "color")}>Color</label>
        <select id={fieldId(idPrefix, "color")} name="color">
          {colorOptions.map((color) => (
            <option key={color} value={color === "Unknown" ? "" : color}>
              {color}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={fieldId(idPrefix, "mileage")}>Mileage</label>
        <input
          id={fieldId(idPrefix, "mileage")}
          min="0"
          name="mileage"
          type="number"
        />
      </div>

      <div className="field">
        <label htmlFor={fieldId(idPrefix, "engineSize")}>Engine</label>
        <input
          id={fieldId(idPrefix, "engineSize")}
          list={fieldId(idPrefix, "engineOptions")}
          name="engineSize"
          placeholder="5.3L V8"
        />
        <datalist id={fieldId(idPrefix, "engineOptions")}>
          {engineSuggestions.map((engine) => (
            <option key={engine} value={engine} />
          ))}
        </datalist>
      </div>

      <div className="field">
        <label htmlFor={fieldId(idPrefix, "transmissionType")}>
          Transmission Type
        </label>
        <select
          id={fieldId(idPrefix, "transmissionType")}
          name="transmissionType"
        >
          {transmissionTypeOptions.map((type) => (
            <option key={type} value={type === "Unknown" ? "" : type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={fieldId(idPrefix, "transmissionDetails")}>
          Transmission Details
        </label>
        <input
          id={fieldId(idPrefix, "transmissionDetails")}
          list={fieldId(idPrefix, "transmissionDetailOptions")}
          name="transmissionDetails"
          placeholder="6-speed automatic"
        />
        <datalist id={fieldId(idPrefix, "transmissionDetailOptions")}>
          {transmissionDetailSuggestions.map((detail) => (
            <option key={detail} value={detail} />
          ))}
        </datalist>
      </div>

      <div className="field">
        <label htmlFor={fieldId(idPrefix, "fuelType")}>Fuel Type</label>
        <select id={fieldId(idPrefix, "fuelType")} name="fuelType">
          {fuelTypeOptions.map((type) => (
            <option key={type} value={type === "Unknown" ? "" : type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={fieldId(idPrefix, "driveType")}>Drive Type</label>
        <select id={fieldId(idPrefix, "driveType")} name="driveType">
          {driveTypeOptions.map((type) => (
            <option key={type} value={type === "Unknown" ? "" : type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={fieldId(idPrefix, "tireSize")}>Tire Size</label>
        <input
          id={fieldId(idPrefix, "tireSize")}
          name="tireSize"
          placeholder="245/60R18"
        />
      </div>
    </>
  );
}
