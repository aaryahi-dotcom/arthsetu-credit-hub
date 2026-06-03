-- ===== ENUMS =====
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected', 'override_approved', 'override_rejected');

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  mobile TEXT,
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===== USER ROLES =====
CREATE TABLE public.user_roles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ===== has_role security definer =====
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ===== APPLICATIONS =====
CREATE TABLE public.applications (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- applicant details
  full_name TEXT NOT NULL,
  age INTEGER,
  occupation_type TEXT,
  purpose_of_credit TEXT,
  loan_amount_requested NUMERIC DEFAULT 0,
  monthly_net_income NUMERIC DEFAULT 0,
  annual_income NUMERIC DEFAULT 0,
  employment_tenure_months INTEGER DEFAULT 0,
  bank_balance NUMERIC DEFAULT 0,
  fixed_deposits NUMERIC DEFAULT 0,
  property_value NUMERIC DEFAULT 0,
  vehicle_value NUMERIC DEFAULT 0,
  gold_value NUMERIC DEFAULT 0,
  total_liabilities NUMERIC DEFAULT 0,
  total_emi_monthly NUMERIC DEFAULT 0,
  existing_loan_count INTEGER DEFAULT 0,
  credit_utilization_pct NUMERIC DEFAULT 0,
  missed_payments_12m INTEGER DEFAULT 0,
  loan_defaults_ever INTEGER DEFAULT 0,
  credit_enquiries_6m INTEGER DEFAULT 0,
  cibil_score INTEGER DEFAULT 0,
  tax_filing_years INTEGER DEFAULT 0,
  digital_footprint_score NUMERIC DEFAULT 50,
  -- computed
  arthsetu_score NUMERIC,
  score_band TEXT,
  default_probability NUMERIC,
  recommended_credit_limit NUMERIC,
  recommended_interest_rate NUMERIC,
  net_worth NUMERIC,
  factors JSONB DEFAULT '{}'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  model_version TEXT,
  -- review / decision
  status public.application_status NOT NULL DEFAULT 'pending',
  decision TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  -- override
  override_applied BOOLEAN NOT NULL DEFAULT false,
  override_admin_id UUID REFERENCES auth.users(id),
  override_reason TEXT,
  override_new_score NUMERIC,
  override_timestamp TIMESTAMPTZ,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- ===== AUDIT LOGS =====
CREATE TABLE public.audit_logs (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  actor_id UUID,
  actor_role TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  data_before JSONB,
  data_after JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES =====
-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- applications
CREATE POLICY "Customers can view own applications" ON public.applications
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all applications" ON public.applications
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers can create own applications" ON public.applications
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update applications" ON public.applications
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- audit_logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== NEW USER TRIGGER (profile + default customer role) =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, mobile)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data->>'mobile'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== updated_at trigger =====
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();