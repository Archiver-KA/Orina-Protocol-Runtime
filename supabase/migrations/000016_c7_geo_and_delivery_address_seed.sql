-- ATP2 Batch C7 / geo hierarchy seed
-- Seed scope:
--   - country definitions for US, CA, GB, VN, JP, DE
--   - representative place hierarchies for QA and early product rollout

insert into public.geo_countries (
  code,
  iso3,
  name,
  native_name,
  phone_code,
  postal_code_label,
  postal_code_required,
  postal_code_pattern,
  address_schema,
  is_active,
  metadata
)
values
  (
    'US',
    'USA',
    'United States',
    null,
    '+1',
    'ZIP code',
    true,
    '^[0-9]{5}(-[0-9]{4})?$',
    '{"levels":[{"kind":"admin1","label":"State","required":true},{"kind":"admin2","label":"County","required":true},{"kind":"locality","label":"City","required":true}]}'::jsonb,
    true,
    '{"seed":"c7"}'::jsonb
  ),
  (
    'CA',
    'CAN',
    'Canada',
    null,
    '+1',
    'Postal code',
    true,
    '^[A-Za-z]\\d[A-Za-z][ -]?\\d[A-Za-z]\\d$',
    '{"levels":[{"kind":"admin1","label":"Province","required":true},{"kind":"locality","label":"City","required":true}]}'::jsonb,
    true,
    '{"seed":"c7"}'::jsonb
  ),
  (
    'GB',
    'GBR',
    'United Kingdom',
    null,
    '+44',
    'Postcode',
    true,
    '^[A-Za-z]{1,2}\\d[A-Za-z\\d]? ?\\d[A-Za-z]{2}$',
    '{"levels":[{"kind":"admin1","label":"Nation","required":true},{"kind":"locality","label":"Town / City","required":true}]}'::jsonb,
    true,
    '{"seed":"c7"}'::jsonb
  ),
  (
    'VN',
    'VNM',
    'Vietnam',
    'Viet Nam',
    '+84',
    'Postal code',
    true,
    '^[0-9]{5,6}$',
    '{"levels":[{"kind":"admin1","label":"Province / City","required":true},{"kind":"admin2","label":"District","required":true},{"kind":"admin3","label":"Ward","required":true}]}'::jsonb,
    true,
    '{"seed":"c7"}'::jsonb
  ),
  (
    'JP',
    'JPN',
    'Japan',
    '日本',
    '+81',
    'Postal code',
    true,
    '^\\d{3}-?\\d{4}$',
    '{"levels":[{"kind":"admin1","label":"Prefecture","required":true},{"kind":"locality","label":"City / Ward","required":true}]}'::jsonb,
    true,
    '{"seed":"c7"}'::jsonb
  ),
  (
    'DE',
    'DEU',
    'Germany',
    'Deutschland',
    '+49',
    'Postal code',
    true,
    '^\\d{5}$',
    '{"levels":[{"kind":"admin1","label":"State","required":true},{"kind":"locality","label":"City","required":true}]}'::jsonb,
    true,
    '{"seed":"c7"}'::jsonb
  )
on conflict (code) do update
set
  iso3 = excluded.iso3,
  name = excluded.name,
  native_name = excluded.native_name,
  phone_code = excluded.phone_code,
  postal_code_label = excluded.postal_code_label,
  postal_code_required = excluded.postal_code_required,
  postal_code_pattern = excluded.postal_code_pattern,
  address_schema = excluded.address_schema,
  is_active = excluded.is_active,
  metadata = excluded.metadata;

