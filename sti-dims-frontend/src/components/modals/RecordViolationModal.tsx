type RecordViolationModalProps = {
  open?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  studentId?: number;
  studentName?: string;
};

export default function RecordViolationModal({
  open,
  isOpen,
  onClose,
  studentName,
}: RecordViolationModalProps) {
  const visible = open ?? isOpen ?? true;

  if (!visible) return null;

  return (
    <div className="rounded-lg border bg-white p-4 shadow">
      <h2 className="text-lg font-semibold">Record Violation</h2>

      {studentName && (
        <p className="text-sm text-gray-600">
          Student: {studentName}
        </p>
      )}

      <p className="text-sm text-gray-600">This modal is under development.</p>

      <button
        type="button"
        onClick={onClose}
        className="mt-3 rounded bg-gray-900 px-3 py-1 text-white"
      >
        Close
      </button>
    </div>
  );
}
