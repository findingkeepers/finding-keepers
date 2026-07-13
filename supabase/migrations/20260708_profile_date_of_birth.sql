-- Date of birth captured at registration for minimum-age enforcement.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_of_birth date;