insert into public.geo_places (
  id,
  country_code,
  parent_id,
  depth,
  place_kind,
  code,
  name,
  name_ascii,
  label,
  is_selectable,
  sort_order,
  lat,
  lng,
  postal_code_pattern,
  metadata
)
values
  ('US-CA', 'US', null, 1, 'admin1', 'CA', 'California', 'California', null, true, 1, 36.778300, -119.417900, null, '{"seed":"c7"}'::jsonb),
  ('US-CA-SF-COUNTY', 'US', 'US-CA', 2, 'admin2', '075', 'San Francisco County', 'San Francisco County', null, true, 1, null, null, null, '{"seed":"c7"}'::jsonb),
  ('US-CA-SF', 'US', 'US-CA-SF-COUNTY', 3, 'locality', null, 'San Francisco', 'San Francisco', null, true, 1, 37.774900, -122.419400, null, '{"seed":"c7"}'::jsonb),
  ('US-CA-LA-COUNTY', 'US', 'US-CA', 2, 'admin2', '037', 'Los Angeles County', 'Los Angeles County', null, true, 2, null, null, null, '{"seed":"c7"}'::jsonb),
  ('US-CA-LA', 'US', 'US-CA-LA-COUNTY', 3, 'locality', null, 'Los Angeles', 'Los Angeles', null, true, 1, 34.052200, -118.243700, null, '{"seed":"c7"}'::jsonb),
  ('US-NY', 'US', null, 1, 'admin1', 'NY', 'New York', 'New York', null, true, 2, 43.299400, -74.217900, null, '{"seed":"c7"}'::jsonb),
  ('US-NY-NY-COUNTY', 'US', 'US-NY', 2, 'admin2', '061', 'New York County', 'New York County', null, true, 1, null, null, null, '{"seed":"c7"}'::jsonb),
  ('US-NY-NYC', 'US', 'US-NY-NY-COUNTY', 3, 'locality', null, 'New York', 'New York', null, true, 1, 40.712800, -74.006000, null, '{"seed":"c7"}'::jsonb),
  ('CA-ON', 'CA', null, 1, 'admin1', 'ON', 'Ontario', 'Ontario', null, true, 1, null, null, null, '{"seed":"c7"}'::jsonb),
  ('CA-ON-TORONTO', 'CA', 'CA-ON', 2, 'locality', null, 'Toronto', 'Toronto', null, true, 1, 43.653200, -79.383200, null, '{"seed":"c7"}'::jsonb),
  ('CA-ON-OTTAWA', 'CA', 'CA-ON', 2, 'locality', null, 'Ottawa', 'Ottawa', null, true, 2, 45.421500, -75.697200, null, '{"seed":"c7"}'::jsonb),
  ('CA-BC', 'CA', null, 1, 'admin1', 'BC', 'British Columbia', 'British Columbia', null, true, 2, null, null, null, '{"seed":"c7"}'::jsonb),
  ('CA-BC-VANCOUVER', 'CA', 'CA-BC', 2, 'locality', null, 'Vancouver', 'Vancouver', null, true, 1, 49.282700, -123.120700, null, '{"seed":"c7"}'::jsonb),
  ('CA-BC-VICTORIA', 'CA', 'CA-BC', 2, 'locality', null, 'Victoria', 'Victoria', null, true, 2, 48.428400, -123.365600, null, '{"seed":"c7"}'::jsonb),
  ('GB-ENG', 'GB', null, 1, 'admin1', 'ENG', 'England', 'England', null, true, 1, null, null, null, '{"seed":"c7"}'::jsonb),
  ('GB-ENG-LONDON', 'GB', 'GB-ENG', 2, 'locality', null, 'London', 'London', null, true, 1, 51.507200, -0.127600, null, '{"seed":"c7"}'::jsonb),
  ('GB-ENG-MANCHESTER', 'GB', 'GB-ENG', 2, 'locality', null, 'Manchester', 'Manchester', null, true, 2, 53.480800, -2.242600, null, '{"seed":"c7"}'::jsonb),
  ('GB-SCT', 'GB', null, 1, 'admin1', 'SCT', 'Scotland', 'Scotland', null, true, 2, null, null, null, '{"seed":"c7"}'::jsonb),
  ('GB-SCT-EDINBURGH', 'GB', 'GB-SCT', 2, 'locality', null, 'Edinburgh', 'Edinburgh', null, true, 1, 55.953300, -3.188300, null, '{"seed":"c7"}'::jsonb),
  ('GB-SCT-GLASGOW', 'GB', 'GB-SCT', 2, 'locality', null, 'Glasgow', 'Glasgow', null, true, 2, 55.864200, -4.251800, null, '{"seed":"c7"}'::jsonb),
  ('VN-HCM', 'VN', null, 1, 'admin1', 'SG', 'Ho Chi Minh City', 'Ho Chi Minh City', null, true, 1, 10.823100, 106.629700, null, '{"seed":"c7"}'::jsonb),
  ('VN-HCM-Q1', 'VN', 'VN-HCM', 2, 'admin2', 'Q1', 'District 1', 'District 1', null, true, 1, null, null, null, '{"seed":"c7"}'::jsonb),
  ('VN-HCM-Q1-BEN-NGHE', 'VN', 'VN-HCM-Q1', 3, 'admin3', null, 'Ben Nghe Ward', 'Ben Nghe Ward', null, true, 1, null, null, null, '{"seed":"c7"}'::jsonb),
  ('VN-HCM-Q1-BEN-THANH', 'VN', 'VN-HCM-Q1', 3, 'admin3', null, 'Ben Thanh Ward', 'Ben Thanh Ward', null, true, 2, null, null, null, '{"seed":"c7"}'::jsonb),
  ('VN-HCM-Q3', 'VN', 'VN-HCM', 2, 'admin2', 'Q3', 'District 3', 'District 3', null, true, 2, null, null, null, '{"seed":"c7"}'::jsonb),
  ('VN-HCM-Q3-VO-THI-SAU', 'VN', 'VN-HCM-Q3', 3, 'admin3', null, 'Vo Thi Sau Ward', 'Vo Thi Sau Ward', null, true, 1, null, null, null, '{"seed":"c7"}'::jsonb),
  ('VN-HN', 'VN', null, 1, 'admin1', 'HN', 'Ha Noi', 'Ha Noi', null, true, 2, 21.027800, 105.834200, null, '{"seed":"c7"}'::jsonb),
  ('VN-HN-HOAN-KIEM', 'VN', 'VN-HN', 2, 'admin2', null, 'Hoan Kiem District', 'Hoan Kiem District', null, true, 1, null, null, null, '{"seed":"c7"}'::jsonb),
  ('VN-HN-HOAN-KIEM-TRANG-TIEN', 'VN', 'VN-HN-HOAN-KIEM', 3, 'admin3', null, 'Trang Tien Ward', 'Trang Tien Ward', null, true, 1, null, null, null, '{"seed":"c7"}'::jsonb),
  ('VN-HN-BA-DINH', 'VN', 'VN-HN', 2, 'admin2', null, 'Ba Dinh District', 'Ba Dinh District', null, true, 2, null, null, null, '{"seed":"c7"}'::jsonb),
  ('VN-HN-BA-DINH-KIM-MA', 'VN', 'VN-HN-BA-DINH', 3, 'admin3', null, 'Kim Ma Ward', 'Kim Ma Ward', null, true, 1, null, null, null, '{"seed":"c7"}'::jsonb),
  ('JP-13', 'JP', null, 1, 'admin1', '13', 'Tokyo', 'Tokyo', null, true, 1, 35.676200, 139.650300, null, '{"seed":"c7"}'::jsonb),
  ('JP-13-SHIBUYA', 'JP', 'JP-13', 2, 'locality', null, 'Shibuya', 'Shibuya', null, true, 1, null, null, null, '{"seed":"c7"}'::jsonb),
  ('JP-13-CHIYODA', 'JP', 'JP-13', 2, 'locality', null, 'Chiyoda', 'Chiyoda', null, true, 2, null, null, null, '{"seed":"c7"}'::jsonb),
  ('JP-27', 'JP', null, 1, 'admin1', '27', 'Osaka', 'Osaka', null, true, 2, null, null, null, '{"seed":"c7"}'::jsonb),
  ('JP-27-OSAKA-CITY', 'JP', 'JP-27', 2, 'locality', null, 'Osaka', 'Osaka', null, true, 1, null, null, null, '{"seed":"c7"}'::jsonb),
  ('JP-27-SAKAI', 'JP', 'JP-27', 2, 'locality', null, 'Sakai', 'Sakai', null, true, 2, null, null, null, '{"seed":"c7"}'::jsonb),
  ('DE-BE', 'DE', null, 1, 'admin1', 'BE', 'Berlin', 'Berlin', null, true, 1, 52.520000, 13.405000, null, '{"seed":"c7"}'::jsonb),
  ('DE-BE-BERLIN', 'DE', 'DE-BE', 2, 'locality', null, 'Berlin', 'Berlin', null, true, 1, null, null, null, '{"seed":"c7"}'::jsonb),
  ('DE-BY', 'DE', null, 1, 'admin1', 'BY', 'Bavaria', 'Bavaria', null, true, 2, null, null, null, '{"seed":"c7"}'::jsonb),
  ('DE-BY-UPPER-BAVARIA', 'DE', 'DE-BY', 2, 'admin2', null, 'Upper Bavaria', 'Upper Bavaria', null, true, 1, null, null, null, '{"seed":"c7"}'::jsonb),
  ('DE-BY-MUNICH', 'DE', 'DE-BY', 2, 'locality', null, 'Munich', 'Munich', null, true, 1, 48.135100, 11.582000, null, '{"seed":"c7"}'::jsonb),
  ('DE-BY-MIDDLE-FRANCONIA', 'DE', 'DE-BY', 2, 'admin2', null, 'Middle Franconia', 'Middle Franconia', null, true, 2, null, null, null, '{"seed":"c7"}'::jsonb),
  ('DE-BY-NUREMBERG', 'DE', 'DE-BY', 2, 'locality', null, 'Nuremberg', 'Nuremberg', null, true, 2, 49.452100, 11.076700, null, '{"seed":"c7"}'::jsonb)
on conflict (id) do update
set
  country_code = excluded.country_code,
  parent_id = excluded.parent_id,
  depth = excluded.depth,
  place_kind = excluded.place_kind,
  code = excluded.code,
  name = excluded.name,
  name_ascii = excluded.name_ascii,
  label = excluded.label,
  is_selectable = excluded.is_selectable,
  sort_order = excluded.sort_order,
  lat = excluded.lat,
  lng = excluded.lng,
  postal_code_pattern = excluded.postal_code_pattern,
  metadata = excluded.metadata;

insert into public.geo_dataset_versions (
  dataset_key,
  dataset_version,
  metadata
)
values (
  'delivery_address_seed',
  'c7-initial-6-country-sample',
  '{"countries":["US","CA","GB","VN","JP","DE"]}'::jsonb
)
on conflict (dataset_key, dataset_version) do update
set
  metadata = excluded.metadata;
