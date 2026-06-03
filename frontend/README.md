This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Web Hospital Booking

He thong dat lich kham benh gom backend API, dashboard quan tri va site nguoi dung.

## Luong da xay dung

### Dashboard quan tri

- Quan ly chuyen khoa, bac si, lich lam viec, slot kham, goi kham.
- Quan ly nguoi dung, phan quyen, doi mat khau va xu ly dang xuat khi token het han.
- Quan ly lich hen: xac nhan, check-in, bat dau kham, hoan thanh, no-show, huy lich.
- Quan ly ho so kham, ket qua lam sang, upload file ket qua va preview anh/file khi co upload.
- Quan ly don thuoc.
- Quan ly hoa don, thanh toan, hoan tien va file ly do hoan tien.
- Thong ke dashboard bang chart/card.
- Quan ly cau hinh website: thong tin site, logo, favicon, banner, FAQ.
- Quan ly uploads: loc anh chua dung, xoa anh, cleanup anh khong dung.
- Tich hop widget chatbot trong dashboard.
- Ho tro giao dien sang/toi, sidebar co the an/hien, icon hoa UI.

### Site nguoi dung

- Trang Home public lay cau hinh site, banner hero dang carousel, chuyen khoa, bac si, goi kham va FAQ.
- FAQ Home duoc nhom theo 5 chu de: dat lich, thanh toan, bac si, BHYT, chung.
- Trang danh sach/chi tiet chuyen khoa, bac si, goi kham.
- Luong dat lich:
  - Chon chuyen khoa, bac si, goi kham, ngay kham, slot kham.
  - Form thong tin bat buoc va form thong tin bo sung.
  - Validate so dien thoai, email, ngay sinh, BHYT.
  - Gui OTP, xac thuc OTP.
  - Hien thi ma lich, trang thai, phi du kien va link tra cuu.
- Tra cuu lich hen:
  - Tra cuu bang ma lich + so dien thoai.
  - Quen ma lich bang OTP so dien thoai.
  - Hien thi lich gan day.
  - Hien thi trang thai lich, chi phi, hoa don, thanh toan, ket qua kham va don thuoc.
- Thanh toan public:
  - Tao giao dich online cho hoa don da phat hanh.
  - Mo cong thanh toan.
  - Kiem tra trang thai giao dich.
  - Tu poll giao dich pending moi 8 giay.
  - Huy giao dich pending.
  - Gia lap thanh toan MOCK.
- Ket qua kham public:
  - Chi hien thi ho so da cong bo.
  - Hien thi chan doan, dieu tri, loi dan, file ket qua.
  - Hien thi ket qua lam sang va file dinh kem.
  - Hien thi don thuoc da phat hanh.
- Huy lich public:
  - Cho nguoi benh huy lich dang cho xac nhan hoac da xac nhan.
  - Xac thuc bang OTP.
  - Giai phong slot sau khi huy.

## API public chinh

### Cau hinh site

- `GET /api/site-settings`
- `GET /api/banners`
- `GET /api/banners?position=HOME_HERO`
- `GET /api/faqs`
- `GET /api/faqs?category=booking`

### Du lieu dat lich

- `GET /api/departments`
- `GET /api/departments/:slug`
- `GET /api/doctors`
- `GET /api/doctors/:id`
- `GET /api/doctors/:id/available-slots?date=YYYY-MM-DD`
- `GET /api/packages`
- `GET /api/packages/:slug`

### Lich hen public

- `POST /api/appointments`
- `POST /api/appointments/:id/resend-otp`
- `POST /api/appointments/:id/verify-otp`
- `GET /api/appointments/:id?phone=...`
- `GET /api/appointments/lookup?bookingCode=...&phone=...`
- `POST /api/appointments/lookup/request-otp`
- `POST /api/appointments/lookup/verify-otp`

### API public da them

- `GET /api/appointments/lookup/result?bookingCode=...&phone=...`
  - Tra ket qua kham public.
  - Chi tra `MedicalRecord` khi `status = PUBLISHED`.
  - Chi tra `Prescription` khi `status = ISSUED`.

- `POST /api/appointments/lookup/cancel/request-otp`
  - Gui OTP xac nhan huy lich.
  - Body: `bookingCode`, `phone`, `reason`.

- `POST /api/appointments/lookup/cancel/verify`
  - Xac thuc OTP va huy lich tu phia nguoi benh.
  - Body: `bookingCode`, `phone`, `reason`, `otp`.
  - Chi cho huy lich `PENDING_CONFIRM` hoac `CONFIRMED`.
  - Cap nhat trang thai `CANCELLED_BY_PATIENT` va mo lai slot.

### Thanh toan public

- `POST /api/payments/invoices/:invoiceId/create`
- `GET /api/payments/:id`
- `PATCH /api/payments/:id/cancel`
- `GET /api/payments/mock/checkout/:transactionCode`
- `POST /api/payments/mock/:transactionCode/success`
- `POST /api/payments/mock/:transactionCode/fail`

## API dashboard chinh

### Cau hinh site

- `GET /api/dashboard/site-settings`
- `PATCH /api/dashboard/site-settings`
- `GET /api/dashboard/banners`
- `GET /api/dashboard/banners/:id`
- `POST /api/dashboard/banners`
- `PATCH /api/dashboard/banners/:id`
- `DELETE /api/dashboard/banners/:id`
- `GET /api/dashboard/faqs`
- `GET /api/dashboard/faqs/:id`
- `POST /api/dashboard/faqs`
- `PATCH /api/dashboard/faqs/:id`
- `DELETE /api/dashboard/faqs/:id`

### Uploads

- `POST /api/uploads/images`
- `GET /api/uploads/images?isUsed=false&page=1&limit=20`
- `DELETE /api/uploads/images/:id`
- `POST /api/uploads/images/cleanup-unused`

### Quan tri nghiep vu

- `/api/dashboard/departments`
- `/api/dashboard/doctors`
- `/api/dashboard/doctor-schedules`
- `/api/dashboard/doctor-time-slots`
- `/api/dashboard/packages`
- `/api/dashboard/appointments`
- `/api/dashboard/medical-records`
- `/api/dashboard/prescriptions`
- `/api/dashboard/invoices`
- `/api/dashboard/statistics`
- `/api/dashboard/users`
- `/api/dashboard/chatbot`

## Ghi chu bao mat public

- Nguoi benh tra cuu du lieu nhay cam bang `bookingCode + phone`.
- Ket qua kham nhap khong duoc public.
- Don thuoc nhap khong duoc public.
- Huy lich public bat buoc OTP.
- Thanh toan online chi tao duoc khi hoa don o trang thai `UNPAID`.

