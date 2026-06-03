## Goal

Make `ahluwaliaaaryahi@gmail.com` a bank-worker administrator so it can access the `/admin` console, review applications, and override AI decisions.

## Current state

- The account already exists (signed up on June 3) and currently holds only the **customer** role.
- Admin accounts are controlled — there is no public admin signup. Promotion is done by inserting the `admin` role for this user.

## Change

1. Add an `admin` role row for this user in the `user_roles` table (the account keeps its existing `customer` role too, so it can use both the customer dashboard and the admin console).

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('d6330a0c-e4be-4dba-bd9f-fb5938e884ba', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

## After the change

- Sign in with `ahluwaliaaaryahi@gmail.com` and navigate to `/admin`.
- The route gate uses the `has_role()` security-definer function, so admin access will be granted immediately on next sign-in / page load.
- No code or UI changes are required — this is a data-only update.

## Note

If you'd prefer this email to be admin-only (no customer dashboard), I can instead remove the `customer` role in the same step. Let me know; otherwise it keeps both.
