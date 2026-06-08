# Hospital Booking Backend

Backend API cho website dat lich kham benh, gom public API cho nguoi dung va dashboard API cho Admin/Staff/Doctor.

## Scripts

```bash
npm install
npm run dev
npm run build
npx prisma generate
npx prisma migrate dev
```

Server mac dinh:

```txt
http://localhost:4000
```

Tat ca API duoc mount voi prefix:

```txt
/api
```

## Environment

Can cau hinh cac bien moi truong chinh:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
OTP_SECRET=your_otp_secret
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
FRONTEND_URL=http://localhost:5173
# hoac
FRONTEND_URLS=http://localhost:3000,http://localhost:5173
```

## Auth Flow Dashboard

Dashboard login dung password + OTP + httpOnly cookie.

```txt
POST /api/auth/dashboard/login
POST /api/auth/dashboard/verify-otp
GET  /api/auth/dashboard/me
POST /api/auth/dashboard/logout
```

Flow:

```txt
1. Login bang phone + password
2. Backend tao DashboardLoginChallenge va gui OTP
3. Verify bang challengeId + otp
4. Backend set cookie dashboard_token
5. Frontend goi /me de lay user hien tai
```

Body login:

```json
{
  "phone": "0352147258",
  "password": "123456"
}
```

Body verify OTP:

```json
{
  "challengeId": "uuid",
  "otp": "123456"
}
```

OTP that la 6 so ngau nhien. Trong DB chi luu OTP da hash bang HMAC.

## OTP Public

```txt
POST /api/otp/send
POST /api/otp/verify
```

Public OTP khong cho phep purpose dashboard login. Dashboard login phai di qua `/api/auth/dashboard/login`.

## Dashboard Users

Yeu cau dang nhap dashboard va role `ADMIN`.

```txt
GET   /api/dashboard/users
POST  /api/dashboard/users
GET   /api/dashboard/users/:id
PATCH /api/dashboard/users/:id
PATCH /api/dashboard/users/:id/status
PATCH /api/dashboard/users/:id/password
```

Dung de quan ly tai khoan noi bo: `ADMIN`, `STAFF`, `DOCTOR`.

Tao user bac si:

```json
{
  "fullName": "Nguyen Van Bac Si",
  "phone": "0352147258",
  "email": "doctor1@example.com",
  "password": "123456",
  "role": "DOCTOR",
  "avatarAssetId": "media-asset-id",
  "isActive": true
}
```

## Dashboard Departments

Yeu cau dang nhap dashboard.

```txt
GET    /api/dashboard/departments
GET    /api/dashboard/departments/:id
POST   /api/dashboard/departments
PATCH  /api/dashboard/departments/:id
DELETE /api/dashboard/departments/:id
```

Quyen:

```txt
Xem:     ADMIN, STAFF, DOCTOR
Tao/sua: ADMIN, STAFF
Xoa:     ADMIN
```

Tao chuyen khoa:

```json
{
  "name": "Khoa Tim mach",
  "slug": "khoa-tim-mach",
  "description": "Kham va dieu tri cac benh ly tim mach",
  "imageAssetId": "media-asset-id",
  "isActive": true
}
```

## Dashboard Doctors

Yeu cau dang nhap dashboard.

```txt
GET    /api/dashboard/doctors
GET    /api/dashboard/doctors/:id
POST   /api/dashboard/doctors
PATCH  /api/dashboard/doctors/:id
PATCH  /api/dashboard/doctors/:id/availability
DELETE /api/dashboard/doctors/:id
```

Quyen:

```txt
Xem:                         ADMIN, STAFF, DOCTOR
Tao/sua/bat tat availability: ADMIN, STAFF
Xoa:                         ADMIN
```

Tao ho so bac si:

```json
{
  "userId": "doctor-user-id",
  "departmentId": "department-id",
  "title": "ThS.BS",
  "bio": "Bac si co kinh nghiem trong kham va dieu tri.",
  "specialization": "Tim mach",
  "experience": 8,
  "consultationFee": 300000,
  "isAvailable": true
}
```

## Upload Images

Yeu cau dang nhap dashboard va role `ADMIN` hoac `STAFF`.

```txt
POST /api/uploads/images
```

Request `multipart/form-data`:

```txt
folder = departments | users | doctors | packages | medical-results | site-settings | banners
files  = image file
```

Backend upload anh len Cloudinary, tao `MediaAsset` voi `isUsed=false`, va tra ve `id` de gan vao entity.

Upload hien cho phep JPG/JPEG, PNG, WEBP, GIF, SVG va ICO. Gioi han toi da 5MB moi file va 10 file moi request.

Response mau:

```json
{
  "success": true,
  "message": "Upload anh thanh cong",
  "data": {
    "items": [
      {
        "id": "media-asset-id",
        "url": "https://res.cloudinary.com/...",
        "publicId": "hospital/departments/...",
        "folder": "hospital/departments",
        "mimeType": "image/jpeg",
        "format": "jpg",
        "bytes": 97982,
        "width": 675,
        "height": 1200,
        "isUsed": false
      }
    ]
  }
}
```

Khi tao/sua chuyen khoa hoac user, gui `imageAssetId` / `avatarAssetId`. Backend se tu lay URL tu `MediaAsset`, luu vao entity va mark asset thanh `isUsed=true`.

## Public API

Khong can dang nhap, dung cho frontend nguoi dung.

```txt
GET /api/departments
GET /api/departments/:slug
```

Chi tra chuyen khoa `isActive=true`.

```txt
GET /api/doctor
GET /api/doctor/:id
GET /api/doctors
GET /api/doctors/:id
```

Chi tra bac si:

```txt
DoctorProfile.isAvailable = true
User.isActive = true
Department.isActive = true
```

Co the filter:

```txt
GET /api/doctor?departmentSlug=khoa-tim-mach
GET /api/doctor?departmentId=uuid
GET /api/doctor?search=tim
```

## Notes for Frontend

Voi dashboard API, frontend can gui cookie:

```ts
axios.create({
  baseURL: "http://localhost:4000/api",
  withCredentials: true,
});
```

Voi upload anh, UX nen lam:

```txt
1. Preview local ngay bang URL.createObjectURL(file)
2. Upload ngầm len /api/uploads/images
3. Lay mediaAssetId
4. Khi bam Save, gui imageAssetId/avatarAssetId
```

## Suggested Git Commit

Nen commit theo nhom tinh nang lon:

```bash
git add .
git commit -m "feat: add dashboard auth, user management, media upload APIs"
git push origin your-branch-name
```

Neu muon tach commit sach hon:

```bash
git add prisma src/middlewares src/utils src/config
git commit -m "feat: add auth middleware, media assets, and shared utilities"

git add src/controllers src/routes src/services src/validations
git commit -m "feat: add dashboard and public hospital APIs"

git add package.json package-lock.json README.md
git commit -m "docs: document API usage and dependencies"
```
