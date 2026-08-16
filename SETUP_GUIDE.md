# 📖 คู่มือการตั้งค่าระบบจัดการคิวนวดสปา (Spa Booking Setup Guide)

คู่มือนี้สรุปขั้นตอนการตั้งค่าระบบจัดการคิวนวดสปา (Spa & Massage Queue Management System) อย่างเป็นขั้นตอน เพื่อให้คุณสามารถนำระบบไปติดตั้ง ใช้งานจริง และเชื่อมต่อกับ **LINE Official Account** ได้อย่างสมบูรณ์แบบครับ

---

## 📍 สารบัญ (Table of Contents)

1. [การตั้งค่าฐานข้อมูล Supabase (Database Setup)](#1-การตั้งค่าฐานข้อมูล-supabase)
2. [การตั้งค่า LINE Official Account & Messaging API](#2-การตั้งค่า-line-official-account--messaging-api)
3. [การตั้งค่า LIFF App (LINE Front-end Framework)](#3-การตั้งค่า-liff-app)
4. [ขนาดและคู่มือตั้งค่ารูปภาพ LINE Rich Message & Rich Menu](#4-ขนาดและคู่มือตั้งค่ารูปภาพ-line-rich-message--rich-menu)
5. [การตั้งค่า Environment Variables (.env.local)](#5-การตั้งค่า-environment-variables)
6. [การนำระบบขึ้นออนไลน์ (Vercel Deployment)](#6-การนำระบบขึ้นออนไลน์-vercel-deployment)
7. [การตั้งค่าและใช้งานใน Admin Dashboard](#7-การใช้งานระบบแอดมิน-admin-dashboard)

---

## 1. การตั้งค่าฐานข้อมูล Supabase

1. สมัครใช้งานและสร้างโปรเจกต์ใหม่ที่ [Supabase.com](https://supabase.com)
2. ไปที่เมนู **SQL Editor** ทางด้านซ้ายมือ
3. คัดลอกโค้ด SQL จากไฟล์ในโปรเจกต์:
   `supabase/migrations/20260814000000_initial_schema.sql`
4. วางลงใน SQL Editor แล้วกด **RUN** (เพื่อสร้างตาราง, Indexes, RLS Policies และ Stored Procedure ป้องกันคิวชน `create_booking_atomic`)
5. **สร้างบัญชี Admin**:
   - ไปที่ **Authentication** ➔ **Users** ➔ กด **Add User** (กรอก Email & Password ของผู้ดูแลร้าน)
   - คัดลอก `User ID` (UUID) ที่ Supabase เจนให้
   - กลับไปที่ **SQL Editor** แล้วรัน SQL ผูกสิทธิ์ Admin:
     ```sql
     INSERT INTO public.admin_users (id, email, full_name)
     VALUES ('ใส่_UUID_ที่คัดลอกมา', 'admin@spa.com', 'Spa Admin Manager');
     ```

---

## 2. การตั้งค่า LINE Official Account & Messaging API

1. เข้าไปที่ [LINE Developers Console](https://developers.line.me)
2. สร้าง **Provider** (เช่น ชื่อร้านสปาของคุณ)
3. สร้าง **Create a Messaging API channel**:
   - กรอกข้อมูลร้านสปา รูปโลโก้ และประเภทธุรกิจ
4. ไปที่แท็บ **Messaging API**:
   - เลื่อนลงล่างสุดตรง **Channel access token** กด **Issue** ➔ คัดลอกโทเค็นเก็บไว้ (`LINE_CHANNEL_ACCESS_TOKEN`)
5. ไปที่แท็บ **Basic settings**:
   - คัดลอก **Channel secret** เก็บไว้ (`LINE_CHANNEL_SECRET`)
6. ตั้งค่า **Webhook URL** (เมื่อนำเว็บขึ้น Vercel แล้ว):
   - กรอก URL: `https://your-domain.vercel.app/api/line/webhook`
   - กด **Verify** แล้วเปิดสวิตช์ **Use webhook** เป็น `ON`
   - ใน LINE Official Account Manager (LINE OA) ให้ปิด Auto-response messages เพื่อให้ระบบ Webhook ตอบคำถามอัตโนมัติแทน

---

## 3. การตั้งค่า LIFF App

1. ใน [LINE Developers Console](https://developers.line.me) ภายใต้ Provider เดียวกัน กด **Create a new channel** ➔ เลือก **LINE Login**
2. ไปที่แท็บ **LIFF** ➔ กด **Add**:
   - **LIFF app name**: จองคิวนวดสปา
   - **Size**: Compact หรือ Tall
   - **Endpoint URL**: `https://your-domain.vercel.app/liff` (URL เว็บไซต์ของคุณ)
   - **Scopes**: ติ๊กเลือก `profile`, `openid`
   - **Bot prompt**: เลือก `Aggressive` (เพื่อแนะนำให้เพิ่มเพื่อน LINE OA อัตโนมัติ)
3. เมื่อสร้างเสร็จแล้ว คัดลอก **LIFF ID** (เช่น `1234567890-AbCdEfGh`) เก็บไว้เพื่อนำไปใส่ในไฟล์ `.env.local` (`NEXT_PUBLIC_LIFF_ID`)

---

## 4. ขนาดและคู่มือตั้งค่ารูปภาพ LINE Rich Message & Rich Menu

ในระบบ LINE Official Account Manager มีฟีเจอร์รูปภาพ 2 รูปแบบหลักที่มีสเปกขนาดต่างกัน ดังนี้:

### 🖼️ รูปแบบที่ 1: LINE Rich Messages (ข้อความบรอดแคสต์/ข้อความตอบกลับ)
- **ขนาดรูปภาพที่ถูกต้อง**: **1040 × 1040 pixels** (อัตราส่วน 1:1)
- **ไฟล์รูปภาพในโปรเจกต์**: `public/rich_message_1040.jpg`

#### การตั้งค่า Action ช่อง A – F (สำหรับ Rich Messages แบบ 6 ช่อง):

| ช่องในเทมเพลต | เมนู | ประเภท Action | ข้อความ / ลิงก์ Action |
| :--- | :--- | :--- | :--- |
| **ช่อง A (บนซ้าย)** | 📅 **จองคิว** | ลิงก์ (Link) | `https://liff.line.me/YOUR_LIFF_ID` |
| **ช่อง B (บนกลาง)** | 📋 **คิวของฉัน** | ลิงก์ (Link) | `https://liff.line.me/YOUR_LIFF_ID/my-queue` |
| **ช่อง C (บนขวา)** | 💆‍♀️ **บริการนวดสปา** | ข้อความ (Text) | `บริการ` |
| **ช่อง D (ล่างซ้าย)** | 👩‍⚕️ **เทอราพิส** | ข้อความ (Text) | `เทอราพิส` |
| **ช่อง E (ล่างกลาง)** | 📍 **ติดต่อร้าน** | ข้อความ (Text) | `ติดต่อร้าน` |
| **ช่อง F (ล่างขวา)** | 🎁 **โปรโมชั่น** | ข้อความ (Text) | `โปรโมชั่น` |

---

### 📱 รูปแบบที่ 2: LINE Rich Menus (เมนูด้านล่างหน้าจอแชต)
- **ขนาดรูปภาพที่ถูกต้อง**: **2500 × 1686 pixels** (หรืออัตราส่วน 3:2)
- **ไฟล์รูปภาพในโปรเจกต์**: `public/rich_menu.jpg`

---

## 5. การตั้งค่า Environment Variables

คัดลอกไฟล์ `.env.example` เป็น `.env.local` แล้วกรอกค่าจริงดังนี้:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# LINE Developer Account
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret
NEXT_PUBLIC_LIFF_ID=your-liff-id-from-step-3

# Domain URL & Cron Secret
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
CRON_SECRET=my-super-secret-key-123
```

---

## 6. การนำระบบขึ้นออนไลน์ (Vercel Deployment)

1. Push โค้ดทั้งหมดขึ้น GitHub
2. เข้าสู่ระบบ [Vercel.com](https://vercel.com) ➔ กด **Add New Project** ➔ เลือก Repo ของคุณ
3. ในส่วน **Environment Variables** ให้ใส่ค่าทั้งหมดจากข้อ 5 เข้าไป
4. กด **Deploy**
5. **ตั้งค่าระบบแจ้งเตือนคิวอัตโนมัติ (Vercel Cron)**:
   - ระบบรองรับการส่งแจ้งเตือนลูกค้าล่วงหน้า 24 ชม. และ 1 ชม. ผ่านไฟล์ `vercel.json` ที่รันทุกๆ 1 ชั่วโมงโดยอัตโนมัติ

---

## 7. การใช้งานระบบแอดมิน (Admin Dashboard)

เข้าสู่ระบบจัดการร้านค้าได้ที่: `https://your-domain.vercel.app/admin`

1. **ตั้งค่าข้อมูลร้าน (Settings)**:
   - ไปที่เมนู **ตั้งค่าระบบและร้านสปา** ➔ กรอกชื่อร้านสปา เบอร์โทร ที่อยู่ เวลาเปิด/ปิดร้าน
   - **รับแจ้งเตือนเมื่อมีคิวใหม่**: พิมพ์คำว่า `myid` ส่งเข้าไปในแชต LINE Official ของร้าน คัดลอก ID ที่ได้รับ มาวางในช่อง **LINE Admin User ID** แล้วกดบันทึก
2. **จัดการเทอราพิส / หมอนวด (Staff)**:
   - ไปที่เมนู **การจัดการเทอราพิส** ➔ เพิ่มรายชื่อหมอนวด กำหนดวันทำงาน และวันหยุดพักร้อน
3. **จัดการบริการสปา (Services)**:
   - ไปที่เมนู **บริการนวดสปา & ราคา** ➔ เพิ่มรายการนวด เช่น นวดไทยโบราณ, นวดอโรม่าน้ำมัน, สปาขัดผิว พร้อมระบุราคาและระยะเวลา (นาที)
4. **จัดการคิวและปฏิทิน (Appointments & Calendar)**:
   - ดูรายการคิวสด เปลี่ยนสถานะคิว (ยืนยัน/เสร็จสิ้น/ยกเลิก) และดูผังตารางเวลารายวัน/สัปดาห์
