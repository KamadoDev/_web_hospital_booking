"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, MessageSquareText, RefreshCw, Star } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatVietnamDateTime } from "@/lib/date";

type ReviewItem = {
  id: string;
  rating: number;
  doctorRating: number;
  serviceRating: number;
  facilityRating: number;
  comment: string | null;
  isVisible: boolean;
  createdAt: string;
  appointment: {
    bookingCode?: string;
    patientName?: string;
    appointmentDate: string;
    startTime: string;
  };
  doctor: {
    title: string | null;
    user: { fullName: string };
    department: { name: string };
  };
};

type ReviewDashboardData = {
  items: ReviewItem[];
  metrics: {
    total: number;
    averageRating: number;
    averageDoctorRating: number;
    averageServiceRating: number;
    averageFacilityRating: number;
  };
  pagination: { total: number };
};

const formatScore = (value: number) => (value ? value.toFixed(1) : "-");

export default function DashboardReviewsPage() {
  const { user } = useAuth();
  const reviewsQuery = useQuery({
    queryKey: ["dashboard", "reviews"],
    queryFn: () =>
      apiRequest<ReviewDashboardData>("/dashboard/reviews", {
        query: { limit: 50 },
      }),
    staleTime: 30_000,
  });
  const data = reviewsQuery.data;
  const canModerate = user?.role === "ADMIN" || user?.role === "STAFF";
  const updateVisibility = async (review: ReviewItem) => {
    await apiRequest(`/dashboard/reviews/${review.id}/visibility`, {
      method: "PATCH",
      body: { isVisible: !review.isVisible },
    });
    await reviewsQuery.refetch();
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <p className="text-sm font-medium text-[var(--text-muted)]">
            Chất lượng phục vụ
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Đánh giá sau khám</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Tổng hợp phản hồi đã được người bệnh xác thực bằng OTP.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reviewsQuery.refetch()}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface-soft)]"
        >
          <RefreshCw
            className={`h-4 w-4 ${reviewsQuery.isFetching ? "animate-spin" : ""}`}
          />{" "}
          Làm mới
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Điểm trung bình", data?.metrics.averageRating || 0, Star],
          ["Bác sĩ", data?.metrics.averageDoctorRating || 0, Star],
          [
            "Dịch vụ",
            data?.metrics.averageServiceRating || 0,
            MessageSquareText,
          ],
          [
            "Cơ sở vật chất",
            data?.metrics.averageFacilityRating || 0,
            BarChart3,
          ],
        ].map(([label, value, Icon]) => {
          const IconComponent = Icon as typeof Star;
          return (
            <div
              key={label as string}
              className="border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--text-muted)]">
                  {label as string}
                </p>
                <IconComponent className="h-4 w-4 text-[var(--primary)]" />
              </div>
              <p className="mt-3 text-2xl font-semibold">
                {formatScore(value as number)}{" "}
                <span className="text-sm font-medium text-[var(--text-muted)]">
                  / 5
                </span>
              </p>
            </div>
          );
        })}
      </section>

      <section className="overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border-soft)] px-5 py-4">
          <h2 className="font-semibold">Phản hồi gần đây</h2>
        </div>
        {reviewsQuery.isLoading ? (
          <p className="p-5 text-sm text-[var(--text-muted)]">
            Đang tải đánh giá...
          </p>
        ) : null}
        {reviewsQuery.error ? (
          <p className="m-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {reviewsQuery.error instanceof Error
              ? reviewsQuery.error.message
              : "Không tải được đánh giá"}
          </p>
        ) : null}
        {!reviewsQuery.isLoading &&
        !reviewsQuery.error &&
        !data?.items.length ? (
          <p className="p-5 text-sm text-[var(--text-muted)]">
            Chưa có phản hồi nào.
          </p>
        ) : null}
        <div className="divide-y divide-[var(--border-soft)]">
          {data?.items.map((review) => (
            <article key={review.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {review.appointment.patientName ? (
                      <>
                        {review.appointment.patientName}{" "}
                        <span className="font-normal text-[var(--text-muted)]">
                          · {review.appointment.bookingCode}
                        </span>
                      </>
                    ) : (
                      "Phản hồi ẩn danh"
                    )}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {review.doctor.title ? `${review.doctor.title} ` : ""}
                    {review.doctor.user.fullName} ·{" "}
                    {review.doctor.department.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--primary-soft)] px-2.5 py-1 text-sm font-semibold text-[var(--primary)]">
                    <Star className="h-4 w-4 fill-current" />{" "}
                    {formatScore(review.rating)}
                  </span>
                  {canModerate ? (
                    <button
                      type="button"
                      onClick={() => void updateVisibility(review)}
                      className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${review.isVisible ? "border-[#f2b8b5] text-[#b3261e] hover:bg-[#fff3f2]" : "border-[#bde5c8] text-[#1f7a3a] hover:bg-[#f0fff4]"}`}
                    >
                      {review.isVisible ? "Ẩn khỏi web" : "Công khai"}
                    </button>
                  ) : (
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${review.isVisible ? "bg-[#f0fff4] text-[#1f7a3a]" : "bg-[#fff8eb] text-[#8a5a00]"}`}
                    >
                      {review.isVisible ? "Đã công khai" : "Chờ duyệt"}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--text-soft)]">
                <span>Bác sĩ: {review.doctorRating}/5</span>
                <span>Dịch vụ: {review.serviceRating}/5</span>
                <span>Cơ sở vật chất: {review.facilityRating}/5</span>
                <span>{formatVietnamDateTime(review.createdAt)}</span>
              </div>
              {review.comment ? (
                <p className="mt-3 border-l-2 border-[var(--primary)] pl-3 text-sm leading-6 text-[var(--text-soft)]">
                  {review.comment}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
