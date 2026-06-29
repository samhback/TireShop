"use client";

type DeleteButtonProps = {
  action: (formData: FormData) => void | Promise<void>;
  fieldName: string;
  fieldValue: string | number;
  label: string;
  confirmMessage: string;
  className?: string;
};

export function DeleteButton({
  action,
  fieldName,
  fieldValue,
  label,
  confirmMessage,
  className = "delete-button",
}: DeleteButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input name={fieldName} type="hidden" value={fieldValue} />
      <button className={className} type="submit">
        {label}
      </button>
    </form>
  );
}
