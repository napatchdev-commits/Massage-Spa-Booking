-- Supabase Migration: Spa & Massage Booking System
-- Timezone: Asia/Bangkok
-- Production ready schema without any demo/mock data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ADMIN USERS TABLE
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Bangkok', NOW())
);

-- 2. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_name TEXT NOT NULL DEFAULT 'Spa & Massage',
    logo_url TEXT,
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    google_maps_url TEXT DEFAULT '',
    open_time TIME NOT NULL DEFAULT '09:00:00',
    close_time TIME NOT NULL DEFAULT '22:00:00',
    min_cancel_hours INT NOT NULL DEFAULT 2,
    advance_booking_days INT NOT NULL DEFAULT 30,
    reminder_24h_active BOOLEAN NOT NULL DEFAULT true,
    reminder_1h_active BOOLEAN NOT NULL DEFAULT true,
    line_admin_user_id TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Bangkok', NOW())
);

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS line_admin_user_id TEXT DEFAULT '';

-- Initialize default single row in settings if empty
INSERT INTO public.settings (salon_name)
SELECT 'Spa & Massage'
WHERE NOT EXISTS (SELECT 1 FROM public.settings);

-- 3. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_user_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Bangkok', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Bangkok', NOW())
);

CREATE INDEX IF NOT EXISTS idx_customers_line_user_id ON public.customers(line_user_id);

-- 4. SERVICES TABLE
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Bangkok', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Bangkok', NOW())
);

-- 5. STAFF TABLE
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    nickname TEXT,
    phone TEXT,
    avatar_url TEXT,
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Bangkok', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Bangkok', NOW())
);

-- 6. STAFF SERVICES JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.staff_services (
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    PRIMARY KEY (staff_id, service_id)
);

-- 7. STAFF SCHEDULES TABLE (0=Sunday, 1=Monday, ..., 6=Saturday)
CREATE TABLE IF NOT EXISTS public.staff_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    work_start_time TIME NOT NULL DEFAULT '10:00:00',
    work_end_time TIME NOT NULL DEFAULT '19:00:00',
    is_working BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (staff_id, day_of_week)
);

-- 8. STAFF BREAKS TABLE
CREATE TABLE IF NOT EXISTS public.staff_breaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    break_start_time TIME NOT NULL DEFAULT '13:00:00',
    break_end_time TIME NOT NULL DEFAULT '14:00:00'
);

-- 9. STAFF HOLIDAYS TABLE
CREATE TABLE IF NOT EXISTS public.staff_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    holiday_date DATE NOT NULL,
    reason TEXT,
    UNIQUE (staff_id, holiday_date)
);

-- 10. APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_number TEXT NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')) DEFAULT 'pending',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Bangkok', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Bangkok', NOW())
);

CREATE INDEX IF NOT EXISTS idx_appointments_date_staff ON public.appointments(booking_date, staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON public.appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- 11. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('booking_created', 'booking_confirmed', 'booking_cancelled', 'booking_rescheduled', 'reminder_24h', 'reminder_1h', 'admin_notice')),
    sent_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Bangkok', NOW()),
    status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Bangkok', NOW())
);

-- UPDATE TIMESTAMP TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = TIMEZONE('Asia/Bangkok', NOW());
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_modtime BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE TRIGGER update_services_modtime BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE TRIGGER update_staff_modtime BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE TRIGGER update_appointments_modtime BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE TRIGGER update_settings_modtime BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();


-- ============================================================================
-- STORED PROCEDURE: CALCULATE AVAILABLE SLOTS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_available_time_slots(
    p_staff_id UUID,
    p_service_id UUID,
    p_booking_date DATE
)
RETURNS TABLE (slot_time TIME) AS $$
DECLARE
    v_dow INT;
    v_work_start TIME;
    v_work_end TIME;
    v_is_working BOOLEAN;
    v_duration INT;
    v_slot TIME;
    v_slot_end TIME;
    v_is_holiday BOOLEAN;
    v_has_break BOOLEAN;
    v_has_conflict BOOLEAN;
    v_default_open TIME;
    v_default_close TIME;
    v_current_date DATE;
    v_current_time TIME;
