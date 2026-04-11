-- ============================================================
-- 000061 - assets_catalog metadata normalization
-- ============================================================
-- Backfills sparse marketplace listing metadata and keeps future
-- assets_catalog writes normalized regardless of which backend writer
-- produced the row.
-- ============================================================

create or replace function public.asset_catalog_metadata_defaults_v1(asset public.assets_catalog)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  next_metadata jsonb := coalesce(asset.metadata, '{}'::jsonb);
  attrs jsonb := coalesce(asset.attributes, '{}'::jsonb);
  estimated_price jsonb := '{}'::jsonb;
  gallery_images jsonb := '[]'::jsonb;
  existing_images jsonb := '[]'::jsonb;
  seller_wallet text := null;
  seller_name text := null;
  seller_verified boolean := false;
  suggested_price numeric := null;
  listing_currency text := null;
  total_slots integer := null;
  default_blockchain text := null;
  default_network text := null;
  resolved_asset_token text := null;
  resolved_contract_address text := null;
  resolved_verified boolean := false;
  resolved_featured boolean := false;
  view_count bigint := 0;
  like_count bigint := 0;
  price_text text := null;
  usd_text text := null;
  seller_json jsonb := '{}'::jsonb;
  stats_json jsonb := '{}'::jsonb;
begin
  if jsonb_typeof(asset.gallery_images) = 'array' then
    gallery_images := asset.gallery_images;
  end if;

  if jsonb_typeof(next_metadata -> 'images') = 'array' then
    existing_images := next_metadata -> 'images';
  end if;

  if jsonb_typeof(attrs -> 'estimated_price') = 'object' then
    estimated_price := attrs -> 'estimated_price';
  end if;

  if asset.seller_user_id is not null then
    select
      nullif(trim(p.wallet_address), ''),
      coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), '')),
      coalesce(p.is_verified, false)
    into seller_wallet, seller_name, seller_verified
    from public.profiles p
    where p.id = asset.seller_user_id;
  end if;

  seller_wallet := coalesce(nullif(trim(next_metadata ->> 'seller_wallet'), ''), seller_wallet);
  seller_name := coalesce(nullif(trim(next_metadata #>> '{seller,ensName}'), ''), seller_name);
  seller_verified := coalesce(
    case
      when lower(coalesce(next_metadata #>> '{seller,verified}', '')) in ('true', 'false')
        then (next_metadata #>> '{seller,verified}')::boolean
      else null
    end,
    seller_verified,
    false
  );

  if coalesce(estimated_price ->> 'suggested', '') ~ '^-?[0-9]+(\.[0-9]+)?$' then
    suggested_price := (estimated_price ->> 'suggested')::numeric;
  elsif coalesce(estimated_price ->> 'min', '') ~ '^-?[0-9]+(\.[0-9]+)?$' then
    suggested_price := (estimated_price ->> 'min')::numeric;
  elsif coalesce(estimated_price ->> 'max', '') ~ '^-?[0-9]+(\.[0-9]+)?$' then
    suggested_price := (estimated_price ->> 'max')::numeric;
  end if;

  listing_currency := upper(
    coalesce(
      nullif(trim(next_metadata ->> 'currency'), ''),
      nullif(trim(estimated_price ->> 'currency'), '')
    )
  );
  if listing_currency = '' then
    listing_currency := null;
  end if;

  if coalesce(attrs ->> 'on_chain_total_amount', attrs ->> 'total_amount', '') ~ '^[0-9]+$' then
    total_slots := coalesce(
      nullif(attrs ->> 'on_chain_total_amount', '')::integer,
      nullif(attrs ->> 'total_amount', '')::integer
    );
  end if;

  case asset.chain_id
    when 97 then
      default_blockchain := 'BSC';
      default_network := 'testnet';
    when 56 then
      default_blockchain := 'BSC';
      default_network := 'mainnet';
    when 11155111 then
      default_blockchain := 'Ethereum';
      default_network := 'sepolia';
    when 1 then
      default_blockchain := 'Ethereum';
      default_network := 'mainnet';
    when 137 then
      default_blockchain := 'Polygon';
      default_network := 'mainnet';
    when 42161 then
      default_blockchain := 'Arbitrum';
      default_network := 'mainnet';
    when 8453 then
      default_blockchain := 'Base';
      default_network := 'mainnet';
    else
      default_blockchain := null;
      default_network := null;
  end case;

  resolved_verified := coalesce(
    case
      when lower(coalesce(next_metadata ->> 'verified', '')) in ('true', 'false')
        then (next_metadata ->> 'verified')::boolean
      else null
    end,
    false
  );

  resolved_featured := coalesce(
    case
      when lower(coalesce(next_metadata ->> 'featured', '')) in ('true', 'false')
        then (next_metadata ->> 'featured')::boolean
      else null
    end,
    false
  );

  if coalesce(next_metadata ->> 'views', '') ~ '^[0-9]+$' then
    view_count := (next_metadata ->> 'views')::bigint;
  end if;

  if coalesce(next_metadata ->> 'likes', '') ~ '^[0-9]+$' then
    like_count := (next_metadata ->> 'likes')::bigint;
  end if;

  if suggested_price is not null then
    price_text := trim(to_char(suggested_price, 'FM999999999999990.####'));
    if listing_currency is not null then
      price_text := price_text || ' ' || listing_currency;
      if listing_currency in ('USD', 'USDT', 'USDC') then
        usd_text := '$' || trim(to_char(suggested_price, 'FM999999999999990.####'));
      end if;
    end if;
  end if;

  resolved_asset_token := coalesce(
    nullif(trim(next_metadata ->> 'onchainAssetId'), ''),
    nullif(trim(next_metadata ->> 'assetId'), ''),
    nullif(trim(next_metadata ->> 'tokenId'), ''),
    nullif(trim(attrs ->> 'on_chain_asset_id'), ''),
    nullif(trim(asset.token_id), '')
  );

  resolved_contract_address := coalesce(
    nullif(trim(next_metadata ->> 'contractAddress'), ''),
    nullif(trim(asset.contract_address), '')
  );

  next_metadata := next_metadata || jsonb_strip_nulls(jsonb_build_object(
    'name', coalesce(nullif(trim(next_metadata ->> 'name'), ''), asset.title),
    'description', coalesce(nullif(trim(next_metadata ->> 'description'), ''), asset.description),
    'image', coalesce(nullif(trim(next_metadata ->> 'image'), ''), asset.cover_image_url),
    'category', coalesce(nullif(trim(next_metadata ->> 'category'), ''), asset.category),
    'subcategory', coalesce(nullif(trim(next_metadata ->> 'subcategory'), ''), asset.subcategory),
    'price', coalesce(nullif(trim(next_metadata ->> 'price'), ''), price_text),
    'priceUSD', coalesce(nullif(trim(next_metadata ->> 'priceUSD'), ''), usd_text),
    'currency', listing_currency,
    'blockchain', coalesce(nullif(trim(next_metadata ->> 'blockchain'), ''), default_blockchain),
    'network', coalesce(
      nullif(trim(next_metadata ->> 'network'), ''),
      nullif(trim(next_metadata ->> 'listing_network'), ''),
      default_network
    ),
    'seller_wallet', seller_wallet,
    'verified', resolved_verified,
    'featured', resolved_featured,
    'views', view_count,
    'likes', like_count,
    'createdAt', coalesce(nullif(trim(next_metadata ->> 'createdAt'), ''), asset.created_at::text),
    'updatedAt', coalesce(nullif(trim(next_metadata ->> 'updatedAt'), ''), asset.updated_at::text)
  ));

  if jsonb_array_length(gallery_images) > 0 and jsonb_array_length(existing_images) = 0 then
    next_metadata := jsonb_set(next_metadata, '{images}', gallery_images, true);
  end if;

  if resolved_asset_token is not null then
    if nullif(trim(next_metadata ->> 'onchainAssetId'), '') is null then
      next_metadata := jsonb_set(next_metadata, '{onchainAssetId}', to_jsonb(resolved_asset_token), true);
    end if;
    if nullif(trim(next_metadata ->> 'assetId'), '') is null then
      next_metadata := jsonb_set(next_metadata, '{assetId}', to_jsonb(resolved_asset_token), true);
    end if;
    if nullif(trim(next_metadata ->> 'tokenId'), '') is null then
      next_metadata := jsonb_set(next_metadata, '{tokenId}', to_jsonb(resolved_asset_token), true);
    end if;
  end if;

  if resolved_contract_address is not null and nullif(trim(next_metadata ->> 'contractAddress'), '') is null then
    next_metadata := jsonb_set(next_metadata, '{contractAddress}', to_jsonb(resolved_contract_address), true);
  end if;

  if not (next_metadata ? 'chainId') and asset.chain_id is not null then
    next_metadata := jsonb_set(next_metadata, '{chainId}', to_jsonb(asset.chain_id), true);
  end if;

  if total_slots is not null then
    if not (next_metadata ? 'availableSlots') then
      next_metadata := jsonb_set(next_metadata, '{availableSlots}', to_jsonb(total_slots), true);
    end if;
    if not (next_metadata ? 'totalSlots') then
      next_metadata := jsonb_set(next_metadata, '{totalSlots}', to_jsonb(total_slots), true);
    end if;
    if not (next_metadata ? 'minPurchaseSlots') and total_slots > 0 then
      next_metadata := jsonb_set(next_metadata, '{minPurchaseSlots}', to_jsonb(1), true);
    end if;
    if not (next_metadata ? 'maxPurchaseSlots') then
      next_metadata := jsonb_set(next_metadata, '{maxPurchaseSlots}', to_jsonb(total_slots), true);
    end if;
  end if;

  seller_json := case when jsonb_typeof(next_metadata -> 'seller') = 'object' then next_metadata -> 'seller' else '{}'::jsonb end;
  seller_json := seller_json || jsonb_strip_nulls(jsonb_build_object(
    'address', seller_wallet,
    'ensName', seller_name,
    'verified', seller_verified
  ));
  if seller_json <> '{}'::jsonb then
    next_metadata := jsonb_set(next_metadata, '{seller}', seller_json, true);
  end if;

  stats_json := case when jsonb_typeof(next_metadata -> 'listing_stats') = 'object' then next_metadata -> 'listing_stats' else '{}'::jsonb end;
  if not (stats_json ? 'views') then
    stats_json := stats_json || jsonb_build_object('views', view_count);
  end if;
  if not (stats_json ? 'likes') then
    stats_json := stats_json || jsonb_build_object('likes', like_count);
  end if;
  next_metadata := jsonb_set(next_metadata, '{listing_stats}', stats_json, true);

  return next_metadata;
end;
$$;

create or replace function public.assets_catalog_apply_metadata_defaults_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.metadata := public.asset_catalog_metadata_defaults_v1(new);
  new.metadata_version := greatest(coalesce(new.metadata_version, 1), 2);
  return new;
end;
$$;

drop trigger if exists trg_assets_catalog_apply_metadata_defaults_v1 on public.assets_catalog;
create trigger trg_assets_catalog_apply_metadata_defaults_v1
before insert or update of metadata, attributes, seller_user_id, contract_address, token_id, chain_id, title, description, cover_image_url, gallery_images, created_at, updated_at
on public.assets_catalog
for each row
execute function public.assets_catalog_apply_metadata_defaults_v1();

update public.assets_catalog as a
set metadata = public.asset_catalog_metadata_defaults_v1(a),
    metadata_version = greatest(coalesce(a.metadata_version, 1), 2)
where a.metadata is null
   or a.metadata = '{}'::jsonb
   or not (a.metadata ? 'seller_wallet')
   or not (a.metadata ? 'seller')
   or not (a.metadata ? 'views')
   or not (a.metadata ? 'likes')
   or not (a.metadata ? 'createdAt')
   or not (a.metadata ? 'updatedAt');