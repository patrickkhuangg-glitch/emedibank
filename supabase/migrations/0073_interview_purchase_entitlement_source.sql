-- One-off Interview plans are purchases, not recurring subscriptions or manual comps.
alter type public.entitlement_source add value if not exists 'purchase';
