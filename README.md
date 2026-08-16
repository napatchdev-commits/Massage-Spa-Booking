# 💆‍♀️ ระบบจองคิวร้านนวดสปาผ่าน LINE Official Account (Spa & Massage Booking System)

ระบบจองคิวและจัดการคิวร้านนวดสปาแบบ **Production Ready** ที่ออกแบบมาสำหรับใช้งานจริงในสภาพแวดล้อม Production รองรับการจองผ่าน **LINE Official Account (LINE Bot + LIFF)** โดยไม่ต้องติดตั้งแอปพลิเคชันเพิ่มเติม

---

## 🌟 คุณสมบัติหลัก (Key Features)

### 📱 ฝั่งลูกค้า (LINE LIFF Web App)
- **Rich Menu Integration 6 ช่อง**: เชื่อมต่อเมนู LINE 6 ปุ่ม (จองคิว, คิวของฉัน, บริการนวดสปา, เทอราพิส, โปรโมชั่น, ติดต่อร้าน)
- **Automatic LINE Login**: ระบุตัวตนลูกค้าผ่าน LINE User ID อัตโนมัติ ไม่ต้องสมัครสมาชิกใหม่
- **ระบบเลือกบริการสปา & เทอราพิส**: เลือกแพ็กเกจนวดสปาที่ต้องการ เลือกผู้ให้บริการ/หมอนวดประจำร้าน
- **ระบบเวลาคำนวณอัตโนมัติ**: แสดงเฉพาะช่วงเวลาที่ **ว่างจริง** โดยนำเวลาเปิด/ปิดร้าน วันทำงานเทอราพิส เวลาพัก และคิวที่มีอยู่แล้วมาคำนวณ
- **ระบบป้องกันคิวชน (Concurrency Locking)**: ใช้ PostgreSQL Lock & Stored Procedure `create_booking_atomic` ป้องกัน Race Condition และการจองทับซ้อน 100%
- **คิวนวดสปาของฉัน (My Queue)**: ดูสถานะคิว (รอรอยืนยัน, ยืนยันแล้ว, เสร็จสิ้น, ยกเลิก) พร้อมปุ่มเลื่อนนัดและยกเลิกคิว (ควบคุมด้วยกฎห้ามยกเลิกก่อนนัดน้อยกว่า X ชั่วโมง)
- **LINE Notification Alert**: ส่ง Flex Message ยืนยันการจองคิวสปาทาง LINE ทันที

### ⚙️ ฝั่งผู้ดูแลร้าน (Admin Dashboard)
- **ระบบยืนยันตัวตน**: Supabase Auth (Email & Password)
- **Dashboard Metrics สด**: แสดงคิววันนี้ คิวพรุ่งนี้ ยอดรวมคิว รายได้รวม (จากคิวที่เสร็จสิ้น) จำนวนลูกค้า จำนวนยกเลิก และ No-show จากข้อมูลจริงในฐานข้อมูล Supabase (ไม่มี Demo Data)
- **Appointments Management**: ค้นหา กรองตามสถานะ/เทอราพิส/วันที่ เปลี่ยนสถานะคิว (Confirmed, Completed, Cancelled, No-show)
- **Calendar View**: ผังตารางเวลานัดหมายแบบรายวัน (Day) และรายสัปดาห์ (Week) แยกตามเทอราพิส
- **Customer Management**: ประวัติการจอง ยอดใช้บริการ และสถานะการเชื่อม LINE ID
- **Staff/Therapist Management**: เพิ่ม/แก้ไขเทอราพิส กำหนดวันทำงาน 7 วัน เวลาพัก และกำหนดวันหยุดพิเศษเฉพาะวัน
- **Services Management**: เพิ่ม/แก้ไขรายการบริการนวดสปา อัตราค่าบริการ (บาท) และระยะเวลาทำ (นาที)
- **Settings**: ตั้งค่าชื่อร้านสปา เบอร์โทร ที่อยู่ Google Maps เวลาเปิด/ปิดร้าน ระยะเวลาจองล่วงหน้า และกฎขั้นต่ำก่อนยกเลิกคิว

---

## 🛠 เทคโนโลยีที่ใช้ (Tech Stack)

- **Frontend**: Next.js 14 (App Router), TypeScript, React 18, Tailwind CSS (Custom Spa Emerald & Gold Theme), Lucide Icons
- **Backend & Database**: Supabase PostgreSQL, `@supabase/supabase-js`, `@supabase/ssr`
- **LINE Integration**: `@line/bot-sdk`, `@line/liff`
- **Timezone**: `Asia/Bangkok` (คำนวณเวลาไทย)
- **Deployment**: Prepared for Vercel

