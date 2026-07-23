-- Second path to a virtual tour: a landlord who owns a real 360 camera
-- (Ricoh Theta, Insta360, etc.) gets an already-stitched equirectangular
-- JPEG straight off the hardware — no external stitching app needed. This
-- column holds that uploaded image (stored in the existing public
-- 'listings' bucket, same as image_url), rendered in-app with our own
-- Photo Sphere Viewer. virtual_tour_url (Kuula/other embed link) remains
-- the path for landlords without a 360 camera. The two are mutually
-- exclusive per listing; the app prefers the self-hosted image when both
-- are somehow present.
alter table public.listings
  add column if not exists virtual_tour_image_url text;

comment on column public.listings.virtual_tour_image_url is 'Self-hosted equirectangular 360 photo (from a real 360 camera), rendered with Photo Sphere Viewer. Mutually exclusive with virtual_tour_url in practice.';
