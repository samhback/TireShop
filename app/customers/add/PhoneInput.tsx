"use client";

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

type PhoneInputProps = {
  defaultValue?: string;
};

export function PhoneInput({ defaultValue = "" }: PhoneInputProps) {
  return (
    <input
      defaultValue={formatPhone(defaultValue)}
      id="phone"
      inputMode="tel"
      name="phone"
      onChange={(event) => {
        event.currentTarget.value = formatPhone(event.currentTarget.value);
      }}
      placeholder="(580) 555-1234"
      required
      type="tel"
    />
  );
}
