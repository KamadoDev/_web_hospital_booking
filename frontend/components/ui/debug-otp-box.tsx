"use client";

type DebugOtpBoxProps = {
  otp?: string;
  onFill: (otp: string) => void;
  className?: string;
};

export function DebugOtpBox({ otp, onFill, className = "" }: DebugOtpBoxProps) {
  if (!otp) return null;

  return (
    <div className={`rounded-md border border-[#f5d48a] bg-[#fff8e8] px-3 py-2.5 text-sm text-[#8a4b00] ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">Mã OTP Test</p>
          <p className="mt-1 text-xl font-semibold tracking-[0.18em]">{otp}</p>
        </div>
        <button
          type="button"
          onClick={() => onFill(otp)}
          className="shrink-0 rounded-md border border-[#f5c26b] bg-white px-3 py-1.5 text-xs font-semibold text-[#8a4b00] hover:bg-[#fffaf0]"
        >
          Điền mã
        </button>
      </div>
      <p className="mt-2 text-xs leading-5">Chỉ hiển thị để phục vụ kiểm thử đồ án. (Thiếu kinh phí ạ)</p>
    </div>
  );
}