BEGIN
    -- Get current date and time in Asia/Bangkok
    v_current_date := (TIMEZONE('Asia/Bangkok', NOW()))::DATE;
    v_current_time := (TIMEZONE('Asia/Bangkok', NOW()))::TIME;

    -- Get day of week (0=Sun, 6=Sat)
    v_dow := EXTRACT(DOW FROM p_booking_date);

    -- Check if staff has holiday on this date
    SELECT EXISTS (
        SELECT 1 FROM public.staff_holidays 
        WHERE staff_id = p_staff_id AND holiday_date = p_booking_date
    ) INTO v_is_holiday;

    IF v_is_holiday THEN
        RETURN;
    END IF;

    -- Fetch default salon open/close times from settings
    SELECT open_time, close_time INTO v_default_open, v_default_close
    FROM public.settings
    LIMIT 1;

    IF v_default_open IS NULL THEN v_default_open := '10:00:00'::TIME; END IF;
    IF v_default_close IS NULL THEN v_default_close := '20:00:00'::TIME; END IF;

    -- Get staff schedule for this day of week
    SELECT is_working, work_start_time, work_end_time 
    INTO v_is_working, v_work_start, v_work_end
    FROM public.staff_schedules
    WHERE staff_id = p_staff_id AND day_of_week = v_dow;

    -- Default to working with salon operating hours if no specific schedule row exists
    IF v_is_working IS NULL THEN
        v_is_working := true;
        v_work_start := v_default_open;
        v_work_end := v_default_close;
    END IF;

    IF v_is_working IS NOT TRUE THEN
        RETURN;
    END IF;

    IF v_work_start IS NULL THEN v_work_start := v_default_open; END IF;
    IF v_work_end IS NULL THEN v_work_end := v_default_close; END IF;

    -- Get service duration
    SELECT duration_minutes INTO v_duration
    FROM public.services
    WHERE id = p_service_id AND status = true;

    IF v_duration IS NULL THEN
        RETURN;
    END IF;

    -- Loop from work_start_time in 30-min increments
    v_slot := v_work_start;
    WHILE v_slot + (v_duration || ' minutes')::INTERVAL <= v_work_end LOOP
        v_slot_end := v_slot + (v_duration || ' minutes')::INTERVAL;

        -- Filter past time slots if date is TODAY
        IF p_booking_date = v_current_date AND v_slot < (v_current_time + INTERVAL '15 minutes') THEN
            v_slot := v_slot + INTERVAL '30 minutes';
            CONTINUE;
        END IF;

        -- Check if slot overlaps with staff break
        SELECT EXISTS (
            SELECT 1 FROM public.staff_breaks
            WHERE staff_id = p_staff_id
              AND day_of_week = v_dow
              AND (v_slot < break_end_time AND v_slot_end > break_start_time)
        ) INTO v_has_break;

        -- Check if slot overlaps with existing non-cancelled appointment
        SELECT EXISTS (
            SELECT 1 FROM public.appointments
            WHERE staff_id = p_staff_id
              AND booking_date = p_booking_date
              AND status != 'cancelled'
              AND (v_slot < end_time AND v_slot_end > start_time)
        ) INTO v_has_conflict;

        IF NOT v_has_break AND NOT v_has_conflict THEN
            slot_time := v_slot;
            RETURN NEXT;
        END IF;

        v_slot := v_slot + INTERVAL '30 minutes';
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- STORED PROCEDURE: ATOMIC BOOKING CREATION (STRICT CONCURRENCY LOCKING)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
    p_line_user_id TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT,
    p_staff_id UUID,
    p_service_id UUID,
    p_booking_date DATE,
    p_start_time TIME,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_customer_id UUID;
    v_duration INT;
    v_price NUMERIC(10,2);
    v_service_name TEXT;
    v_end_time TIME;
    v_dow INT;
    v_is_working BOOLEAN;
    v_work_start TIME;
    v_work_end TIME;
    v_is_holiday BOOLEAN;
    v_conflict BOOLEAN;
    v_break_conflict BOOLEAN;
    v_seq_num INT;
    v_queue_num TEXT;
    v_appointment_id UUID;