---

## 🚀 ขั้นตอนการติดตั้งและการนำไปใช้งาน (Setup & Deployment)

### Step 1: Clone & Install Dependencies

```bash
cd "Masage Spa Booking"
npm install
```

---

### Step 2: Supabase Database Setup

1. สร้างโปรเจกต์ใหม่ใน [Supabase Dashboard](https://supabase.com)
2. ไปที่ **SQL Editor** ใน Supabase
3. คัดลอกโค้ด SQL จากไฟล์:
   `supabase/migrations/20260814000000_initial_schema.sql`
4. วางใน SQL Editor แล้วกด **RUN** เพื่อสร้างตาราง Indexes RLS Policies และ Stored Procedures
5. สร้างบัญชีผู้ใช้สำหรับ Admin:
   - ไปที่ **Authentication** > **Users** > **Add User** (กรอก Email & Password)
   - คัดลอก `User ID` (UUID) ที่สร้างขึ้น
   - ไปที่ SQL Editor แล้วรันคำสั่งผูกสิทธิ์ Admin:
     ```sql
     INSERT INTO public.admin_users (id, email, full_name)
     VALUES ('YOUR_AUTH_USER_ID', 'admin@spa.com', 'Spa Admin Manager');
     ```

---

### Step 3: Environment Variables Setup

คัดลอกไฟล์ `.env.example` เป็น `.env.local`:

```bash
cp .env.example .env.local
```

กรอกข้อมูลจริงใน `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LINE Developer Account
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret
NEXT_PUBLIC_LIFF_ID=your-liff-id

# App URL & Cron
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
CRON_SECRET=your-random-cron-secret
```

---

### Step 4: LINE Official Account & LIFF Setup

1. ไปที่ [LINE Developers Console](https://developers.line.me)
2. **Messaging API Channel**:
   - คัดลอก `Channel Access Token` และ `Channel Secret` มาใส่ใน `.env.local`
   - ตั้งค่า **Webhook URL**: `https://your-domain.vercel.app/api/line/webhook`
   - เปิดใช้งาน **Use webhook**
3. **LIFF (LINE Front-end Framework) Setup**:
   - สร้าง LIFF App ใหม่ภายใต้ Provider ของคุณ
   - ตั้งค่า **Endpoint URL**: `https://your-domain.vercel.app/liff`
   - คัดลอก **LIFF ID** มาใส่ใน `NEXT_PUBLIC_LIFF_ID`
4. **Rich Menu Setup**:
   - ใน LINE Official Account Manager สร้าง Rich Menu สำหรับหน้าแชต อัปโหลดภาพจาก `public/rich_menu.jpg`
   - ช่อง 1 **"จองคิว"**: ลิงก์ Action ไปยัง `https://liff.line.me/YOUR_LIFF_ID`
   - ช่อง 2 **"คิวของฉัน"**: ลิงก์ Action ไปยัง `https://liff.line.me/YOUR_LIFF_ID/my-queue`
   - ช่อง 3 **"บริการนวดสปา"**: พิมพ์ข้อความ `บริการ`
   - ช่อง 4 **"เทอราพิส"**: พิมพ์ข้อความ `เทอราพิส`
   - ช่อง 5 **"โปรโมชั่น"**: พิมพ์ข้อความ `โปรโมชั่น`
   - ช่อง 6 **"ติดต่อร้าน"**: พิมพ์ข้อความ `ติดต่อร้าน`

---

## 🧪 การทดสอบระบบ (Verification Checklist)

- [x] **Database Initialization**: ตรวจสอบว่าไม่มีข้อมูลตัวอย่าง (Demo Data) ในระบบ ฐานข้อมูลเริ่มต้นจะว่างเปล่าตามข้อกำหนด Production
- [x] **Concurrency Locking**: ตรวจสอบ stored procedure `create_booking_atomic` ด้วยการลองจองเวลาเดียวกันพร้อมกัน ระบบจะป้องกันคิวชน 100%
- [x] **LINE Reply Verification**: พิมพ์คำว่า "บริการ" ใน LINE OA ระบบจะตอบกลับด้วย Reply message จากฐานข้อมูล Supabase
- [x] **LIFF Flow**: เปิด LIFF -> เลือกบริการนวดสปา -> เลือกเทอราพิส -> เลือกวันที่ -> เลือกรอบเวลาที่ว่างจริง -> กรอกชื่อเบอร์โทร -> กดยืนยัน -> รับข้อความ Flex Message ทาง LINE