BEGIN
    -- 1. Explicit Lock to prevent concurrency race condition per staff per date
    PERFORM pg_advisory_xact_lock(hashtext(p_staff_id::text || p_booking_date::text));

    -- 2. Upsert Customer
    INSERT INTO public.customers (line_user_id, name, phone, email)
    VALUES (p_line_user_id, p_customer_name, p_customer_phone, p_customer_email)
    ON CONFLICT (line_user_id) DO UPDATE 
    SET name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        email = COALESCE(EXCLUDED.email, customers.email),
        updated_at = TIMEZONE('Asia/Bangkok', NOW())
    RETURNING id INTO v_customer_id;

    -- 3. Get Service Details
    SELECT duration_minutes, price, name INTO v_duration, v_price, v_service_name
    FROM public.services
    WHERE id = p_service_id AND status = true;

    IF v_duration IS NULL THEN
        RAISE EXCEPTION 'SERVICE_NOT_FOUND_OR_INACTIVE';
    END IF;

    v_end_time := (p_start_time + (v_duration || ' minutes')::INTERVAL)::TIME;

    -- 4. Check Staff Holiday
    SELECT EXISTS (
        SELECT 1 FROM public.staff_holidays
        WHERE staff_id = p_staff_id AND holiday_date = p_booking_date
    ) INTO v_is_holiday;

    IF v_is_holiday THEN
        RAISE EXCEPTION 'STAFF_ON_HOLIDAY';
    END IF;

    -- 5. Check Staff Working Hours
    v_dow := EXTRACT(DOW FROM p_booking_date);
    SELECT is_working, work_start_time, work_end_time
    INTO v_is_working, v_work_start, v_work_end
    FROM public.staff_schedules
    WHERE staff_id = p_staff_id AND day_of_week = v_dow;

    -- Default to working 07:00-21:00 if no specific schedule row exists
    IF v_is_working IS NULL THEN
        v_is_working := true;
        v_work_start := '07:00:00'::TIME;
        v_work_end := '21:00:00'::TIME;
    END IF;

    IF v_work_start IS NULL THEN v_work_start := '07:00:00'::TIME; END IF;
    IF v_work_end IS NULL THEN v_work_end := '21:00:00'::TIME; END IF;

    IF v_is_working IS NOT TRUE OR p_start_time < v_work_start OR v_end_time > v_work_end THEN
        RAISE EXCEPTION 'OUTSIDE_WORKING_HOURS';
    END IF;

    -- 6. Check Staff Break Overlap
    SELECT EXISTS (
        SELECT 1 FROM public.staff_breaks
        WHERE staff_id = p_staff_id
          AND day_of_week = v_dow
          AND (p_start_time < break_end_time AND v_end_time > break_start_time)
    ) INTO v_break_conflict;

    IF v_break_conflict THEN
        RAISE EXCEPTION 'STAFF_BREAK_CONFLICT';
    END IF;

    -- 7. Check Existing Appointment Overlap
    SELECT EXISTS (
        SELECT 1 FROM public.appointments
        WHERE staff_id = p_staff_id
          AND booking_date = p_booking_date
          AND status != 'cancelled'
          AND (p_start_time < end_time AND v_end_time > start_time)
    ) INTO v_conflict;

    IF v_conflict THEN
        RAISE EXCEPTION 'TIME_SLOT_ALREADY_BOOKED';
    END IF;

    -- 8. Generate Queue Number (e.g. Q-20260814-001)
    SELECT COUNT(*) + 1 INTO v_seq_num
    FROM public.appointments
    WHERE booking_date = p_booking_date;

    v_queue_num := 'Q-' || TO_CHAR(p_booking_date, 'YYYYMMDD') || '-' || LPAD(v_seq_num::text, 3, '0');

    -- 9. Insert Appointment
    INSERT INTO public.appointments (
        queue_number,
        customer_id,
        staff_id,
        service_id,
        booking_date,
        start_time,
        end_time,
        duration_minutes,
        price,
        status,
        note
    ) VALUES (
        v_queue_num,
        v_customer_id,
        p_staff_id,
        p_service_id,
        p_booking_date,
        p_start_time,
        v_end_time,
        v_duration,
        v_price,
        'confirmed',
        p_note
    ) RETURNING id INTO v_appointment_id;

    RETURN jsonb_build_object(
        'success', true,
        'appointment_id', v_appointment_id,
        'queue_number', v_queue_num,
        'booking_date', p_booking_date,
        'start_time', p_start_time,
        'end_time', v_end_time,
        'price', v_price,
        'service_name', v_service_name,
        'customer_id', v_customer_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active services, staff, schedules, settings (for booking app)
CREATE POLICY "Public services read" ON public.services FOR SELECT USING (true);
CREATE POLICY "Public staff read" ON public.staff FOR SELECT USING (true);
CREATE POLICY "Public staff_services read" ON public.staff_services FOR SELECT USING (true);
CREATE POLICY "Public staff_schedules read" ON public.staff_schedules FOR SELECT USING (true);
CREATE POLICY "Public staff_breaks read" ON public.staff_breaks FOR SELECT USING (true);
CREATE POLICY "Public staff_holidays read" ON public.staff_holidays FOR SELECT USING (true);
CREATE POLICY "Public settings read" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Public appointments insert via RPC" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public appointments read" ON public.appointments FOR SELECT USING (true);
CREATE POLICY "Public customers insert/update" ON public.customers FOR ALL USING (true);

-- Authenticated Admin full access
CREATE POLICY "Admin full access services" ON public.services FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access staff" ON public.staff FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access staff_services" ON public.staff_services FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access staff_schedules" ON public.staff_schedules FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access staff_breaks" ON public.staff_breaks FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access staff_holidays" ON public.staff_holidays FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access settings" ON public.settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access appointments" ON public.appointments FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access customers" ON public.customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access notifications" ON public.notifications FOR ALL TO authenticated USING (true);
